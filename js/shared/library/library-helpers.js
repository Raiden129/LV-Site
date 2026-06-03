import { Result, tryCatch } from '../../utils/result.js';
import { FIREBASE_PATHS } from '../../constants.js';
import { sanitizeFirebasePath, naturalSort } from '../../utils/helpers.js';

export async function fetchWithCache({ networkFetch, cacheKey, unavailableMessage, cacheErrorContext }) {
    const networkResult = await tryCatch(networkFetch)();

    if (networkResult.ok) {
        try {
            localStorage.setItem(cacheKey, JSON.stringify(networkResult.value));
        } catch (cacheError) {
            console.warn(cacheErrorContext, cacheError);
        }
        return networkResult;
    }

    const cached = localStorage.getItem(cacheKey);
    if (!cached) {
        return Result.failure(new Error(unavailableMessage));
    }

    return tryCatch(() => JSON.parse(cached))();
}

export async function fetchSeriesViews(db, seriesId) {
    if (!db) {
        return Result.success({});
    }

    const safePath = sanitizeFirebasePath(seriesId);
    return tryCatch(async () => {
        const snapshot = await db.ref(`${FIREBASE_PATHS.VIEWS}/${safePath}`).once('value');
        return snapshot.val() || {};
    })();
}

export function sortChapterNumbers(chapters, order = 'desc') {
    const sorted = [...chapters].sort((a, b) => {
        const chapterA = typeof a === 'object' ? a.number : a;
        const chapterB = typeof b === 'object' ? b.number : b;
        return naturalSort(chapterA, chapterB);
    });

    if (order === 'desc') {
        sorted.reverse();
    }

    return sorted;
}
