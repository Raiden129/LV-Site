import test from 'node:test';
import assert from 'node:assert/strict';

import { createLibraryFeature } from '../js/features/library.js';
import { createNovelLibraryFeature } from '../js/features/novel-library.js';
import { createReaderFeature } from '../js/features/reader.js';
import { setTrackChapterViewHandler, trackChapterView } from '../js/features/novel-reader/render.js';

function makeStorage() {
  return {
    store: new Map(),
    getItem(key) {
      return this.store.has(key) ? this.store.get(key) : null;
    },
    setItem(key, value) {
      this.store.set(key, value);
    }
  };
}

function makeDbRecorder() {
  const calls = [];
  return {
    calls,
    db: {
      ref(path) {
        return {
          transaction(fn) {
            calls.push({ path, value: fn(0) });
          }
        };
      }
    }
  };
}

test('feature factories create isolated state per instance', async () => {
  const first = createLibraryFeature();
  const second = createLibraryFeature();

  global.localStorage = makeStorage();
  global.fetch = async () => ({ ok: true, json: async () => [{ id: 'a', chapters: [] }] });

  await first.init(null);
  assert.equal(first.getSeries('a').id, 'a');
  assert.equal(second.getSeries('a'), undefined);

  const n1 = createNovelLibraryFeature();
  const n2 = createNovelLibraryFeature();
  global.fetch = async () => ({ ok: true, json: async () => [{ id: 'n-1', chapters: [] }] });

  await n1.init(null);
  assert.equal(n1.getSeries('n-1').id, 'n-1');
  assert.equal(n2.getSeries('n-1'), undefined);
});

test('reader initialization order: trackView is inert before init and active after init', () => {
  const reader = createReaderFeature();
  const recorder = makeDbRecorder();

  global.localStorage = makeStorage();

  reader.trackView('series-1', '1');
  assert.equal(recorder.calls.length, 0);

  reader.init({ db: recorder.db });
  reader.trackView('series-1', '1');

  assert.equal(recorder.calls.length, 1);
  assert.equal(recorder.calls[0].path, 'views/series-1/1');
});

test('repeated navigation state stays stable when toggling sort', () => {
  const library = createLibraryFeature({
    library: { s1: { id: 's1', chapters: ['1', '2'] } },
    currentSeriesId: 's1',
    lastOnClickChapter: () => {},
    chapterSortOrder: 'desc'
  });

  let rerenders = 0;
  library.renderSortedChaptersList = () => {
    rerenders += 1;
  };

  library.toggleSort();
  library.toggleSort();

  assert.equal(rerenders, 2);
  assert.equal(library.getState().chapterSortOrder, 'desc');
});

test('novel reader tracking uses injected handler instead of default singleton', () => {
  const tracked = new Set();
  const calls = [];

  setTrackChapterViewHandler((novelId, chapterId) => {
    calls.push({ novelId, chapterId });
  });

  trackChapterView('novel-1', '10', tracked);
  trackChapterView('novel-1', '10', tracked);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { novelId: 'novel-1', chapterId: '10' });
});
