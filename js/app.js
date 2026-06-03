




import { createLibraryFeature } from './features/library.js';
import { createNovelLibraryFeature } from './features/novel-library.js';
import { createReaderFeature } from './features/reader.js';
import { NovelReader } from './features/novel-reader/index.js';
import { Comments } from './features/comments.js';
import { Presence } from './features/presence.js';
import { STORAGE_KEYS, VIEW, TIMING, DOM_IDS, FIREBASE_CONFIG } from './constants.js';
import { getErrorMessage } from './utils/result.js';
import { initTheme, bindThemeActions } from './bootstrap/theme.js';
import { initFirebase } from './bootstrap/firebase.js';
import { initNavigation } from './bootstrap/navigation.js';

function initScrollButton() {
    const btn = document.getElementById(DOM_IDS.SCROLL_TOP_BTN);
    if (!btn) return;

    let timeout;
    window.addEventListener('scroll', () => {
        if (document.getElementById(VIEW.READER).classList.contains('hidden')) {
            btn.classList.add('hidden');
            return;
        }
        btn.classList.add('hidden-scroll');
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (window.scrollY > TIMING.SCROLL_THRESHOLD_PX) {
                btn.classList.remove('hidden');
                btn.classList.remove('hidden-scroll');
            } else {
                btn.classList.add('hidden');
            }
        }, TIMING.SCROLL_DEBOUNCE_MS);
    }, { passive: true });
}

export async function init() {
    const result = {
        ok: false,
        theme: null,
        firebase: null,
        library: null,
        novelLibrary: null,
        navigation: null,
        errors: []
    };

    const Library = createLibraryFeature();
    const NovelLibrary = createNovelLibraryFeature();
    const Reader = createReaderFeature();

    const themeResult = initTheme({
        storageKey: STORAGE_KEYS.THEME,
        onThemeChange: (theme) => Comments.updateTheme(theme)
    });
    result.theme = themeResult;

    bindThemeActions(themeResult.toggleTheme);
    Library.bindUIActions();
    NovelLibrary.bindUIActions();
    NovelReader.bindUIActions();
    Comments.bindUIActions();

    const firebaseResult = await initFirebase({
        config: FIREBASE_CONFIG,
        timing: {
            timeoutMs: TIMING.FIREBASE_TIMEOUT_MS,
            pollIntervalMs: TIMING.FIREBASE_POLL_INTERVAL_MS
        },
        onReady: (db) => Presence.init(db)
    });
    result.firebase = firebaseResult;

    if (!firebaseResult.ok) {
        console.warn('Firebase SDK not loaded in time, continuing without presence features.');
    }

    const db = firebaseResult.db;

    Reader.init({ db });

    const libResult = await Library.init(db);
    result.library = libResult;
    if (!libResult.ok) {
        const errorBox = document.getElementById(DOM_IDS.ERROR_BOX);
        errorBox.innerText = getErrorMessage(libResult.error, 'Failed to load library');
        errorBox.classList.remove('hidden');
        result.errors.push({ scope: 'library', error: libResult.error });
    }

    const novelLibResult = await NovelLibrary.init(db);
    result.novelLibrary = novelLibResult;
    if (!novelLibResult.ok) {
        result.errors.push({ scope: 'novel-library', error: novelLibResult.error });
    }

    NovelReader.init({
        trackView: (seriesId, chapterId) => Reader.trackView(seriesId, chapterId)
    });

    let navigationRef = null;

    result.navigation = initNavigation({
        home: () => {
            Presence.leaveRoom();
            NovelReader.cleanup();
            Library.renderHome((seriesId) => {
                navigationRef.viewMachine.send('OPEN_SERIES', { seriesId });
            });
            NovelLibrary.renderHome((novelId) => {
                navigationRef.viewMachine.send('OPEN_NOVEL', { novelId });
            });
        },
        novelSeries: (ctx) => {
            Presence.leaveRoom();
            NovelReader.cleanup();
            NovelLibrary.renderSeries(ctx.novelId, (novelId, chapterId) => {
                navigationRef.viewMachine.send('OPEN_CHAPTER', { novelId, chapterId });
            });
            Comments.load(VIEW.NOVEL_SERIES);
        },
        novelReader: (ctx) => {
            Presence.leaveRoom();
            NovelReader.load(
                NovelLibrary.getSeries(ctx.novelId),
                ctx.chapterId,
                (sid) => navigationRef.viewMachine.send('GO_SERIES', { novelId: sid }),
                (sid, ch) => navigationRef.viewMachine.send('OPEN_CHAPTER', { novelId: sid, chapterId: ch, noScroll: true, replaceUrl: true })
            );
        },
        chapters: (ctx) => {
            Presence.leaveRoom();
            NovelReader.cleanup();
            Library.renderChapters(ctx.seriesId, (seriesId, chapterId) => {
                navigationRef.viewMachine.send('OPEN_CHAPTER', { seriesId, chapterId });
            });
            Comments.load(VIEW.CHAPTERS);
        },
        reader: (ctx) => {
            Presence.enterRoom(ctx.seriesId, ctx.chapterId);
            NovelReader.cleanup();
            Reader.load(
                Library.getSeries(ctx.seriesId),
                ctx.chapterId,
                (sid) => navigationRef.viewMachine.send('GO_CHAPTERS', { seriesId: sid }),
                (sid, ch) => navigationRef.viewMachine.send('OPEN_CHAPTER', { seriesId: sid, chapterId: ch })
            );
            Comments.load(VIEW.READER);
        },
        cleanup: () => {
            Comments.clearAll();
        }
    });

    navigationRef = result.navigation;
    result.navigation.syncFromURL();

    initScrollButton();

    result.ok = result.errors.length === 0;
    return result;
}

document.addEventListener('DOMContentLoaded', () => {
    init().catch((err) => {
        console.error('Application init failed', err);
    });
});
