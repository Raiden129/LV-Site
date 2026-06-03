





import { FIREBASE_PATHS, TIMING, DOM_IDS, PRESENCE_LABELS } from '../constants.js';

let db = null;
let isInChapter = false;
let currentRoomId = null;
let currentChapterRef = null;
let connectionId = null;
let globalConnectionRef = null;
let globalCount = 0;
let chapterCount = 0;

const state = {
    connected: false,
    heartbeatInterval: null,
    globalCountRef: null,
    chapterCountRef: null,
    pendingRoomTimer: null
};

function getServerTimestamp() {
    if (typeof firebase !== 'undefined' && firebase?.database?.ServerValue?.TIMESTAMP) {
        return firebase.database.ServerValue.TIMESTAMP;
    }
    return Date.now();
}

function buildPresencePayload(roomId = null) {
    return {
        connectedAt: getServerTimestamp(),
        lastSeen: getServerTimestamp(),
        roomId
    };
}

function setConnectionPayload(ref, roomId = null) {
    if (!ref) return;

    ref.onDisconnect().remove();
    ref.set(buildPresencePayload(roomId));
}

function updateHeartbeat() {
    if (!state.connected || !globalConnectionRef) return;

    const updates = { lastSeen: getServerTimestamp() };
    globalConnectionRef.update(updates);

    if (isInChapter && currentChapterRef) {
        currentChapterRef.update(updates);
    }
}

function startHeartbeat() {
    stopHeartbeat();
    state.heartbeatInterval = setInterval(updateHeartbeat, TIMING.PRESENCE_HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
    if (!state.heartbeatInterval) return;
    clearInterval(state.heartbeatInterval);
    state.heartbeatInterval = null;
}

function ensureGlobalConnection() {
    if (!db) {
        console.warn('[Presence] No database instance');
        return;
    }

    if (globalConnectionRef) {
        globalConnectionRef.remove();
    }

    connectionId = db.ref(FIREBASE_PATHS.STATUS_CONNECTIONS).push().key;

    globalConnectionRef = db.ref(`${FIREBASE_PATHS.STATUS_CONNECTIONS}/${connectionId}`);
    setConnectionPayload(globalConnectionRef, currentRoomId);

    if (isInChapter && currentRoomId) {
        Presence.joinRoom(currentRoomId);
    }

    startHeartbeat();
}

function clearRoomDebounce() {
    if (!state.pendingRoomTimer) return;
    clearTimeout(state.pendingRoomTimer);
    state.pendingRoomTimer = null;
}

export const Presence = {
    init(firebaseDb) {
        db = firebaseDb;
        if (!db) return;

        state.globalCountRef = db.ref(FIREBASE_PATHS.STATUS_CONNECTIONS);
        state.globalCountRef.on('child_added', () => {
            globalCount++;
            this.refreshDisplay();
        });
        state.globalCountRef.on('child_removed', () => {
            globalCount = Math.max(0, globalCount - 1);
            this.refreshDisplay();
        });

        const connectedRef = db.ref(FIREBASE_PATHS.INFO_CONNECTED);
        connectedRef.on('value', (snap) => {
            const isConnectedNow = snap.val() === true;
            state.connected = isConnectedNow;

            if (isConnectedNow) {
                ensureGlobalConnection();
            } else {
                stopHeartbeat();
            }
        });

        this.refreshDisplay();
    },

    joinRoom(roomId) {
        if (!db || !roomId) return;

        if (currentChapterRef) {
            currentChapterRef.remove();
        }

        currentChapterRef = db.ref(`${FIREBASE_PATHS.STATUS_VIEWING}/${roomId}/${connectionId}`);
        setConnectionPayload(currentChapterRef, roomId);

        if (globalConnectionRef) {
            globalConnectionRef.update({ roomId, lastSeen: getServerTimestamp() });
        }
    },

    attachRoomCountListener(roomId) {
        if (!db || !roomId) return;

        if (state.chapterCountRef) {
            state.chapterCountRef.off();
            state.chapterCountRef = null;
        }

        state.chapterCountRef = db.ref(`${FIREBASE_PATHS.STATUS_VIEWING}/${roomId}`);
        state.chapterCountRef.on('value', (snap) => {
            chapterCount = snap.numChildren();
            this.refreshDisplay();
        });
    },

    enterRoom(series, chapter) {
        if (!db) return;

        isInChapter = true;
        const safeId = `${series}_${chapter}`.replace(/[.#$\[\]]/g, '_');
        currentRoomId = safeId;

        clearRoomDebounce();
        state.pendingRoomTimer = setTimeout(() => {
            if (!isInChapter || currentRoomId !== safeId) return;

            this.attachRoomCountListener(safeId);

            if (state.connected && connectionId) {
                this.joinRoom(safeId);
            }

            this.refreshDisplay();
        }, TIMING.PRESENCE_ROOM_SWITCH_DEBOUNCE_MS);
    },

    leaveRoom() {
        if (!db) return;

        clearRoomDebounce();
        isInChapter = false;
        chapterCount = 0;

        if (currentChapterRef) {
            currentChapterRef.remove();
            currentChapterRef = null;
        }

        if (state.chapterCountRef) {
            state.chapterCountRef.off();
            state.chapterCountRef = null;
        }

        currentRoomId = null;

        if (globalConnectionRef) {
            globalConnectionRef.update({ roomId: null, lastSeen: getServerTimestamp() });
        }

        this.refreshDisplay();
    },

    refreshDisplay() {
        const elText = document.getElementById(DOM_IDS.LIVE_COUNT);
        if (!elText) {
            console.warn('[Presence] Live count element not found:', DOM_IDS.LIVE_COUNT);
            return;
        }

        let count = globalCount;
        let label = PRESENCE_LABELS.GLOBAL;

        if (isInChapter) {
            count = chapterCount > 0 ? chapterCount : 1;
            label = PRESENCE_LABELS.CHAPTER;
        }

        elText.textContent = `${count} ${label}`;
    }
};
