
import { tryCatch, Result } from '../utils/result.js';
import { Card } from '../components/cards.js';
import { naturalSort, sanitizeFirebasePath, formatViewCount, createLazyElements } from '../utils/helpers.js';
import { ICONS, STORAGE_KEYS, LIMITS, DOM_IDS, FIREBASE_PATHS } from '../constants.js';

let library = {};
let currentSeriesId = null;
let chapterSortOrder = 'desc';
let db = null;
let currentSeriesViewData = {};
let lastOnClickChapter = null; 

const els = createLazyElements({
    seriesList: 'series-list',
    seriesCount: 'series-count',
    chapterList: 'chapter-list',
    breadcrumb: 'nav-breadcrumb',
    title: 'series-title',
    chapterCount: 'chapter-count',
    sortBtn: 'btn-sort-chapters'
});

export const Library = {
    async init(firebaseDb) {
        db = firebaseDb;
        const result = await this.fetchLibrary();

        return result.match({
            success: (data) => {
                data.forEach(s => library[s.id] = s);
                return Result.success();
            },
            failure: (err) => Result.failure(err)
        });
    },

    
    async fetchLibrary() {
        const urls = ['/api/library', '/manga.json'];
        const fetchWithFallback = async (urls) => {
            for (const url of urls) {
                try {
                    const resp = await fetch(url);
                    if (resp.ok) return await resp.json();
                } catch (e) { console.warn(e); }
            }
            throw new Error('All sources failed');
        };

        const networkResult = await tryCatch(fetchWithFallback)(urls);

        if (networkResult.ok) {
            try { localStorage.setItem(STORAGE_KEYS.LIBRARY_CACHE, JSON.stringify(networkResult.value)); } catch (e) { }
            return networkResult;
        }

        const cached = localStorage.getItem(STORAGE_KEYS.LIBRARY_CACHE);
        return cached
            ? Result.success(JSON.parse(cached))
            : Result.failure(new Error('Library unavailable'));
    },

    getSeries(id) {
        return library[id];
    },

    renderHome(onClickSeries) {
        const list = els.seriesList;
        list.innerHTML = "";

        const seriesKeys = Object.keys(library);

        if (seriesKeys.length === 0) {
            list.appendChild(Card.empty(ICONS.EMPTY_STATE, 'Your library is empty'));
            els.seriesCount.textContent = '';
            return;
        }

        els.seriesCount.textContent = `${seriesKeys.length} Series`;
        const fragment = document.createDocumentFragment();

        seriesKeys.forEach(key => {
            fragment.appendChild(Card.series(library[key], () => onClickSeries(library[key].id)));
        });

        list.appendChild(fragment);
    },

    renderChapters(seriesId, onClickChapter) {
        const series = library[seriesId];
        if (!series) throw new Error("Series not found");

        currentSeriesId = seriesId;
        lastOnClickChapter = onClickChapter; 

        
        els.breadcrumb.innerHTML = `<span class="breadcrumb-sep">›</span><span class="breadcrumb-current">${series.title}</span>`;
        els.title.innerText = series.title;
        els.chapterCount.textContent = `${series.chapters.length} Chapters`;

        
        if (els.sortBtn) {
            els.sortBtn.innerHTML = `Sort ${ICONS.SORT}`;
        }

        
        if (db) {
            currentSeriesViewData = {};
            const safePath = sanitizeFirebasePath(seriesId);

            
            (async () => {
                const fetchViews = tryCatch(async () => {
                    const snap = await db.ref(`${FIREBASE_PATHS.VIEWS}/${safePath}`).once('value');
                    return snap.val();
                });

                const result = await fetchViews();
                result.match({
                    success: (data) => {
                        currentSeriesViewData = data || {};
                        this.updateViewCounts();
                    },
                    failure: (err) => console.warn('Failed to load view counts:', err)
                });
            })();
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
        if (chapterSortOrder === 'desc') chapters.reverse();

        
        const endIndex = Math.min(startIndex + LIMITS.CHAPTERS_PER_PAGE, chapters.length);
        const batch = chapters.slice(startIndex, endIndex);

        const oldBtn = document.getElementById(DOM_IDS.LOAD_MORE_BTN);
        if (oldBtn) oldBtn.remove();

        const fragment = document.createDocumentFragment();
        batch.forEach(ch => {
            const safeCh = sanitizeFirebasePath(ch);
            const viewCount = currentSeriesViewData[safeCh] || 0;
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
                const count = currentSeriesViewData[safeCh] || 0;
                const el = card.querySelector('.view-count-text');
                if (el) el.innerText = formatViewCount(count);
            }
        });
    },

    toggleSort() {
        chapterSortOrder = chapterSortOrder === 'desc' ? 'asc' : 'desc';
        if (currentSeriesId && library[currentSeriesId] && lastOnClickChapter) {
            this.renderSortedChaptersList(library[currentSeriesId], lastOnClickChapter, 0);
        }
    }
};
