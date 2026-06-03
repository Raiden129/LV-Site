





import { API, CONFIG, GITHUB, RETRY, HTTP_STATUS } from "../constants.js";
import { Result } from "../utils/result.js";
import { sleep } from "../utils/helpers.js";

export class GitHubAPI {
  constructor(token) {
    this.token = token;
    this.baseUrl = API.GIT_API_BASE;
    this.contentUrl = API.CONTENT_BASE;
  }

  get headers() {
    return {
      Authorization: `token ${this.token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };
  }

  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...this.headers, ...options.headers },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return Result.failure(
          new Error(error.message || `HTTP ${response.status}`),
        );
      }

      if (response.status === HTTP_STATUS.NO_CONTENT)
        return Result.success(null);

      const text = await response.text();
      if (!text) return Result.success(null);

      try {
        return Result.success(JSON.parse(text));
      } catch {
        return Result.success(text);
      }
    } catch (e) {
      return Result.failure(e);
    }
  }

  async getContents(path) {
    return this.request(`${this.contentUrl}/${path}`);
  }

  





  getRawUrl(path) {
    return `${GITHUB.RAW_BASE_URL}/${CONFIG.USERNAME}/${CONFIG.REPO}/${GITHUB.DEFAULT_BRANCH}/${path}`;
  }

  





  async fetchImageAsBlob(path) {
    if (!path) {
      return Result.failure(new Error("Path is required"));
    }

    try {
      const url = `${GITHUB.API_BASE_URL}/repos/${CONFIG.USERNAME}/${CONFIG.REPO}/contents/${path}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `token ${this.token}`,
          Accept: GITHUB.ACCEPT_RAW,
        },
      });

      if (!response.ok) {
        return Result.failure(new Error(`HTTP ${response.status}`));
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      return Result.success(blobUrl);
    } catch (e) {
      return Result.failure(e);
    }
  }

  async deleteFile(path, sha, message) {
    return this.request(`${this.contentUrl}/${path}`, {
      method: "DELETE",
      body: JSON.stringify({
        message: message || `Delete ${path}`,
        sha: sha,
      }),
    });
  }

  async createBlob(content, encoding = GITHUB.BLOB_ENCODING) {
    const result = await this.request(`${this.baseUrl}/blobs`, {
      method: "POST",
      body: JSON.stringify({ content, encoding }),
    });
    return result.map((data) => data.sha);
  }

  async getLatestCommit(ref = GITHUB.DEFAULT_REF) {
    const result = await this.request(`${this.baseUrl}/refs/${ref}`);
    return result.map((data) => data.object.sha);
  }

  async getTreeSha(commitSha) {
    const result = await this.request(`${this.baseUrl}/commits/${commitSha}`);
    return result.map((data) => data.tree.sha);
  }

  async createTree(baseTreeSha, items) {
    const result = await this.request(`${this.baseUrl}/trees`, {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: items,
      }),
    });
    return result.map((data) => data.sha);
  }

  async createCommit(message, treeSha, parentSha) {
    const result = await this.request(`${this.baseUrl}/commits`, {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: treeSha,
        parents: [parentSha],
      }),
    });
    return result.map((data) => data.sha);
  }

  async updateRef(commitSha, ref = GITHUB.DEFAULT_REF) {
    return this.request(`${this.baseUrl}/refs/${ref}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commitSha }),
    });
  }

  async dispatchWorkflow(filename, ref = GITHUB.DEFAULT_BRANCH, inputs = {}) {
    const url = `${GITHUB.API_BASE_URL}/repos/${CONFIG.USERNAME}/${CONFIG.REPO}/actions/workflows/${filename}/dispatches`;
    return this.request(url, {
      method: "POST",
      body: JSON.stringify({ ref, inputs }),
    });
  }

  async getWorkflowRuns(limit = RETRY.DEFAULT_ATTEMPTS) {
    const url = `${GITHUB.API_BASE_URL}/repos/${CONFIG.USERNAME}/${CONFIG.REPO}/actions/runs?per_page=${limit}`;
    return this.request(url);
  }

  









  async atomicCommit(message, treeItems, retries = RETRY.DEFAULT_ATTEMPTS) {
    if (!message || !treeItems || !Array.isArray(treeItems)) {
      return Result.failure(
        new Error("Invalid parameters: message and treeItems are required"),
      );
    }

    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      const unwrap = (res) => {
        if (!res.ok) throw res.error;
        return res.value;
      };

      try {
        const latestCommit = unwrap(await this.getLatestCommit());
        const baseTree = unwrap(await this.getTreeSha(latestCommit));
        const newTree = unwrap(await this.createTree(baseTree, treeItems));
        const newCommit = unwrap(
          await this.createCommit(message, newTree, latestCommit),
        );
        unwrap(await this.updateRef(newCommit));

        return Result.success({ success: true, commitSha: newCommit });
      } catch (e) {
        lastError = e;
        if (attempt === retries) break;
        await sleep(
          Math.pow(2, attempt) * RETRY.BACKOFF_BASE_MS +
            Math.random() * RETRY.BACKOFF_JITTER_MS,
        );
      }
    }

    return Result.failure(
      lastError || new Error("Atomic commit failed after retries"),
    );
  }
}
