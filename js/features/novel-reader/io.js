import { MarkdownParser } from '../../utils/markdown-parser.js';
import { PATHS } from '../../constants.js';
import { Result } from '../../utils/result.js';

function resolveChapterFile(chapterMeta, chapterId) {
    return typeof chapterMeta === 'object' ? chapterMeta.file : `${chapterId}.md`;
}

function resolveChapterCacheKey(chapterId) {
    return String(chapterId);
}

export async function fetchChapterHtml(novel, chapterMeta, chapterId) {
    try {
        const chapterNumber = typeof chapterMeta === 'object' ? chapterMeta.number : chapterMeta;
        const cacheKey = resolveChapterCacheKey(chapterId);

        if (window.novelChapterCache?.has(cacheKey)) {
            const cached = window.novelChapterCache.get(cacheKey);
            window.novelChapterCache.delete(cacheKey);
            return Result.success({ chapterNumber, htmlContent: cached });
        }

        const filename = resolveChapterFile(chapterMeta, chapterId);
        const url = `${PATHS.NOVEL_CONTENT}/${novel.id}/${filename}`;
        const response = await fetch(url);

        if (!response.ok) {
            return Result.failure(Object.assign(new Error(`Failed to fetch chapter ${chapterId}`), { code: `HTTP_${response.status}` }));
        }

        const text = await response.text();
        return Result.success({ chapterNumber, htmlContent: MarkdownParser.parse(text) });
    } catch (error) {
        return Result.failure(error);
    }
}

export async function preloadChapter(novel, chapterMeta, chapterId) {
    try {
        const filename = resolveChapterFile(chapterMeta, chapterId);
        const url = `${PATHS.NOVEL_CONTENT}/${novel.id}/${filename}`;

        const response = await fetch(url);
        if (!response.ok) {
            return Result.failure(Object.assign(new Error(`Failed to preload chapter ${chapterId}`), { code: `HTTP_${response.status}` }));
        }

        const text = await response.text();
        const htmlContent = MarkdownParser.parse(text);

        if (!window.novelChapterCache) {
            window.novelChapterCache = new Map();
        }

        const cacheKey = resolveChapterCacheKey(chapterId);
        window.novelChapterCache.set(cacheKey, htmlContent);
        return Result.success(true);
    } catch (error) {
        return Result.failure(error);
    }
}
