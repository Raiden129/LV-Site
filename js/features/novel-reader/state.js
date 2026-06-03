export function createReaderState() {
    return {
        currentNovel: null,
        currentChapterId: null,
        isLoading: false,
        loadedChapterIds: new Set(),
        trackedViewIds: new Set(),
        onChapterChangeCallback: null,
        goBackCallback: null,
        observer: null,
        urlObserver: null
    };
}

function normalizeChapter(chapter) {
    return typeof chapter === 'object' ? chapter.number : chapter;
}

export function findChapterMeta(novel, chapterId) {
    return novel?.chapters?.find(chapter => normalizeChapter(chapter) === chapterId) || null;
}

export function getChapterAtOffset(novel, chapterId, offset) {
    if (!novel?.chapters) return null;

    const index = novel.chapters.findIndex(chapter => normalizeChapter(chapter) === chapterId);
    const targetIndex = index + offset;

    if (index === -1 || targetIndex < 0 || targetIndex >= novel.chapters.length) {
        return null;
    }

    return normalizeChapter(novel.chapters[targetIndex]);
}
