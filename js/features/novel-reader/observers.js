export function createReaderObservers({
    els,
    state,
    getPrevChapterId,
    loadChapter,
    onVisibleChapter
}) {
    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            if (entry.target.classList.contains('scroll-sentinel-top')) {
                const firstChapter = els.container.querySelector('.novel-chapter-container');
                if (!firstChapter || state.isLoading) return;

                const currentId = firstChapter.dataset.chapter;
                const prevId = getPrevChapterId(currentId);

                if (prevId && !state.loadedChapterIds.has(prevId)) {
                    loadChapter(prevId, false, 'prepend');
                }
                return;
            }

            const nextId = entry.target.dataset.nextChapter;
            if (nextId && !state.isLoading && !state.loadedChapterIds.has(nextId)) {
                scrollObserver.unobserve(entry.target);
                loadChapter(nextId);
            }
        });
    }, {
        root: null,
        rootMargin: '400px',
        threshold: 0.1
    });

    const urlObserver = new IntersectionObserver((entries) => {
        const intersecting = entries.filter(entry => entry.isIntersecting);
        if (intersecting.length === 0) return;

        intersecting.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const chapterId = intersecting[0].target.dataset.chapter;

        if (chapterId) {
            onVisibleChapter(chapterId);
        }
    }, {
        root: null,
        rootMargin: '-10% 0px -50% 0px',
        threshold: 0
    });

    const topSentinel = els.container.querySelector('.scroll-sentinel-top');
    if (topSentinel) {
        scrollObserver.observe(topSentinel);
    }

    return {
        scrollObserver,
        urlObserver,
        disconnect() {
            scrollObserver.disconnect();
            urlObserver.disconnect();
        }
    };
}
