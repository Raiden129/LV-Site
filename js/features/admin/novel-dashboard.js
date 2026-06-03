





import { FILES, CONFIG } from '../../constants.js';
import { Result } from '../../utils/result.js';
import { getEl } from '../../utils/dom.js';
import { adminState, setNovelsCache } from './state.js';
import { createAdminSeriesListItem } from './list-primitives.js';
import { fetchJsonFileAtLatestCommit } from './content-utils.js';





export async function refreshNovelData() {
    const result = await fetchJsonFileAtLatestCommit(adminState.github, FILES.NOVELS_JSON, {
        allowNotFound: true,
        defaultValue: []
    });

    if (!result.ok) {
        console.warn('Failed to fetch novels from GitHub', result.error);
        return result;
    }

    setNovelsCache(result.value);
    return Result.success(result.value);
}




export async function loadNovelDashboard() {
    const result = await refreshNovelData();
    if (result.ok) {
        renderNovelList(adminState.novels);
        return Result.success({ success: true });
    }
    return result;
}





function renderNovelList(novels) {
    const container = getEl('novel-list');
    if (!container) return;

    if (!novels.length) {
        container.innerHTML = `
            <div class="empty-state">
                <svg class="icon-xl" style="opacity: 0.5; margin-bottom: 16px;">
                    <use href="#icon-library" />
                </svg>
                <p>No novels yet. Create your first novel!</p>
            </div>
        `;
        return;
    }

    container.textContent = '';
    novels.forEach((novel) => {
        container.appendChild(createNovelListItem(novel));
    });
}






function createNovelListItem(novel) {
    const chapterCount = novel.chapters?.length || 0;
    return createAdminSeriesListItem({
        title: novel.title,
        coverUrl: novel.cover ? `${CONFIG.MAIN_SITE_URL}/${novel.cover}` : '',
        metaText: `${chapterCount} Chapters`,
        action: 'openNovelDetailFromPayload',
        payload: { id: novel.id }
    });
}






export function filterNovels() {
    const query = getEl('search-novels')?.value.toLowerCase().trim() || '';

    if (!query) {
        renderNovelList(adminState.novels);
        return;
    }

    const filtered = adminState.novels.filter(novel =>
        novel.title.toLowerCase().includes(query)
    );

    renderNovelList(filtered);
}
