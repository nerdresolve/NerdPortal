'use strict';

jest.mock('../../dal/db', () => ({
  pool: { on: jest.fn() },
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  getClient: jest.fn(),
  healthCheck: jest.fn().mockResolvedValue({ now: new Date() }),
}));

jest.mock('../../dal/audit.dal', () => ({
  logAction: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../dal/announcements.dal', () => ({
  findAll: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../services/uploads', () => ({
  UPLOADS_DIR: '/tmp/itportal-test-uploads',
  ensureUploadsDir: jest.fn().mockReturnValue('/tmp/itportal-test-uploads'),
  ensureUploadSubdir: jest.fn().mockReturnValue('/tmp/itportal-test-uploads/team'),
  resolveUploadPath: jest.fn((...segments) => `/tmp/itportal-test-uploads/${segments.join('/')}`),
  isPathWithinUploads: jest.fn().mockReturnValue(true),
}));

const supertest = require('supertest');
const { createTestApp } = require('../helpers/createTestApp');

let app;

beforeAll(() => {
  app = createTestApp();
});

async function getResponse() {
  return supertest(app)
    .get('/api/v1/announcements')
    .set('Origin', 'http://localhost:3000');
}

describe('Security headers', () => {
  test('X-Content-Type-Options is set to nosniff', async () => {
    const res = await getResponse();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('X-Frame-Options header is present', async () => {
    const res = await getResponse();
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  test('Content-Security-Policy header is present', async () => {
    const res = await getResponse();
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  test('Content-Security-Policy restricts default-src to self', async () => {
    const res = await getResponse();
    expect(res.headers['content-security-policy']).toMatch(/default-src 'self'/);
  });

  test('Content-Security-Policy blocks object embeds', async () => {
    const res = await getResponse();
    expect(res.headers['content-security-policy']).toMatch(/object-src 'none'/);
  });

  test('Content-Security-Policy blocks framing', async () => {
    const res = await getResponse();
    expect(res.headers['content-security-policy']).toMatch(/frame-ancestors 'none'/);
  });

  test('Strict-Transport-Security header is present', async () => {
    const res = await getResponse();
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  test('Strict-Transport-Security max-age is at least one year', async () => {
    const res = await getResponse();
    const hsts = res.headers['strict-transport-security'];
    const maxAge = parseInt((hsts.match(/max-age=(\d+)/) || [])[1], 10);
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
  });

  test('Strict-Transport-Security includes subdomains', async () => {
    const res = await getResponse();
    expect(res.headers['strict-transport-security']).toMatch(/includeSubDomains/);
  });

  test('X-Powered-By header is not present', async () => {
    const res = await getResponse();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('CSRF cookie is set with sameSite strict', async () => {
    const res = await supertest(app)
      .get('/api/v1/announcements')
      .set('Origin', 'http://localhost:3000');

    const cookies = res.headers['set-cookie'] || [];
    const csrfCookie = cookies.find((c) => c.startsWith('csrf_token='));
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie.toLowerCase()).toMatch(/samesite=strict/);
  });

  test('CSRF cookie is not httpOnly (must be readable by frontend JS)', async () => {
    const res = await supertest(app)
      .get('/api/v1/announcements')
      .set('Origin', 'http://localhost:3000');

    const cookies = res.headers['set-cookie'] || [];
    const csrfCookie = cookies.find((c) => c.startsWith('csrf_token='));
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie.toLowerCase()).not.toMatch(/httponly/);
  });

  test('404 responses include security headers', async () => {
    const res = await supertest(app)
      .get('/api/v1/nonexistent-endpoint')
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(404);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('responses do not include Server header with version info', async () => {
    const res = await getResponse();
    const server = res.headers['server'];
    if (server) {
      expect(server).not.toMatch(/\d+\.\d+/);
    }
  });
});

describe('CORS enforcement', () => {
  test('requests from unlisted origin are rejected', async () => {
    const res = await supertest(app)
      .post('/api/v1/announcements')
      .set('Origin', 'http://attacker.example.com')
      .set('Content-Type', 'application/json')
      .send({ title: 'x', body: 'x' });

    expect([403, 500]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  test('requests from allowed origin are not blocked by CORS', async () => {
    const res = await supertest(app)
      .get('/api/v1/announcements')
      .set('Origin', 'http://localhost:3000');

    expect(res.status).not.toBe(403);
  });
});
