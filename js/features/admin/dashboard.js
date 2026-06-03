




import { FILES, LIMITS, CONFIG, ICONS } from '../../constants.js';
import { Result } from '../../utils/result.js';
import { getEl } from '../../utils/dom.js';
import { adminState, getGitHubClient, setSeriesCache } from './state.js';
import { refreshNovelData } from './novel-dashboard.js';
import { encodePath } from '../../utils/helpers.js';
import { createAdminSeriesListItem } from './list-primitives.js';
import { fetchJsonFileAtLatestCommit } from './content-utils.js';

export async function loadDashboard() {
    
    const seriesResult = await refreshSeriesData();
    const novelResult = await refreshNovelData();

    if (!seriesResult.ok && !novelResult.ok) return seriesResult;

    
    const seriesCount = adminState.series.length;
    const novelCount = adminState.novels?.length || 0;
    const seriesChapters = adminState.series.reduce((acc, s) => acc + (s.chapters?.length || 0), 0);
    const novelChapters = (adminState.novels || []).reduce((acc, n) => acc + (n.chapters?.length || 0), 0);
    const archived = adminState.series.reduce((acc, s) => acc + Object.keys(s.chapter_roots || {}).length, 0);

    const statSeries = getEl('stat-series');
    const statChapters = getEl('stat-chapters');
    if (statSeries) statSeries.textContent = String(seriesCount + novelCount);
    if (statChapters) statChapters.textContent = String(seriesChapters + novelChapters);

    const localCount = seriesChapters - archived;
    const localStat = getEl('stat-local');
    if (localStat) {
        localStat.textContent = `${localCount} / ${LIMITS.LOCAL_CAPACITY}`;
        localStat.style.color = localCount >= LIMITS.LOCAL_CAPACITY ? '#ef4444' : '';
    }

    
    const recentComics = adminState.series.slice(0, 2).map(s => ({
        type: 'comic',
        name: s.name,
        cover: s.cover,
        chapters: s.chapters?.length || 0
    }));
    const recentNovels = (adminState.novels || []).slice(0, 2).map(n => ({
        type: 'novel',
        id: n.id,
        name: n.title,
        cover: n.cover,
        chapters: n.chapters?.length || 0
    }));

    const recent = [...recentComics, ...recentNovels].slice(0, 4);

    const recentContainer = getEl('recent-series');
    if (recentContainer) {
        recentContainer.textContent = '';

        if (!recent.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No Series';
            recentContainer.appendChild(empty);
        } else {
            recent.forEach((item) => {
                recentContainer.appendChild(createRecentSeriesCardElement(item));
            });
        }
    }

    return Result.success();
}

function createRecentSeriesCardElement(item) {
    const article = document.createElement('article');
    article.className = 'card-series';
    article.dataset.adminAction = item.type === 'novel' ? 'openNovelDetailFromPayload' : 'openSeriesDetailFromPayload';
    article.dataset.adminPayload = JSON.stringify(item.type === 'novel' ? { id: item.id } : { name: item.name });

    const coverWrapper = document.createElement('div');
    coverWrapper.className = 'card-cover-wrapper';

    if (item.cover) {
        const img = document.createElement('img');
        img.className = 'card-cover';
        img.loading = 'lazy';
        img.src = `${CONFIG.MAIN_SITE_URL}/${encodePath(item.cover)}`;
        img.alt = item.name;
        coverWrapper.appendChild(img);
    } else {
        const cover = document.createElement('div');
        cover.className = 'card-cover';
        coverWrapper.appendChild(cover);
    }

    const overlay = document.createElement('div');
    overlay.className = 'card-cover-overlay';
    coverWrapper.appendChild(overlay);

    const info = document.createElement('div');
    info.className = 'card-info';

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = item.name;

    const meta = document.createElement('div');
    meta.className = 'card-meta';

    const chapterBadge = document.createElement('span');
    chapterBadge.className = 'chapter-badge';
    chapterBadge.insertAdjacentHTML('beforeend', ICONS.SERIES_BADGE);
    chapterBadge.appendChild(document.createTextNode(` ${item.chapters} Ch`));

    const typeBadge = document.createElement('span');
    typeBadge.className = `type-badge type-${item.type}`;
    typeBadge.textContent = item.type === 'novel' ? 'Novel' : 'Comic';

    meta.append(chapterBadge, typeBadge);
    info.append(title, meta);
    article.append(coverWrapper, info);

    return article;
}

export async function refreshSeriesData() {
    const github = getGitHubClient();
    if (!github) return Result.failure(new Error('GitHub client not initialized'));

    const result = await fetchJsonFileAtLatestCommit(github, FILES.MANGA_JSON, {
        allowNotFound: true,
        defaultValue: []
    });

    if (!result.ok) {
        console.warn('Could not refresh series data', result.error);
        setSeriesCache([]);
        return result;
    }

    const seriesData = result.value.map(entry => ({
        name: entry.id,
        cover: entry.cover,
        chapters: entry.chapters || [],
        chapter_roots: entry.chapter_roots || {}
    }));

    setSeriesCache(seriesData);
    return Result.success();
}

export function filterSeries() {
    const query = getEl('search-series')?.value.toLowerCase().trim() || '';
    const filtered = query
        ? adminState.series.filter(s => s.name.toLowerCase().includes(query))
        : adminState.series;

    const container = getEl('series-list');
    if (!container) return;

    container.textContent = '';
    if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'No Series Found';
        container.appendChild(empty);
        return;
    }

    filtered.forEach((series) => {
        container.appendChild(createSeriesListItem(series));
    });
}

function createSeriesListItem(series) {
    return createAdminSeriesListItem({
        title: series.name,
        coverUrl: series.cover ? `${CONFIG.MAIN_SITE_URL}/${encodePath(series.cover)}` : '',
        metaText: `${series.chapters.length} Chapters • ${Object.keys(series.chapter_roots || {}).length} Archived`,
        action: 'openSeriesDetailFromPayload',
        payload: { name: series.name }
    });
}
