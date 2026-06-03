import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchJsonFileAtLatestCommit } from '../js/features/admin/content-utils.js';

test('fetchJsonFileAtLatestCommit returns defaultValue on "Not Found" when allowNotFound is true', async () => {
    const github = {
        async getLatestCommit() {
            return { ok: true, value: 'abc123' };
        },
        async request() {
            return { ok: false, error: new Error('Not Found') };
        }
    };

    const result = await fetchJsonFileAtLatestCommit(github, 'missing.json', {
        allowNotFound: true,
        defaultValue: []
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.value, []);
});

test('fetchJsonFileAtLatestCommit keeps failures for non-not-found errors', async () => {
    const github = {
        async getLatestCommit() {
            return { ok: true, value: 'abc123' };
        },
        async request() {
            return { ok: false, error: new Error('Bad credentials') };
        }
    };

    const result = await fetchJsonFileAtLatestCommit(github, 'manga.json', {
        allowNotFound: true,
        defaultValue: []
    });

    assert.equal(result.ok, false);
    assert.equal(result.error.message, 'Bad credentials');
});
