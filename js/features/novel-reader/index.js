









import { createLazyElements } from '../../utils/helpers.js';
import { createReaderState, findChapterMeta, getChapterAtOffset } from './state.js';
import { createReaderSettings } from './settings.js';
import { fetchChapterHtml, preloadChapter } from './io.js';
import { createReaderObservers } from './observers.js';
import { renderChapterToDOM, renderLoadError, setTrackChapterViewHandler, trackChapterView, updateBreadcrumbUI } from './render.js';

const els = createLazyElements({
    container: 'novel-reader-content',
    footer: 'novel-reader-footer',
    nextBtn: 'btn-novel-next',
    settingsPanel: 'reader-settings-panel',
    inputFontSize: 'input-font-size',
    inputLineHeight: 'input-line-height',
    valFontSize: 'setting-val-size',
    valLineHeight: 'setting-val-height',
    breadcrumb: 'nav-breadcrumb'
});

const state = createReaderState();
const settings = createReaderSettings(els);

function getPrevChapterId(currentId) {
    return getChapterAtOffset(state.currentNovel, currentId, -1);
}

function getNextChapterId(currentId) {
    return getChapterAtOffset(state.currentNovel, currentId, 1);
}

function getNextNextChapterId(currentId) {
    return getChapterAtOffset(state.currentNovel, currentId, 2);
}

function getPrevPrevChapterId(currentId) {
    return getChapterAtOffset(state.currentNovel, currentId, -2);
}

function onVisibleChapter(chapterId) {
    if (!chapterId || !state.currentNovel || state.currentChapterId === chapterId) {
        return;
    }

    state.currentChapterId = chapterId;
    updateBreadcrumbUI(els, state.currentNovel, state.goBackCallback, chapterId);

    if (state.onChapterChangeCallback) {
        state.onChapterChangeCallback(state.currentNovel.id, chapterId);
    }

    trackChapterView(state.currentNovel.id, chapterId, state.trackedViewIds);
}

function initIntersectionObserver() {
    if (state.observer) {
        state.observer.disconnect();
    }

    const observers = createReaderObservers({
        els,
        state,
        getPrevChapterId,
        loadChapter,
        onVisibleChapter
    });

    state.observer = observers.scrollObserver;
    state.urlObserver = observers.urlObserver;
}

async function preloadNearbyChapters(chapterId, position) {
    if (position !== 'append') return;

    const preloadIds = [getNextNextChapterId(chapterId), getPrevPrevChapterId(chapterId)];

    for (const targetChapterId of preloadIds) {
        if (!targetChapterId || state.loadedChapterIds.has(targetChapterId) || state.isLoading) {
            continue;
        }

        const chapterMeta = findChapterMeta(state.currentNovel, targetChapterId);
        if (!chapterMeta) continue;

        const preloadResult = await preloadChapter(state.currentNovel, chapterMeta, targetChapterId);
        if (!preloadResult.ok) {
            console.debug(`Preload failed for chapter ${targetChapterId}:`, preloadResult.error);
        }
    }
}

async function loadChapter(chapterId, isInitial = false, position = 'append') {
    if (state.isLoading || state.loadedChapterIds.has(chapterId)) {
        return;
    }

    state.isLoading = true;

    const chapterMeta = findChapterMeta(state.currentNovel, chapterId);
    if (!chapterMeta) {
        console.error(`Chapter ${chapterId} not found`);
        state.isLoading = false;
        return;
    }

    const chapterResult = await fetchChapterHtml(state.currentNovel, chapterMeta, chapterId);

    if (chapterResult.ok) {
        const { chapterNumber, htmlContent } = chapterResult.value;

        renderChapterToDOM({
            els,
            chapterNum: chapterNumber,
            htmlContent,
            position,
            getNextChapterId,
            observer: state.observer,
            urlObserver: state.urlObserver,
            onVisibleChapter
        });

        state.loadedChapterIds.add(chapterNumber);
    } else {
        console.error(chapterResult.error);
        const chapterNumber = typeof chapterMeta === 'object' ? chapterMeta.number : chapterMeta;
        renderLoadError(els, chapterNumber, position);
    }

    state.isLoading = false;

    await preloadNearbyChapters(chapterId, position);

    if (isInitial) {
        state.currentChapterId = chapterId;
    }
}

export const NovelReader = {
    bindUIActions(root = document) {
        root.addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-reader-action="toggle-settings"], #btn-novel-settings');
            if (!trigger) return;
            event.preventDefault();
            this.toggleSettings();
        });
    },

    init(options = {}) {
        settings.init();
        setTrackChapterViewHandler(options.trackView);
    },

    toggleSettings() {
        settings.toggleSettings();
    },

    updateFontSize(val) {
        settings.updateFontSize(val);
    },

    updateLineHeight(val) {
        settings.updateLineHeight(val);
    },

    setWidth(width) {
        settings.setWidth(width);
    },

    setFont(type) {
        settings.setFont(type);
    },

    setTheme(theme) {
        settings.setTheme(theme);
    },

    cleanup() {
        settings.cleanup();
    },

    async load(novel, startChapterId, onGoBack, onChapterChange) {
        settings.applySettings();
        if (!novel) return;

        if (state.currentNovel && state.currentNovel.id === novel.id) {
            state.onChapterChangeCallback = onChapterChange;
            state.goBackCallback = onGoBack;
            updateBreadcrumbUI(els, state.currentNovel, state.goBackCallback, startChapterId);

            if (!state.loadedChapterIds.has(startChapterId)) {
                await loadChapter(startChapterId, true);
            }
            return;
        }

        state.currentNovel = novel;
        state.currentChapterId = null;
        state.loadedChapterIds.clear();
        state.trackedViewIds.clear();
        state.onChapterChangeCallback = onChapterChange;
        state.goBackCallback = onGoBack;

        const topSentinel = document.createElement('div');
        topSentinel.className = 'scroll-sentinel-top';
        els.container.replaceChildren(topSentinel);
        els.nextBtn.classList.add('hidden');

        initIntersectionObserver();

        await loadChapter(startChapterId, true);
        updateBreadcrumbUI(els, state.currentNovel, state.goBackCallback, startChapterId);
        trackChapterView(novel.id, startChapterId, state.trackedViewIds);
    }
};

window.NovelReader = NovelReader;
