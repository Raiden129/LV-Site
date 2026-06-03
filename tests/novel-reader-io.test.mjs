import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchChapterHtml, preloadChapter } from '../js/features/novel-reader/io.js';

function makeResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    text: async () => body
  };
}

test('preloadChapter and fetchChapterHtml use the same normalized cache key', async () => {
  global.window = { novelChapterCache: new Map() };

  const fetchCalls = [];
  global.fetch = async (url) => {
    fetchCalls.push(url);
    return makeResponse('Chapter **content**');
  };

  const novel = { id: 'my-novel' };
  const chapterMeta = { number: 101, file: '101.md' };

  const preloadResult = await preloadChapter(novel, chapterMeta, '101');
  assert.equal(preloadResult.ok, true);

  const chapterResult = await fetchChapterHtml(novel, chapterMeta, 101);
  assert.equal(chapterResult.ok, true);
  assert.equal(chapterResult.value.chapterNumber, 101);
  assert.match(chapterResult.value.htmlContent, /<strong>content<\/strong>/);

  assert.equal(fetchCalls.length, 1);
  assert.equal(global.window.novelChapterCache.size, 0);
});
