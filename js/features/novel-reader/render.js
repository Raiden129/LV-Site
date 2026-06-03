import { ICONS } from '../../constants.js';
let trackViewHandler = () => {};

export function setTrackChapterViewHandler(handler) {
    trackViewHandler = typeof handler === 'function' ? handler : () => {};
}


export function updateBreadcrumbUI(els, novel, goBackCallback, chapterId) {
    if (!els.breadcrumb || !novel) return;

    const chapterText = els.breadcrumb.querySelector('#bc-chapter-text');
    if (chapterText) {
        chapterText.textContent = `Chapter ${chapterId}`;
        return;
    }

    const sep1 = document.createElement('span');
    sep1.className = 'breadcrumb-sep';
    sep1.textContent = '›';

    const novelLink = document.createElement('a');
    novelLink.href = '#';
    novelLink.className = 'breadcrumb-link';
    novelLink.id = 'bc-novel-link';
    novelLink.textContent = novel.title;

    const sep2 = document.createElement('span');
    sep2.className = 'breadcrumb-sep';
    sep2.textContent = '›';

    const currentChapter = document.createElement('span');
    currentChapter.className = 'breadcrumb-current';
    currentChapter.id = 'bc-chapter-text';
    currentChapter.textContent = `Chapter ${chapterId}`;

    els.breadcrumb.replaceChildren(sep1, novelLink, sep2, currentChapter);

    novelLink.onclick = (event) => {
        event.preventDefault();
        if (goBackCallback && novel) {
            goBackCallback(novel.id);
        }
    };
}

export function renderLoadError(els, chapterNumber, position) {
    const errorBox = document.createElement('div');
    errorBox.className = 'error-box';
    errorBox.innerText = `Failed to load Chapter ${chapterNumber}`;

    if (position === 'prepend') {
        const sentinel = els.container.querySelector('.scroll-sentinel-top');
        els.container.insertBefore(errorBox, sentinel ? sentinel.nextSibling : els.container.firstChild);
        return;
    }

    els.container.appendChild(errorBox);
}

function sanitizeRenderedHtml(htmlContent) {
    const template = document.createElement('template');
    if (!htmlContent) return template.content;
    template.innerHTML = htmlContent; 

    const blockedSelectors = 'script,style,iframe,object,embed,link,meta';
    for (const node of template.content.querySelectorAll(blockedSelectors)) {
        node.remove();
    }

    for (const element of template.content.querySelectorAll('*')) {
        for (const attribute of [...element.attributes]) {
            const name = attribute.name.toLowerCase();
            const value = attribute.value.trim().toLowerCase();

            if (name.startsWith('on')) {
                element.removeAttribute(attribute.name);
                continue;
            }

            if ((name === 'href' || name === 'src' || name === 'xlink:href') && value.startsWith('javascript:')) {
                element.removeAttribute(attribute.name);
            }
        }
    }

    return template.content;
}

export function renderChapterToDOM({
    els,
    chapterNum,
    htmlContent,
    position,
    getNextChapterId,
    observer,
    urlObserver,
    onVisibleChapter
}) {
    const wrapper = document.createElement('article');
    wrapper.className = 'novel-chapter-container';
    wrapper.dataset.chapter = chapterNum;
    wrapper.id = `chapter-${chapterNum}`;

    const divider = document.createElement('div');
    divider.className = 'chapter-divider';
    divider.insertAdjacentHTML('beforeend', ICONS.BOOK_SPINE); 

    const body = document.createElement('div');
    body.className = 'chapter-body';
    body.appendChild(sanitizeRenderedHtml(htmlContent));

    wrapper.append(divider, body);

    if (position === 'prepend') {
        const oldHeight = document.documentElement.scrollHeight;
        const oldScrollY = window.scrollY;

        const sentinel = els.container.querySelector('.scroll-sentinel-top');
        if (sentinel) {
            els.container.insertBefore(wrapper, sentinel.nextSibling);
        } else {
            els.container.prepend(wrapper);
        }

        const newHeight = document.documentElement.scrollHeight;
        window.scrollTo(0, oldScrollY + (newHeight - oldHeight));
    } else {
        els.container.appendChild(wrapper);

        const nextChapterId = getNextChapterId(chapterNum);
        if (nextChapterId) {
            const sentinel = document.createElement('div');
            sentinel.className = 'scroll-sentinel';
            sentinel.dataset.nextChapter = nextChapterId;
            els.container.appendChild(sentinel);
            if (observer) observer.observe(sentinel);
        } else {
            const endMsg = document.createElement('div');
            endMsg.className = 'novel-end-message';
            endMsg.textContent = 'You have reached the latest chapter.';
            els.container.appendChild(endMsg);
        }
    }

    if (urlObserver) {
        urlObserver.observe(wrapper);

        if (position === 'append') {
            setTimeout(() => {
                const rect = wrapper.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                if (rect.top < viewportHeight && rect.bottom > 0) {
                    onVisibleChapter(chapterNum);
                }
            }, 100);
        }
    }
}

export function trackChapterView(novelId, chapterId, trackedViewIds) {
    if (trackedViewIds.has(chapterId)) return;
    trackViewHandler(novelId, chapterId);
    trackedViewIds.add(chapterId);
}
