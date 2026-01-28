
import { ViewMachine } from './state/viewMachine.js';
import { Library } from './features/library.js';
import { Reader } from './features/reader.js';
import { Comments } from './features/comments.js';
import { Presence } from './features/presence.js';
import { FIREBASE_CONFIG, STORAGE_KEYS, VIEW, TIMING, DOM_IDS, GISCUS_THEME } from './constants.js';
import { waitForGlobal } from './utils/helpers.js';


window.toggleChapterSort = () => Library.toggleSort();
window.toggleCommentHelp = () => {
    const visibleSection = document.querySelector('section:not(.hidden)');
    const panel = visibleSection?.querySelector('.comment-help-panel');
    if (panel) panel.classList.toggle('hidden');
};
window.copySpoiler = () => {
    if (navigator.clipboard) navigator.clipboard.writeText("<details><summary>Spoiler</summary>\n\nTYPE SPOILER HERE\n\n</details>");
};
window.copyToComment = (text) => {
    if (navigator.clipboard) navigator.clipboard.writeText(text);
};


async function init() {
    initTheme();

    
    let db = null;
    const isFirebaseReady = () => typeof firebase !== 'undefined' && firebase.database;
    const firebaseReady = await waitForGlobal(
        isFirebaseReady,
        TIMING.FIREBASE_TIMEOUT_MS,
        TIMING.FIREBASE_POLL_INTERVAL_MS
    );

    if (firebaseReady) {
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.database();
        Presence.init(db);
    } else {
        console.warn("Firebase SDK not loaded in time, continuing without presence features.");
    }

    
    const libResult = await Library.init(db);
    if (!libResult.ok) {
        const errorBox = document.getElementById(DOM_IDS.ERROR_BOX);
        errorBox.innerText = libResult.error;
        errorBox.classList.remove('hidden');
    }

    
    ViewMachine.init({
        home: () => {
            Presence.leaveRoom();
            Library.renderHome((seriesId) => {
                ViewMachine.send('OPEN_SERIES', { seriesId });
            });
        },
        chapters: (ctx) => {
            Presence.leaveRoom();
            Library.renderChapters(ctx.seriesId, (seriesId, chapterId) => {
                ViewMachine.send('OPEN_CHAPTER', { seriesId, chapterId });
            });
            Comments.load(VIEW.CHAPTERS);
        },
        reader: (ctx) => {
            Presence.enterRoom(ctx.seriesId, ctx.chapterId);
            Reader.load(
                Library.getSeries(ctx.seriesId),
                ctx.chapterId,
                (sid) => ViewMachine.send('GO_CHAPTERS', { seriesId: sid }),
                (sid, ch) => ViewMachine.send('OPEN_CHAPTER', { seriesId: sid, chapterId: ch })
            );
            Comments.load(VIEW.READER);
        },
        cleanup: () => {
            Comments.clearAll();
        }
    });

    ViewMachine.syncFromURL();
    initScrollButton();
}

function initTheme() {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME) || GISCUS_THEME.DARK;
    document.documentElement.setAttribute('data-theme', theme);
    window.toggleTheme = () => {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === GISCUS_THEME.DARK ? GISCUS_THEME.LIGHT : GISCUS_THEME.DARK;
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
        Comments.updateTheme(newTheme);
    };
}

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

document.addEventListener('DOMContentLoaded', init);

