'use strict';

const xssSanitizer = require('../../middlewares/xssSanitizer');

function runMiddleware(body, query) {
  const req = { body: body || {}, query: query || {} };
  const res = {};
  let called = false;
  xssSanitizer(req, res, () => { called = true; });
  return { req, called };
}

describe('XSS Sanitizer middleware', () => {
  describe('sanitizes HTML-special characters in body strings', () => {
    test('encodes < and >', () => {
      const { req } = runMiddleware({ field: '<script>alert(1)</script>' });
      expect(req.body.field).toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
    });

    test('encodes &', () => {
      const { req } = runMiddleware({ field: 'a&b' });
      expect(req.body.field).toBe('a&amp;b');
    });

    test('encodes double quotes', () => {
      const { req } = runMiddleware({ field: '"quoted"' });
      expect(req.body.field).toBe('&quot;quoted&quot;');
    });

    test('encodes single quotes', () => {
      const { req } = runMiddleware({ field: "it's" });
      expect(req.body.field).toBe('it&#x27;s');
    });

    test('encodes forward slashes', () => {
      const { req } = runMiddleware({ field: 'a/b' });
      expect(req.body.field).toBe('a&#x2F;b');
    });

    test('encodes svg-based XSS vector', () => {
      const { req } = runMiddleware({ field: '<svg onload="alert(1)">' });
      expect(req.body.field).not.toContain('<');
      expect(req.body.field).not.toContain('>');
      expect(req.body.field).not.toContain('"');
    });

    test('encodes event handler injection attempt', () => {
      const { req } = runMiddleware({ field: "'; DROP TABLE users; --" });
      expect(req.body.field).not.toContain("'");
    });
  });

  describe('recursively sanitizes nested structures', () => {
    test('sanitizes nested object fields', () => {
      const { req } = runMiddleware({ outer: { inner: '<b>bold</b>' } });
      expect(req.body.outer.inner).toBe('&lt;b&gt;bold&lt;&#x2F;b&gt;');
    });

    test('sanitizes string elements inside arrays', () => {
      const { req } = runMiddleware({ tags: ['<script>', 'safe'] });
      expect(req.body.tags[0]).toBe('&lt;script&gt;');
      expect(req.body.tags[1]).toBe('safe');
    });

    test('sanitizes arrays nested in objects', () => {
      const { req } = runMiddleware({ data: { items: ['<a>', '<b>'] } });
      expect(req.body.data.items[0]).toBe('&lt;a&gt;');
      expect(req.body.data.items[1]).toBe('&lt;b&gt;');
    });
  });

  describe('leaves non-string values unchanged', () => {
    test('does not alter numbers', () => {
      const { req } = runMiddleware({ count: 42 });
      expect(req.body.count).toBe(42);
    });

    test('does not alter booleans', () => {
      const { req } = runMiddleware({ active: true });
      expect(req.body.active).toBe(true);
    });

    test('does not alter null', () => {
      const { req } = runMiddleware({ value: null });
      expect(req.body.value).toBeNull();
    });
  });

  describe('sanitizes query parameters', () => {
    test('encodes < and > in query string values', () => {
      const { req } = runMiddleware({}, { search: '<script>' });
      expect(req.query.search).toBe('&lt;script&gt;');
    });
  });

  describe('middleware contract', () => {
    test('calls next()', () => {
      const { called } = runMiddleware({ safe: 'text' });
      expect(called).toBe(true);
    });

    test('handles missing body gracefully', () => {
      const req = { query: {} };
      const res = {};
      let called = false;
      xssSanitizer(req, res, () => { called = true; });
      expect(called).toBe(true);
    });
  });
});
