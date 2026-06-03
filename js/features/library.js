





import { Result } from '../utils/result.js';
import { Card } from '../components/cards.js';
import { naturalSort, sanitizeFirebasePath, formatViewCount, createLazyElements } from '../utils/helpers.js';
import { ICONS, STORAGE_KEYS, LIMITS, DOM_IDS } from '../constants.js';
import { fetchWithCache, fetchSeriesViews } from '../shared/library/library-helpers.js';

const els = createLazyElements({
    seriesList: 'series-list',
    seriesCount: 'series-count',
    chapterList: 'chapter-list',
    breadcrumb: 'nav-breadcrumb',
    title: 'series-title',
    chapterCount: 'chapter-count',
    sortBtn: 'btn-sort-chapters'
});

export function createLibraryFeature(initialState = {}) {
    const state = {
        library: {},
        currentSeriesId: null,
        chapterSortOrder: 'desc',
        db: null,
        currentSeriesViewData: {},
        lastOnClickChapter: null,
        ...initialState
    };

    return {
    bindUIActions(root = document) {
        root.addEventListener('click', (event) => {
            const sortTrigger = event.target.closest('#btn-sort-chapters, [data-action="toggle-chapter-sort"]');
            if (!sortTrigger) return;
            event.preventDefault();
            this.toggleSort();
        });
    },

    async init(firebaseDb) {
        state.db = firebaseDb;
        const result = await this.fetchLibrary();

        return result.match({
            success: (data) => {
                state.library = {};
                data.forEach(s => state.library[s.id] = s);
                return Result.success();
            },
            failure: (err) => Result.failure(err)
        });
    },

    



    async fetchLibrary() {
        const urls = ['/api/library', '/series.json'];
        const fetchWithFallback = async () => {
            for (const url of urls) {
                try {
                    const resp = await fetch(url);
                    if (resp.ok) return await resp.json();
                } catch (e) {
                    console.warn('Library source fetch failed:', e);
                }
            }
            throw new Error('All sources failed');
        };

        return fetchWithCache({
            networkFetch: fetchWithFallback,
            cacheKey: STORAGE_KEYS.LIBRARY_CACHE,
            unavailableMessage: 'Library unavailable',
            cacheErrorContext: 'Failed to cache library data'
        });
    },

    getSeries(id) {
        return state.library[id];
    },

    renderHome(onClickSeries) {
        const list = els.seriesList;
        list.innerHTML = "";

        const seriesKeys = Object.keys(state.library);

        if (seriesKeys.length === 0) {
            list.appendChild(Card.empty(ICONS.EMPTY_STATE, 'Your library is empty'));
            els.seriesCount.textContent = '';
            return;
        }

        els.seriesCount.textContent = `${seriesKeys.length} Series`;
        const fragment = document.createDocumentFragment();

        seriesKeys.forEach(key => {
            fragment.appendChild(Card.series(state.library[key], () => onClickSeries(state.library[key].id)));
        });

        list.appendChild(fragment);
    },

    renderChapters(seriesId, onClickChapter) {
        const series = state.library[seriesId];
        if (!series) throw new Error("Series not found");

        state.currentSeriesId = seriesId;
        state.lastOnClickChapter = onClickChapter;

        
        const separator = document.createElement('span');
        separator.className = 'breadcrumb-sep';
        separator.textContent = '›';

        const currentCrumb = document.createElement('span');
        currentCrumb.className = 'breadcrumb-current';
        currentCrumb.textContent = series.title;

        els.breadcrumb.replaceChildren(separator, currentCrumb);
        els.title.textContent = series.title;
        els.chapterCount.textContent = `${series.chapters.length} Chapters`;

        
        if (els.sortBtn) {
            els.sortBtn.innerHTML = `Sort ${ICONS.SORT}`;
        }

        
        if (state.db) {
            state.currentSeriesViewData = {};
            fetchSeriesViews(state.db, seriesId).then((result) => {
                result.match({
                    success: (data) => {
                        state.currentSeriesViewData = data;
                        this.updateViewCounts();
                    },
                    failure: (err) => console.warn('Failed to load view counts:', err)
                });
            });
        }

        this.renderSortedChaptersList(series, onClickChapter, 0);
    },

    renderSortedChaptersList(series, onClickChapter, startIndex = 0) {
        if (startIndex === 0) {
            els.chapterList.innerHTML = "";
        }

        if (!series.chapters?.length) {
            els.chapterList.appendChild(Card.empty(ICONS.EMPTY_STATE, 'Coming Soon', 'Chapters are being uploaded.'));
            return;
        }

        const chapters = [...series.chapters].sort(naturalSort);
        if (state.chapterSortOrder === 'desc') chapters.reverse();

        
        const endIndex = Math.min(startIndex + LIMITS.CHAPTERS_PER_PAGE, chapters.length);
        const batch = chapters.slice(startIndex, endIndex);

        const oldBtn = document.getElementById(DOM_IDS.LOAD_MORE_BTN);
        if (oldBtn) oldBtn.remove();

        const fragment = document.createDocumentFragment();
        batch.forEach(ch => {
            const safeCh = sanitizeFirebasePath(ch);
            const viewCount = state.currentSeriesViewData[safeCh] || 0;
            fragment.appendChild(Card.chapter(ch, series.id, viewCount, () => onClickChapter(series.id, ch)));
        });

        els.chapterList.appendChild(fragment);

        if (endIndex < chapters.length) {
            const remaining = chapters.length - endIndex;
            const nextCount = Math.min(LIMITS.CHAPTERS_PER_PAGE, remaining);

            const btn = document.createElement('button');
            btn.id = DOM_IDS.LOAD_MORE_BTN;
            btn.className = 'btn btn-secondary btn-load-more';
            btn.innerText = `Load Next ${nextCount} Chapters`;

            btn.onclick = () => {
                btn.innerText = "Loading...";
                btn.disabled = true;
                setTimeout(() => {
                    this.renderSortedChaptersList(series, onClickChapter, endIndex);
                }, 50);
            };

            els.chapterList.appendChild(btn);
        }
    },

    updateViewCounts() {
        document.querySelectorAll('.card-chapter').forEach(card => {
            const ch = card.dataset.chapter;
            if (ch) {
                const safeCh = sanitizeFirebasePath(ch);
                const count = state.currentSeriesViewData[safeCh] || 0;
                const el = card.querySelector('.view-count-text');
                if (el) el.innerText = formatViewCount(count);
            }
        });
    },

    toggleSort() {
        state.chapterSortOrder = state.chapterSortOrder === 'desc' ? 'asc' : 'desc';
        if (state.currentSeriesId && state.library[state.currentSeriesId] && state.lastOnClickChapter) {
            this.renderSortedChaptersList(state.library[state.currentSeriesId], state.lastOnClickChapter, 0);
        }
    },

    getState() {
        return { ...state };
    }
    };
}

export const Library = createLibraryFeature();
