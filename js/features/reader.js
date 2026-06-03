








import { checkImageExists, sanitizeFirebasePath, createLazyElements } from '../utils/helpers.js';
import { CONFIG, LIMITS, TIMING, FILE_EXTENSIONS, TIME_MS } from '../constants.js';
import { Result } from '../utils/result.js';

const els = createLazyElements({
    container: 'reader-container',
    breadcrumb: 'nav-breadcrumb',
    prev: 'btn-prev-chapter',
    next: 'btn-next-chapter'
});

export function createReaderFeature(initialState = {}) {
    const state = {
        preloadTimeout: null,
        db: null,
        ...initialState
    };

    return {
        init({ db } = {}) {
            state.db = db || null;
        },

        async load(series, chapter, onClickSeries, onNavigateChapter) {
            if (!series || !chapter) {
                return Result.failure(new Error("Invalid series or chapter provided"));
            }

            try {
                
                this.renderBreadcrumb(series, chapter, onClickSeries);

                
                const chapters = series.chapters;
                const sortedCh = [...chapters].sort(new Intl.Collator(undefined, { numeric: true }).compare);
                const currentIndex = sortedCh.indexOf(chapter);

                if (currentIndex > 0) {
                    els.prev.onclick = () => onNavigateChapter(series.id, sortedCh[currentIndex - 1]);
                    els.prev.classList.remove('hidden');
                } else {
                    els.prev.classList.add('hidden');
                }

                if (currentIndex > -1 && currentIndex < sortedCh.length - 1) {
                    els.next.onclick = () => onNavigateChapter(series.id, sortedCh[currentIndex + 1]);
                    els.next.classList.remove('hidden');
                } else {
                    els.next.classList.add('hidden');
                }

                
                this.renderLoadingState(chapter);

                
                this.trackView(series.id, chapter);

                await this.renderImages(series, chapter);

                
                
                if (state.preloadTimeout) clearTimeout(state.preloadTimeout);

                state.preloadTimeout = setTimeout(() => {
                    const nextIdx = sortedCh.indexOf(chapter) + 1;
                    if (nextIdx < sortedCh.length) {
                        this.preloadNextChapter(series, sortedCh[nextIdx])
                            .catch(e => console.warn('[Preload] Background task error:', e));
                    }
                }, TIMING.PRELOAD_DELAY_MS);

                return Result.success();

            } catch (e) {
                console.error(e);
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-msg';
                const errorMessage = e instanceof Error ? e.message : String(e);
                errorMsg.textContent = `Failed to load chapter: ${errorMessage}`;
                els.container.replaceChildren(errorMsg);
                return Result.failure(e);
            }
        },

        renderBreadcrumb(series, chapter, onClickSeries) {
            const separatorOne = document.createElement('span');
            separatorOne.className = 'breadcrumb-sep';
            separatorOne.textContent = '›';

            const seriesLink = document.createElement('a');
            seriesLink.href = '#';
            seriesLink.className = 'breadcrumb-link';
            seriesLink.textContent = series.title;
            seriesLink.onclick = (event) => {
                event.preventDefault();
                onClickSeries(series.id);
            };

            const separatorTwo = document.createElement('span');
            separatorTwo.className = 'breadcrumb-sep';
            separatorTwo.textContent = '›';

            const currentChapter = document.createElement('span');
            currentChapter.className = 'breadcrumb-current';
            currentChapter.textContent = `Chapter ${chapter}`;

            els.breadcrumb.replaceChildren(separatorOne, seriesLink, separatorTwo, currentChapter);
        },

        renderLoadingState(chapter) {
            const loadingMsg = document.createElement('div');
            loadingMsg.className = 'loading-msg';

            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';

            loadingMsg.append(spinner, `Loading Chapter ${chapter}...`);
            els.container.replaceChildren(loadingMsg);
        },

        async renderImages(series, chapter) {
            const isArchived = series.chapter_roots && series.chapter_roots[chapter];
            const fragment = document.createDocumentFragment();
            let hasImages = false;

            for (let i = 1; i <= LIMITS.MAX_PAGES; i++) {
                const sources = await this.findPageImages(series.id, chapter, i, isArchived);

                if (sources.length === 0) break;

                sources.forEach(src => {
                    const img = document.createElement('img');
                    img.className = 'reader-img';
                    img.loading = 'lazy';
                    img.alt = `Page ${i}`;
                    img.src = src;

                    if (isArchived && !src.includes(CONFIG.BACKUP_URL)) {
                        
                        const encodedId = encodeURIComponent(series.id);
                        const encodedCh = encodeURIComponent(chapter);
                        const numPadded = i.toString().padStart(2, '0');
                        const backupSrc = `${CONFIG.BACKUP_URL}/${encodedId}/${encodedCh}/${numPadded}.webp`;

                        img.onerror = function () {
                            this.onerror = null;
                            this.src = backupSrc;
                        };
                    }
                    fragment.appendChild(img);
                });
                hasImages = true;
            }

            if (!hasImages) {
                const emptyState = document.createElement('div');
                emptyState.className = 'loading-msg';
                emptyState.textContent = 'No images found.';
                els.container.replaceChildren(emptyState);
                return;
            }

            els.container.replaceChildren(fragment);
        },

        async preloadNextChapter(series, chapter) {
            
            
            
            const isArchived = series.chapter_roots && series.chapter_roots[chapter];

            for (let i = 1; i <= LIMITS.MAX_PAGES; i++) {
                
                const sources = await this.findPageImages(series.id, chapter, i, isArchived);
                if (sources.length === 0) break;
            }
        },

        async findPageImages(id, ch, pageNum, isArchived) {
            const encodedId = encodeURIComponent(id);
            const encodedCh = encodeURIComponent(ch);
            const numPadded = pageNum.toString().padStart(2, '0');
            const numRaw = pageNum.toString();
            const ext = FILE_EXTENSIONS.WEBP;

            if (isArchived) {
                const urls = [
                    `${CONFIG.WORKER_URL}${encodedId}/${encodedCh}/${numPadded}${ext}`,
                    `${CONFIG.BACKUP_URL}/${encodedId}/${encodedCh}/${numPadded}${ext}`
                ];
                return this.findFirstExisting(urls);
            }

            
            const standardUrls = [
                `content/${encodedId}/${encodedCh}/${numPadded}${ext}`,
                `content/${encodedId}/${encodedCh}/${numRaw}${ext}`
            ];
            const found = await this.findFirstExisting(standardUrls);
            if (found.length > 0) return found;

            
            const parts = [];
            for (let partNum = 1; partNum <= 20; partNum++) {
                const suffix = `_part${partNum}`;
                const partUrls = [
                    `content/${encodedId}/${encodedCh}/${numPadded}${suffix}${ext}`,
                    `content/${encodedId}/${encodedCh}/${numRaw}${suffix}${ext}`
                ];
                const partFound = await this.findFirstExisting(partUrls);
                if (partFound.length > 0) {
                    parts.push(partFound[0]);
                } else {
                    break;
                }
            }
            return parts;
        },

        async findFirstExisting(urls) {
            for (const url of urls) {
                if (await checkImageExists(url)) return [url];
            }
            return [];
        },

        trackView(seriesId, chapterId) {
            if (!state.db) return;

            const safeSeries = sanitizeFirebasePath(seriesId);
            const safeChapter = sanitizeFirebasePath(chapterId);
            const storageKey = `viewed_${safeSeries}_${safeChapter}`;

            
            const lastView = localStorage.getItem(storageKey);
            const now = Date.now();
            const COOLDOWN = TIME_MS.DAY;

            if (lastView && (now - parseInt(lastView, 10)) < COOLDOWN) {
                return;
            }

            localStorage.setItem(storageKey, now.toString());

            
            const ref = state.db.ref(`views/${safeSeries}/${safeChapter}`);
            ref.transaction(current => (current || 0) + 1);
        },

        getState() {
            return { ...state };
        }
    };
}

export const Reader = createReaderFeature();
