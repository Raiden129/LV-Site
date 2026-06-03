import test from 'node:test';
import assert from 'node:assert/strict';

import { MarkdownParser } from '../js/utils/markdown-parser.js';

test('MarkdownParser escapes raw HTML script tags', () => {
  const parsed = MarkdownParser.parse('<script>alert(1)</script>');
  assert.equal(parsed, '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
});

test('MarkdownParser escapes event handler injection vectors in HTML tags', () => {
  const parsed = MarkdownParser.parse('<img src=x onerror=alert(1)>');
  assert.equal(parsed, '<p>&lt;img src=x onerror=alert(1)&gt;</p>');
});

test('MarkdownParser keeps markdown formatting while preserving escaped javascript links', () => {
  const parsed = MarkdownParser.parse('**Safe** <a href="javascript:alert(1)">link</a>');
  assert.equal(
    parsed,
    '<p><strong>Safe</strong> &lt;a href=&quot;javascript:alert(1)&quot;&gt;link&lt;/a&gt;</p>'
  );
});
