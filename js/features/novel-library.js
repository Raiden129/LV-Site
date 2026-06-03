





import { Result } from '../utils/result.js';
import { STORAGE_KEYS, FILES, ICONS } from '../constants.js';
import { Card } from '../components/cards.js';
import { createLazyElements, sanitizeFirebasePath, formatViewCount } from '../utils/helpers.js';
import { fetchWithCache, fetchSeriesViews, sortChapterNumbers } from '../shared/library/library-helpers.js';

const els = createLazyElements({
    novelList: 'novel-series-list',
    novelCount: 'novel-series-count',
    
    novelTitle: 'novel-title',
    novelAuthor: 'novel-author',
    novelChapterCount: 'novel-chapter-count',
    novelChapterList: 'novel-chapter-list',
    sortBtn: 'btn-sort-novel-chapters',
    breadcrumb: 'nav-breadcrumb'
});

export function createNovelLibraryFeature(initialState = {}) {
    const state = {
        novelLibrary: {},
        currentNovelId: null,
        chapterSortOrder: 'desc',
        lastOnClickChapter: null,
        db: null,
        currentNovelViewData: {},
        ...initialState
    };

    return {
        bindUIActions(root = document) {
            root.addEventListener('click', (event) => {
                const sortTrigger = event.target.closest('#btn-sort-novel-chapters, [data-action="toggle-novel-chapter-sort"]');
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
                    state.novelLibrary = {};
                    data.forEach(n => state.novelLibrary[n.id] = n);
                    return Result.success();
                },
                failure: (err) => Result.failure(err)
            });
        },

        



        async fetchLibrary() {
            const url = `/${FILES.NOVELS_JSON}`;

            const fetchNetwork = async () => {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error(`Failed to fetch ${url}`);
                return await resp.json();
            };

            return fetchWithCache({
                networkFetch: fetchNetwork,
                cacheKey: STORAGE_KEYS.NOVEL_LIBRARY_CACHE,
                unavailableMessage: 'Novel library unavailable',
                cacheErrorContext: 'Failed to cache novel library'
            });
        },

        getSeries(id) {
            return state.novelLibrary[id];
        },

        getAllSeries() {
            return Object.values(state.novelLibrary);
        },

        renderHome(onClickNovel) {
            const list = els.novelList;
            list.innerHTML = "";
            if (els.breadcrumb) els.breadcrumb.innerHTML = "";

            const novels = Object.values(state.novelLibrary);

            if (novels.length === 0) {
                list.appendChild(Card.empty(ICONS.EMPTY_STATE, 'No Novels Yet', 'Check back later.'));
                els.novelCount.textContent = '';
                return;
            }

            els.novelCount.textContent = `${novels.length} Series`;
            const fragment = document.createDocumentFragment();

            novels.forEach(novel => {
                fragment.appendChild(Card.novel(novel, () => onClickNovel(novel.id)));
            });

            list.appendChild(fragment);
        },

        




        renderSeries(novelId, onClickChapter) {
            const novel = state.novelLibrary[novelId];
            if (!novel) {
                console.error(`Novel not found: ${novelId}`);
                return;
            }
            state.currentNovelId = novelId;
            state.lastOnClickChapter = onClickChapter;

            
            els.novelTitle.textContent = novel.title;
            
            if (els.novelAuthor) els.novelAuthor.style.display = 'none'; 
            els.novelChapterCount.textContent = `${novel.chapters?.length || 0} Chapters`;
            if (els.breadcrumb) {
                const separator = document.createElement('span');
                separator.className = 'breadcrumb-sep';
                separator.textContent = '›';

                const currentCrumb = document.createElement('span');
                currentCrumb.className = 'breadcrumb-current';
                currentCrumb.textContent = novel.title;

                els.breadcrumb.replaceChildren(separator, currentCrumb);
            }

            
            if (els.sortBtn) {
                els.sortBtn.innerHTML = `Sort ${ICONS.SORT}`;
            }

            
            const list = els.novelChapterList;
            list.innerHTML = "";

            if (!novel.chapters || novel.chapters.length === 0) {
                list.appendChild(Card.empty(ICONS.EMPTY_STATE, 'No Chapters', 'Coming soon.'));
                return;
            }

            const chapters = sortChapterNumbers(novel.chapters, state.chapterSortOrder);

            if (state.db) {
                state.currentNovelViewData = {};
                fetchSeriesViews(state.db, novelId).then((result) => {
                    result.match({
                        success: (data) => {
                            state.currentNovelViewData = data;
                            this.updateViewCounts();
                        },
                        failure: (err) => {
                            console.warn('Failed to load novel view counts', err);
                        }
                    });
                });
            }

            const fragment = document.createDocumentFragment();
            chapters.forEach(ch => {
                const chNum = typeof ch === 'object' ? ch.number : ch;
                const safeCh = sanitizeFirebasePath(chNum);
                const viewCount = state.currentNovelViewData[safeCh] || 0;
                fragment.appendChild(Card.chapter(chNum, novel.id, viewCount, () => onClickChapter(novel.id, chNum)));
            });

            list.appendChild(fragment);
        },

        updateViewCounts() {
            const list = els.novelChapterList;
            if (!list) return;

            list.querySelectorAll('.card-chapter').forEach(card => {
                const ch = card.dataset.chapter;
                if (ch) {
                    const safeCh = sanitizeFirebasePath(ch);
                    const count = state.currentNovelViewData[safeCh] || 0;
                    const el = card.querySelector('.view-count-text');
                    if (el) el.textContent = formatViewCount(count);
                }
            });
        },

        toggleSort() {
            state.chapterSortOrder = state.chapterSortOrder === 'desc' ? 'asc' : 'desc';
            if (state.currentNovelId && state.novelLibrary[state.currentNovelId] && state.lastOnClickChapter) {
                this.renderSeries(state.currentNovelId, state.lastOnClickChapter);
            }
        },

        getState() {
            return { ...state };
        }
    };
}

export const NovelLibrary = createNovelLibraryFeature();
