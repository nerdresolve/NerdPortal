'use strict';

// Mock database and DAL modules before any app code is loaded.
jest.mock('../../dal/db', () => ({
  pool: { on: jest.fn() },
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  getClient: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  }),
  healthCheck: jest.fn().mockResolvedValue({ now: new Date() }),
}));

jest.mock('../../dal/users.dal');
jest.mock('../../dal/audit.dal');
jest.mock('../../dal/password-reset.dal');
jest.mock('../../services/uploads', () => ({
  UPLOADS_DIR: '/tmp/itportal-test-uploads',
  ensureUploadsDir: jest.fn().mockReturnValue('/tmp/itportal-test-uploads'),
  ensureUploadSubdir: jest.fn().mockReturnValue('/tmp/itportal-test-uploads/team'),
  resolveUploadPath: jest.fn((...segments) => `/tmp/itportal-test-uploads/${segments.join('/')}`),
  isPathWithinUploads: jest.fn().mockReturnValue(true),
}));
jest.mock('../../services/email', () => ({
  isEmailConfigured: jest.fn().mockReturnValue(false),
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

const supertest = require('supertest');
const bcrypt = require('bcryptjs');
const usersDal = require('../../dal/users.dal');
const auditDal = require('../../dal/audit.dal');
const { createTestApp, getCsrfToken } = require('../helpers/createTestApp');

const ORIGIN = 'http://localhost:3000';

let app;
let validPasswordHash;

beforeAll(async () => {
  validPasswordHash = await bcrypt.hash('ValidPass123!', 12);
  app = createTestApp();
});

beforeEach(() => {
  jest.clearAllMocks();
  auditDal.logAction = jest.fn().mockResolvedValue(undefined);
});

async function getAgentWithCsrf() {
  const agent = supertest.agent(app);
  const csrfToken = await getCsrfToken(agent);
  return { agent, csrfToken };
}

describe('POST /api/v1/auth/login', () => {
  test('returns 403 when CSRF token is missing', async () => {
    const agent = supertest.agent(app);
    const res = await agent
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: 'admin@example.com', password: 'ValidPass123!' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/csrf/i);
  });

  test('returns 403 when CSRF token is incorrect', async () => {
    const { agent } = await getAgentWithCsrf();
    const res = await agent
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', 'aaaa'.repeat(16))
      .send({ email: 'admin@example.com', password: 'ValidPass123!' });

    expect(res.status).toBe(403);
  });

  test('returns 400 when email is missing', async () => {
    const { agent, csrfToken } = await getAgentWithCsrf();
    const res = await agent
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ password: 'ValidPass123!' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when password is missing', async () => {
    const { agent, csrfToken } = await getAgentWithCsrf();
    const res = await agent
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'admin@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 when user does not exist', async () => {
    usersDal.findByEmail = jest.fn().mockResolvedValue(null);
    const { agent, csrfToken } = await getAgentWithCsrf();

    const res = await agent
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'notfound@example.com', password: 'ValidPass123!' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  test('returns 401 when password is wrong', async () => {
    usersDal.findByEmail = jest.fn().mockResolvedValue({
      id: 'uid-1',
      email: 'admin@example.com',
      password_hash: validPasswordHash,
      full_name: 'Admin User',
      role: 'admin',
      is_active: true,
    });

    const { agent, csrfToken } = await getAgentWithCsrf();
    const res = await agent
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'admin@example.com', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  test('returns 403 when user is deactivated', async () => {
    usersDal.findByEmail = jest.fn().mockResolvedValue({
      id: 'uid-1',
      email: 'admin@example.com',
      password_hash: validPasswordHash,
      full_name: 'Admin User',
      role: 'admin',
      is_active: false,
    });

    const { agent, csrfToken } = await getAgentWithCsrf();
    const res = await agent
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'admin@example.com', password: 'ValidPass123!' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Account is deactivated');
  });

  test('returns 403 when user role is not admin', async () => {
    usersDal.findByEmail = jest.fn().mockResolvedValue({
      id: 'uid-2',
      email: 'viewer@example.com',
      password_hash: validPasswordHash,
      full_name: 'Viewer User',
      role: 'viewer',
      is_active: true,
    });

    const { agent, csrfToken } = await getAgentWithCsrf();
    const res = await agent
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'viewer@example.com', password: 'ValidPass123!' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Administrative access only');
  });

  test('does not leak whether the email exists on failed login', async () => {
    usersDal.findByEmail = jest.fn().mockResolvedValue(null);
    const { agent, csrfToken } = await getAgentWithCsrf();

    const resNotFound = await agent
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'notfound@example.com', password: 'ValidPass123!' });

    usersDal.findByEmail = jest.fn().mockResolvedValue({
      id: 'uid-1',
      email: 'admin@example.com',
      password_hash: validPasswordHash,
      full_name: 'Admin',
      role: 'admin',
      is_active: true,
    });

    const { agent: agent2, csrfToken: csrf2 } = await getAgentWithCsrf();
    const resWrongPass = await agent2
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrf2)
      .send({ email: 'admin@example.com', password: 'WrongPassword!' });

    expect(resNotFound.status).toBe(401);
    expect(resWrongPass.status).toBe(401);
    expect(resNotFound.body.error).toBe(resWrongPass.body.error);
  });

  test('successful admin login returns user data and 200', async () => {
    usersDal.findByEmail = jest.fn().mockResolvedValue({
      id: 'uid-admin',
      email: 'admin@example.com',
      password_hash: validPasswordHash,
      full_name: 'Admin User',
      role: 'admin',
      is_active: true,
    });
    usersDal.updateLastLogin = jest.fn().mockResolvedValue(undefined);

    const { agent, csrfToken } = await getAgentWithCsrf();
    const res = await agent
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'admin@example.com', password: 'ValidPass123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('admin');
    expect(res.body.data).not.toHaveProperty('password_hash');
  });
});

describe('GET /api/v1/auth/me', () => {
  test('returns 401 when not authenticated', async () => {
    const agent = supertest.agent(app);
    const res = await agent.get('/api/v1/auth/me').set('Origin', ORIGIN);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/logout', () => {
  test('returns 401 when not authenticated', async () => {
    const { agent, csrfToken } = await getAgentWithCsrf();
    const res = await agent
      .post('/api/v1/auth/logout')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({});

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/password-reset/request', () => {
  test('returns 400 when email is missing', async () => {
    const { agent, csrfToken } = await getAgentWithCsrf();
    const res = await agent
      .post('/api/v1/auth/password-reset/request')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({});

    expect(res.status).toBe(400);
  });

  test('returns 503 when email service is not configured', async () => {
    const { isEmailConfigured } = require('../../services/email');
    isEmailConfigured.mockReturnValue(false);

    const { agent, csrfToken } = await getAgentWithCsrf();
    const res = await agent
      .post('/api/v1/auth/password-reset/request')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'admin@example.com' });

    expect(res.status).toBe(503);
  });
});

describe('POST /api/v1/auth/password-reset/verify', () => {
  test('returns 400 when email or code is missing', async () => {
    const { agent, csrfToken } = await getAgentWithCsrf();
    const res = await agent
      .post('/api/v1/auth/password-reset/verify')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'admin@example.com' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when code is not 6 digits', async () => {
    const { agent, csrfToken } = await getAgentWithCsrf();
    const res = await agent
      .post('/api/v1/auth/password-reset/verify')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'admin@example.com', code: '12345' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 digits/);
  });
});
