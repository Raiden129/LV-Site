
import { API, CONFIG } from '../constants.js';
import { Result } from '../utils/result.js';
import { sleep } from '../utils/helpers.js';

export class GitHubAPI {
    constructor(token) {
        this.token = token;
        this.baseUrl = API.GIT_API_BASE;
        this.contentUrl = API.CONTENT_BASE;
    }

    get headers() {
        return {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
    }

    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: { ...this.headers, ...options.headers }
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                return Result.failure(new Error(error.message || `HTTP ${response.status}`));
            }

            if (response.status === 204) return Result.success(null);

            const data = await response.json();
            return Result.success(data);
        } catch (e) {
            return Result.failure(e);
        }
    }

    

    async getContents(path) {
        return this.request(`${this.contentUrl}/${path}`);
    }

    async deleteFile(path, sha, message) {
        return this.request(`${this.contentUrl}/${path}`, {
            method: 'DELETE',
            body: JSON.stringify({
                message: message || `Delete ${path}`,
                sha: sha
            })
        });
    }

    

    async createBlob(content, encoding = 'base64') {
        const result = await this.request(`${this.baseUrl}/blobs`, {
            method: 'POST',
            body: JSON.stringify({ content, encoding })
        });
        return result.map(data => data.sha);
    }

    async getLatestCommit(ref = 'heads/main') {
        const result = await this.request(`${this.baseUrl}/refs/${ref}`);
        return result.map(data => data.object.sha);
    }

    async getTreeSha(commitSha) {
        const result = await this.request(`${this.baseUrl}/commits/${commitSha}`);
        return result.map(data => data.tree.sha);
    }

    async createTree(baseTreeSha, items) {
        const result = await this.request(`${this.baseUrl}/trees`, {
            method: 'POST',
            body: JSON.stringify({
                base_tree: baseTreeSha,
                tree: items
            })
        });
        return result.map(data => data.sha);
    }

    async createCommit(message, treeSha, parentSha) {
        const result = await this.request(`${this.baseUrl}/commits`, {
            method: 'POST',
            body: JSON.stringify({
                message,
                tree: treeSha,
                parents: [parentSha]
            })
        });
        return result.map(data => data.sha);
    }

    async updateRef(commitSha, ref = 'heads/main') {
        return this.request(`${this.baseUrl}/refs/${ref}`, {
            method: 'PATCH',
            body: JSON.stringify({ sha: commitSha })
        });
    }

    

    async dispatchWorkflow(filename, ref = 'main', inputs = {}) {
        const url = `https://api.github.com/repos/${CONFIG.USERNAME}/${CONFIG.REPO}/actions/workflows/${filename}/dispatches`;
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify({ ref, inputs })
        });
    }

    async getWorkflowRuns(limit = 5) {
        const url = `https://api.github.com/repos/${CONFIG.USERNAME}/${CONFIG.REPO}/actions/runs?per_page=${limit}`;
        return this.request(url);
    }

    

    
    async atomicCommit(message, treeItems, retries = 5) {
        let lastError = null;
        for (let attempt = 1; attempt <= retries; attempt++) {

            const unwrap = (res) => { if (!res.ok) throw res.error; return res.value; };

            try {
                const latestCommit = unwrap(await this.getLatestCommit());
                const baseTree = unwrap(await this.getTreeSha(latestCommit));
                const newTree = unwrap(await this.createTree(baseTree, treeItems));
                const newCommit = unwrap(await this.createCommit(message, newTree, latestCommit));
                unwrap(await this.updateRef(newCommit));

                return Result.success({ success: true, commitSha: newCommit });

            } catch (e) {
                lastError = e;
                if (attempt === retries) break;
                
                await sleep(Math.pow(2, attempt) * 100 + Math.random() * 500);
            }
        }

        return Result.failure(lastError || new Error('Atomic commit failed after retries'));
    }
}
