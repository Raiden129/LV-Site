
import { API, LIMITS, CONFIG, ICONS } from '../../constants.js';
import { Result } from '../../utils/result.js';
import { getEl } from '../../utils/dom.js'; 
import { adminState, setSeriesCache } from './state.js';
import { AdminSeriesCard, AdminSeriesListItem } from '../../components/cards.js';
import { Toast } from '../../components/toast.js';

export async function loadDashboard() {
    const result = await refreshSeriesData();

    if (!result.ok) return result;

    const stats = {
        series: adminState.series.length,
        chapters: adminState.series.reduce((acc, s) => acc + (s.chapters?.length || 0), 0),
        archived: adminState.series.reduce((acc, s) => acc + Object.keys(s.chapter_roots || {}).length, 0)
    };

    const statSeries = getEl('stat-series');
    const statChapters = getEl('stat-chapters');
    if (statSeries) statSeries.textContent = stats.series;
    if (statChapters) statChapters.textContent = stats.chapters;

    const localCount = stats.chapters - stats.archived;
    const localStat = getEl('stat-local');
    if (localStat) {
        localStat.textContent = `${localCount} / ${LIMITS.LOCAL_CAPACITY}`;
        localStat.style.color = localCount >= LIMITS.LOCAL_CAPACITY ? '#ef4444' : '';
    }

    const recent = adminState.series.slice(0, 4);
    const recentContainer = getEl('recent-series');
    if (recentContainer) {
        recentContainer.innerHTML = recent.length
            ? recent.map(s => AdminSeriesCard(s, CONFIG.MAIN_SITE_URL)).join('')
            : '<div class="empty-state">No Series</div>';
    }

    return Result.success();
}

export async function refreshSeriesData() {
    if (!adminState.github) return Result.failure(new Error("GitHub client not initialized"));

    const result = await adminState.github.request(`${API.CONTENT_BASE}/manga.json?t=${Date.now()}`, {
        headers: { 'Accept': 'application/vnd.github.v3.raw' }
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

    if (!filtered.length) {
        container.innerHTML = `<div class="empty-state">No Series Found</div>`;
        return;
    }
    container.innerHTML = filtered.map(s => AdminSeriesListItem(s, CONFIG.MAIN_SITE_URL)).join('');
}
