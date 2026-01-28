
import { checkImageExists, sanitizeFirebasePath, createLazyElements } from '../utils/helpers.js';
import { CONFIG, LIMITS, TIMING } from '../constants.js';
import { Result } from '../utils/result.js';

const els = createLazyElements({
    container: 'reader-container',
    breadcrumb: 'nav-breadcrumb',
    prev: 'btn-prev-chapter',
    next: 'btn-next-chapter'
});

export const Reader = {
    preloadTimeout: null,

    async load(series, chapter, onClickSeries, onNavigateChapter) {
        if (!series || !chapter) {
            return Result.failure(new Error("Invalid series or chapter provided"));
        }

        try {
            
            els.breadcrumb.innerHTML = `
                <span class="breadcrumb-sep">›</span>
                <a href="#" class="breadcrumb-link">${series.title}</a>
                <span class="breadcrumb-sep">›</span>
                <span class="breadcrumb-current">Chapter ${chapter}</span>
            `;
            els.breadcrumb.querySelector('a').onclick = (e) => {
                e.preventDefault();
                onClickSeries(series.id);
            };

            
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

            
            els.container.innerHTML = `
                <div class="loading-msg">
                    <div class="loading-spinner"></div>
                    Loading Chapter ${chapter}...
                </div>
            `;

            
            this.trackView(series.id, chapter);

            await this.renderImages(series, chapter);

            
            
            if (this.preloadTimeout) clearTimeout(this.preloadTimeout);

            this.preloadTimeout = setTimeout(() => {
                const nextIdx = sortedCh.indexOf(chapter) + 1;
                if (nextIdx < sortedCh.length) {
                    this.preloadNextChapter(series, sortedCh[nextIdx])
                        .catch(e => console.warn('[Preload] Background task error:', e));
                }
            }, TIMING.PRELOAD_DELAY_MS);

            return Result.success();

        } catch (e) {
            console.error(e);
            els.container.innerHTML = `<div class="error-msg">Failed to load chapter: ${e.message}</div>`;
            return Result.failure(e);
        }
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

        els.container.innerHTML = '';
        if (!hasImages) {
            els.container.innerHTML = '<div class="loading-msg">No images found.</div>';
        } else {
            els.container.appendChild(fragment);
        }
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
        const ext = '.webp';

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
        
        
        
        
        

        if (typeof firebase === 'undefined') return;
        const db = firebase.database();

        const safeSeries = sanitizeFirebasePath(seriesId);
        const safeChapter = sanitizeFirebasePath(chapterId);
        const storageKey = `viewed_${safeSeries}_${safeChapter}`;

        
        const lastView = localStorage.getItem(storageKey);
        const now = Date.now();
        const COOLDOWN = 24 * 60 * 60 * 1000; 

        if (lastView && (now - parseInt(lastView)) < COOLDOWN) {
            
            return;
        }

        localStorage.setItem(storageKey, now.toString());

        
        const ref = db.ref(`views/${safeSeries}/${safeChapter}`);
        ref.transaction(current => (current || 0) + 1);
    }
};
