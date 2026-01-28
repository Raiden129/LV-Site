
import { FIREBASE_PATHS, TIMING, DOM_IDS } from '../constants.js';

let db = null;
let isInChapter = false;
let currentChapterRef = null;
let currentChapterPresence = null;
let globalCount = 0;
let chapterCount = 0;

export const Presence = {
    pollingInterval: null,

    init(firebaseDb) {
        db = firebaseDb;
        if (!db) return;

        const presenceRef = db.ref(FIREBASE_PATHS.STATUS_CONNECTIONS);
        const connectedRef = db.ref(FIREBASE_PATHS.INFO_CONNECTED);

        connectedRef.on('value', (snap) => {
            if (snap.val() === true) {
                const con = presenceRef.push();
                con.onDisconnect().remove();
                con.set(true);

                if (isInChapter && currentChapterPresence) {
                    currentChapterPresence.onDisconnect().remove();
                    currentChapterPresence.set(true);
                }
            }
        });

        this.updateCounts();
        this.pollingInterval = setInterval(() => this.updateCounts(), TIMING.PRESENCE_POLL_INTERVAL_MS);
    },

    async updateCounts() {
        if (!db) return;

        try {
            if (isInChapter && currentChapterRef) {
                const snap = await currentChapterRef.once('value');
                chapterCount = snap.numChildren();
            } else {
                const presenceRef = db.ref(FIREBASE_PATHS.STATUS_CONNECTIONS);
                const snap = await presenceRef.once('value');
                globalCount = snap.numChildren();
            }
            this.refreshDisplay();
        } catch (e) {
            console.warn("Connection count poll failed:", e);
        }
    },

    enterRoom(series, chapter) {
        if (!db) return;
        this.leaveRoom();

        isInChapter = true;
        const safeId = `${series}_${chapter}`.replace(/[.#$\[\]]/g, '_');
        const roomPath = `${FIREBASE_PATHS.STATUS_VIEWING}/${safeId}`;

        currentChapterRef = db.ref(roomPath);
        currentChapterPresence = currentChapterRef.push();
        currentChapterPresence.onDisconnect().remove();
        currentChapterPresence.set(true);

        this.updateCounts();
    },

    leaveRoom() {
        if (!db) return;
        isInChapter = false;
        chapterCount = 0;

        if (currentChapterPresence) {
            currentChapterPresence.remove();
            currentChapterPresence = null;
        }

        if (currentChapterRef) {
            currentChapterRef = null;
        }

        this.updateCounts();
    },

    refreshDisplay() {
        const elText = document.getElementById(DOM_IDS.LIVE_COUNT);
        if (!elText) return;

        let count = globalCount;
        let label = "Online";

        if (isInChapter) {
            count = chapterCount > 0 ? chapterCount : 1;
            label = "Reading";
        }

        elText.textContent = `${count} ${label}`;
    }
};
