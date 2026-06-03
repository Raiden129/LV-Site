import { API } from '../../constants.js';
import { Result, tryCatch } from '../../utils/result.js';

function parseBase64JsonContent(content) {
    const rawContent = atob(content || '');
    const decoded = decodeURIComponent(escape(rawContent));
    return JSON.parse(decoded);
}

function isNotFoundError(error) {
    const message = error?.message || '';
    return message.includes('404') || message.toLowerCase().includes('not found');
}





export async function fetchJsonFileAtLatestCommit(github, fileName, { allowNotFound = false, defaultValue = [] } = {}) {
    const fetchJson = async () => {
        const commitRes = await github.getLatestCommit();
        if (!commitRes.ok) throw commitRes.error;

        const ref = `?ref=${commitRes.value}`;
        const fileRes = await github.request(`${API.CONTENT_BASE}/${fileName}${ref}`);
        if (!fileRes.ok) throw fileRes.error;

        return parseBase64JsonContent(fileRes.value?.content);
    };

    const result = await tryCatch(fetchJson)();
    if (!result.ok) {
        if (allowNotFound && isNotFoundError(result.error)) {
            return Result.success(defaultValue);
        }
        return result;
    }

    return result;
}
