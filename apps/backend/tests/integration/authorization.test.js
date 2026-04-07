'use strict';

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
jest.mock('../../dal/announcements.dal');
jest.mock('../../dal/systems.dal');
jest.mock('../../dal/documents.dal');
jest.mock('../../dal/team.dal');
jest.mock('../../dal/metrics.dal');
jest.mock('../../dal/users.dal');
jest.mock('../../services/uploads', () => ({
  UPLOADS_DIR: '/tmp/itportal-test-uploads',
  ensureUploadsDir: jest.fn().mockReturnValue('/tmp/itportal-test-uploads'),
  ensureUploadSubdir: jest.fn().mockReturnValue('/tmp/itportal-test-uploads/team'),
  resolveUploadPath: jest.fn((...segments) => `/tmp/itportal-test-uploads/${segments.join('/')}`),
  isPathWithinUploads: jest.fn().mockReturnValue(true),
}));

const supertest = require('supertest');
const auditDal = require('../../dal/audit.dal');
const announcementsDal = require('../../dal/announcements.dal');
const { createTestApp, getCsrfToken } = require('../helpers/createTestApp');

const ORIGIN = 'http://localhost:3000';

const ADMIN_SESSION = {
  userId: 'uid-admin',
  userEmail: 'admin@example.com',
  userRole: 'admin',
  userName: 'Admin User',
};

const VIEWER_SESSION = {
  userId: 'uid-viewer',
  userEmail: 'viewer@example.com',
  userRole: 'viewer',
  userName: 'Viewer User',
};

beforeEach(() => {
  jest.clearAllMocks();
  auditDal.logAction = jest.fn().mockResolvedValue(undefined);
});

async function getAgentWithCsrf(app) {
  const agent = supertest.agent(app);
  const csrfToken = await getCsrfToken(agent);
  return { agent, csrfToken };
}

describe('Announcements - public read access', () => {
  let app;
  beforeAll(() => {
    app = createTestApp();
  });

  test('GET /api/v1/announcements returns 200 without authentication', async () => {
    announcementsDal.findAll = jest.fn().mockResolvedValue([]);
    announcementsDal.count = jest.fn().mockResolvedValue(0);

    const res = await supertest(app)
      .get('/api/v1/announcements')
      .set('Origin', ORIGIN);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/v1/announcements/:id returns 404 for unknown id without auth', async () => {
    announcementsDal.findById = jest.fn().mockResolvedValue(null);

    const res = await supertest(app)
      .get('/api/v1/announcements/00000000-0000-0000-0000-000000000000')
      .set('Origin', ORIGIN);

    expect(res.status).toBe(404);
  });
});

describe('Announcements - write access requires admin role', () => {
  test('POST returns 403 (CSRF) when completely unauthenticated and no token', async () => {
    const app = createTestApp();
    const res = await supertest(app)
      .post('/api/v1/announcements')
      .set('Origin', ORIGIN)
      .send({ title: 'Test', body: 'Body' });

    expect(res.status).toBe(403);
  });

  test('POST returns 401 when authenticated session is absent (CSRF supplied)', async () => {
    const app = createTestApp();
    const { agent, csrfToken } = await getAgentWithCsrf(app);

    const res = await agent
      .post('/api/v1/announcements')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Test', body: 'Body' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
  });

  test('POST returns 403 when session role is viewer', async () => {
    const app = createTestApp({ injectSession: VIEWER_SESSION });
    const { agent, csrfToken } = await getAgentWithCsrf(app);

    const res = await agent
      .post('/api/v1/announcements')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Test', body: 'Body' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Insufficient permissions');
  });

  test('PUT returns 403 when session role is viewer', async () => {
    const app = createTestApp({ injectSession: VIEWER_SESSION });
    const { agent, csrfToken } = await getAgentWithCsrf(app);

    const res = await agent
      .put('/api/v1/announcements/00000000-0000-0000-0000-000000000000')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Updated' });

    expect(res.status).toBe(403);
  });

  test('DELETE returns 403 when session role is viewer', async () => {
    const app = createTestApp({ injectSession: VIEWER_SESSION });
    const { agent, csrfToken } = await getAgentWithCsrf(app);

    const res = await agent
      .delete('/api/v1/announcements/00000000-0000-0000-0000-000000000000')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(403);
  });

  test('POST succeeds with admin session and valid payload', async () => {
    announcementsDal.create = jest.fn().mockResolvedValue({
      id: 'new-uuid',
      title: 'Test Announcement',
      is_pinned: false,
      published_at: null,
      created_at: new Date().toISOString(),
    });

    const app = createTestApp({ injectSession: ADMIN_SESSION });
    const { agent, csrfToken } = await getAgentWithCsrf(app);

    const res = await agent
      .post('/api/v1/announcements')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Test Announcement', body: 'Announcement body.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('Systems - write access requires admin role', () => {
  const systemsDal = require('../../dal/systems.dal');

  test('POST /api/v1/systems returns 401 without session', async () => {
    const app = createTestApp();
    const { agent, csrfToken } = await getAgentWithCsrf(app);

    const res = await agent
      .post('/api/v1/systems')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'ERP', status: 'operational' });

    expect(res.status).toBe(401);
  });

  test('DELETE /api/v1/systems/:id returns 403 for viewer', async () => {
    const app = createTestApp({ injectSession: VIEWER_SESSION });
    const { agent, csrfToken } = await getAgentWithCsrf(app);

    const res = await agent
      .delete('/api/v1/systems/some-id')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(403);
  });
});

describe('Horizontal privilege escalation is blocked', () => {
  test('editor role cannot create announcements', async () => {
    const editorSession = { userId: 'uid-editor', userRole: 'editor', userEmail: 'editor@example.com', userName: 'Editor' };
    const app = createTestApp({ injectSession: editorSession });
    const { agent, csrfToken } = await getAgentWithCsrf(app);

    const res = await agent
      .post('/api/v1/announcements')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Test', body: 'Body' });

    expect(res.status).toBe(403);
  });
});
