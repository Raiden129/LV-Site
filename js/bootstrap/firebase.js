import { waitForGlobal } from '../utils/helpers.js';

export async function initFirebase({ config, timing, onReady } = {}) {
    let db = null;

    const isFirebaseReady = () => typeof firebase !== 'undefined' && firebase.database;
    const ready = await waitForGlobal(
        isFirebaseReady,
        timing?.timeoutMs,
        timing?.pollIntervalMs
    );

    if (!ready) {
        return {
            ok: false,
            db,
            reason: 'firebase-sdk-timeout'
        };
    }

    firebase.initializeApp(config);
    db = firebase.database();
    if (typeof onReady === 'function') onReady(db);

    return {
        ok: true,
        db
    };
}
