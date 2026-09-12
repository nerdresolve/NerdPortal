'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const TEST_UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'itportal-documents-test-'));

jest.mock('../../dal/db', () => ({
  pool: { on: jest.fn() },
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  getClient: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  }),
  healthCheck: jest.fn().mockResolvedValue({ now: new Date() }),
}));

jest.mock('../../dal/audit.dal');
jest.mock('../../dal/documents.dal');

// Real disk in a temp directory, without mocking isPathWithinUploads.
process.env.UPLOADS_DIR = TEST_UPLOADS_DIR;

const supertest = require('supertest');
const auditDal = require('../../dal/audit.dal');
const documentsDal = require('../../dal/documents.dal');
const { createTestApp, getCsrfToken } = require('../helpers/createTestApp');

const ORIGIN = 'http://localhost:3000';

const ADMIN_SESSION = {
  userId: 'uid-admin',
  userEmail: 'admin@example.com',
  userRole: 'admin',
  userName: 'Admin User',
};

let app;

beforeAll(() => {
  app = createTestApp({ injectSession: ADMIN_SESSION });
});

beforeEach(() => {
  jest.clearAllMocks();
  auditDal.logAction = jest.fn().mockResolvedValue(undefined);
});

afterAll(() => {
  fs.rmSync(TEST_UPLOADS_DIR, { recursive: true, force: true });
});

async function getAgentWithCsrf() {
  const agent = supertest.agent(app);
  const csrfToken = await getCsrfToken(agent);
  return { agent, csrfToken };
}

// team.controller.js creates a "team" subfolder when it loads; list only
// the files at the root so that subfolder is not counted.
function filesInUploadsDir() {
  return fs.readdirSync(TEST_UPLOADS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

describe('POST /api/v1/documents (upload)', () => {
  test('rejects a disallowed MIME type and removes the temp file', async () => {
    const { agent, csrfToken } = await getAgentWithCsrf();

    const res = await agent
      .post('/api/v1/documents')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .attach('file', Buffer.from('#!/bin/sh\necho hi'), {
        filename: 'script.sh',
        contentType: 'application/x-sh',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('File type not allowed');

    expect(filesInUploadsDir()).toHaveLength(0);
  });

  test('rejects a file over the 10MB limit', async () => {
    const { agent, csrfToken } = await getAgentWithCsrf();

    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1, 'a');

    const res = await agent
      .post('/api/v1/documents')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .attach('file', oversized, {
        filename: 'big.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('File exceeds 10MB limit');

    expect(filesInUploadsDir()).toHaveLength(0);
  });

  test('accepts an allowed MIME type, sanitizes the original filename, and stores it under a random name', async () => {
    const { agent, csrfToken } = await getAgentWithCsrf();

    documentsDal.create = jest.fn().mockResolvedValue({
      id: 'doc-1',
      original_name: 'relatório_final_2026.txt',
      category: 'general',
      created_at: new Date().toISOString(),
    });

    const res = await agent
      .post('/api/v1/documents')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .field('category', 'general')
      .attach('file', Buffer.from('conteudo do relatorio'), {
        filename: 'relatório final 2026!@#.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    expect(documentsDal.create).toHaveBeenCalledTimes(1);
    const createArgs = documentsDal.create.mock.calls[0][0];

    // Non-ASCII/symbol characters replaced with "_" (accented characters may
    // expand to more than one "_" depending on Unicode normalization),
    // spaces preserved, extension kept, no path separators survive.
    expect(createArgs.originalName).toMatch(/^relat_+rio final 2026_+\.txt$/);
    expect(createArgs.originalName).not.toMatch(/[/\\]/);
    expect(createArgs.originalName).not.toMatch(/[óÓ!@#]/);

    // Stored filename is a random hex string, never the user-supplied name.
    expect(createArgs.storedName).toMatch(/^[a-f0-9]{48}\.txt$/);

    expect(filesInUploadsDir()).toContain(createArgs.storedName);
  });
});

describe('GET /api/v1/documents/:id/download (path safety)', () => {
  test('returns 403 when the stored filename would resolve outside the uploads dir', async () => {
    const { agent } = await getAgentWithCsrf();

    documentsDal.findById = jest.fn().mockResolvedValue({
      id: 'doc-traversal',
      original_name: 'evil.txt',
      stored_name: '../../etc/passwd',
      mime_type: 'text/plain',
    });

    const res = await agent
      .get('/api/v1/documents/doc-traversal/download')
      .set('Origin', ORIGIN);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Access denied');
  });

  test('returns 404 when the stored file is missing from disk', async () => {
    const { agent } = await getAgentWithCsrf();

    documentsDal.findById = jest.fn().mockResolvedValue({
      id: 'doc-missing',
      original_name: 'ghost.txt',
      stored_name: 'never-written.txt',
      mime_type: 'text/plain',
    });

    const res = await agent
      .get('/api/v1/documents/doc-missing/download')
      .set('Origin', ORIGIN);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('File not found on disk');
  });

  test('streams the file with the sanitized original name when it exists on disk', async () => {
    const { agent } = await getAgentWithCsrf();

    fs.writeFileSync(path.join(TEST_UPLOADS_DIR, 'real-file.txt'), 'hello world');

    documentsDal.findById = jest.fn().mockResolvedValue({
      id: 'doc-real',
      original_name: 'hello.txt',
      stored_name: 'real-file.txt',
      mime_type: 'text/plain',
    });

    const res = await agent
      .get('/api/v1/documents/doc-real/download')
      .set('Origin', ORIGIN);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('hello.txt');
    expect(res.text).toBe('hello world');
  });
});

describe('DELETE /api/v1/documents/:id', () => {
  test('removes the stored file from disk after soft-deleting the record', async () => {
    const { agent, csrfToken } = await getAgentWithCsrf();

    fs.writeFileSync(path.join(TEST_UPLOADS_DIR, 'to-delete.txt'), 'bye');

    documentsDal.softDelete = jest.fn().mockResolvedValue({
      id: 'doc-del',
      stored_name: 'to-delete.txt',
    });

    const res = await agent
      .delete('/api/v1/documents/doc-del')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);

    // fs.unlink runs async inside the controller; poll briefly for it to land.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fs.existsSync(path.join(TEST_UPLOADS_DIR, 'to-delete.txt'))).toBe(false);
  });

  test('returns 404 when the document does not exist', async () => {
    const { agent, csrfToken } = await getAgentWithCsrf();

    documentsDal.softDelete = jest.fn().mockResolvedValue(null);

    const res = await agent
      .delete('/api/v1/documents/does-not-exist')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(404);
  });
});
