'use strict';

// Full password recovery flow: request -> verify -> confirm.

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
jest.mock('../../dal/users.dal');
jest.mock('../../dal/password-reset.dal');
jest.mock('../../services/email', () => ({
  isEmailConfigured: jest.fn().mockReturnValue(true),
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

const bcrypt = require('bcryptjs');
const supertest = require('supertest');
const auditDal = require('../../dal/audit.dal');
const usersDal = require('../../dal/users.dal');
const passwordResetDal = require('../../dal/password-reset.dal');
const { sendEmail } = require('../../services/email');
const { createTestApp, getCsrfToken } = require('../helpers/createTestApp');

const ORIGIN = 'http://localhost:3000';
const ADMIN_ID = 'uid-admin-reset';
const ADMIN_EMAIL = 'admin.reset@example.com';

// A minimal in-memory stand-in for the password_reset_requests table, so the
// three endpoints can share state exactly like they would through SQLite,
// without needing a real database connection.
let store;

function resetStore() {
  store = null;
}

function baseUser() {
  return {
    id: ADMIN_ID,
    email: ADMIN_EMAIL,
    full_name: 'Admin Reset',
    role: 'admin',
    is_active: true,
  };
}

// Joins a password_reset_requests row with its owning user's public fields,
// the way the real SQL JOIN in password-reset.dal.js does. Deliberately
// drops the user's `id` so it can never shadow the request row's own `id`
// (the two are different primary keys — the controller relies on
// requestRecord.id being the *request* id when calling markVerified/etc).
function joinWithUser(row) {
  const { id: _userId, ...userFields } = baseUser();
  return { ...row, ...userFields };
}

beforeAll(() => {
  usersDal.findByEmail = jest.fn(async (email) =>
    email.toLowerCase() === ADMIN_EMAIL ? baseUser() : null
  );
  usersDal.updatePassword = jest.fn(async (id, passwordHash) => {
    if (id === ADMIN_ID) {
      store.currentPasswordHash = passwordHash;
    }
  });

  passwordResetDal.invalidateActiveByUserId = jest.fn(async () => {
    if (store) store.invalidated = true;
  });

  passwordResetDal.create = jest.fn(async ({ userId, requestEmail, codeHash, expiresAt }) => {
    store = {
      id: 'reset-req-1',
      user_id: userId,
      request_email: requestEmail,
      code_hash: codeHash,
      expires_at: expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt,
      attempt_count: 0,
      verified_at: null,
      used_at: null,
      invalidated: false,
      reset_token_hash: null,
      currentPasswordHash: null,
    };
    return { id: store.id };
  });

  passwordResetDal.findLatestActiveByEmail = jest.fn(async (email) => {
    if (!store || store.used_at || store.invalidated || email.toLowerCase() !== ADMIN_EMAIL) {
      return null;
    }
    return joinWithUser(store);
  });

  passwordResetDal.incrementAttempts = jest.fn(async (id) => {
    if (!store || store.id !== id) return null;
    store.attempt_count += 1;
    return { id: store.id, attempt_count: store.attempt_count };
  });

  passwordResetDal.invalidateById = jest.fn(async (id) => {
    if (store && store.id === id) store.invalidated = true;
  });

  passwordResetDal.markVerified = jest.fn(async (id, resetTokenHash) => {
    if (!store || store.id !== id) return null;
    store.verified_at = new Date().toISOString();
    store.reset_token_hash = resetTokenHash;
    return { id: store.id };
  });

  passwordResetDal.findVerifiedByEmailAndToken = jest.fn(async (email, resetTokenHash) => {
    if (
      !store ||
      store.used_at ||
      store.invalidated ||
      !store.verified_at ||
      store.reset_token_hash !== resetTokenHash ||
      email.toLowerCase() !== ADMIN_EMAIL
    ) {
      return null;
    }
    return joinWithUser(store);
  });

  passwordResetDal.markUsed = jest.fn(async (id) => {
    if (store && store.id === id) store.used_at = new Date().toISOString();
  });
});

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  auditDal.logAction = jest.fn().mockResolvedValue(undefined);
  usersDal.findByEmail = jest.fn(async (email) =>
    email.toLowerCase() === ADMIN_EMAIL ? baseUser() : null
  );
  usersDal.updatePassword = jest.fn(async (id, passwordHash) => {
    if (store) store.currentPasswordHash = passwordHash;
  });
});

let app;

beforeAll(() => {
  app = createTestApp();
});

async function getAgentWithCsrf() {
  const agent = supertest.agent(app);
  const csrfToken = await getCsrfToken(agent);
  return { agent, csrfToken };
}

// requestPasswordReset fires the email send via setImmediate after responding.
function flushSetImmediate() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('Password reset — full happy path', () => {
  test('request -> verify -> confirm succeeds end to end with a real generated code', async () => {
    const { agent: reqAgent, csrfToken: reqCsrf } = await getAgentWithCsrf();
    const reqRes = await reqAgent
      .post('/api/v1/auth/password-reset/request')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', reqCsrf)
      .send({ email: ADMIN_EMAIL });

    expect(reqRes.status).toBe(200);
    expect(passwordResetDal.create).toHaveBeenCalledTimes(1);

    await flushSetImmediate();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const sentText = sendEmail.mock.calls[0][0].text;
    const code = sentText.match(/verification code is: (\d{6})/)[1];

    const { agent: verifyAgent, csrfToken: verifyCsrf } = await getAgentWithCsrf();
    const verifyRes = await verifyAgent
      .post('/api/v1/auth/password-reset/verify')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', verifyCsrf)
      .send({ email: ADMIN_EMAIL, code });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.resetToken).toBeTruthy();
    const { resetToken } = verifyRes.body.data;

    const { agent: confirmAgent, csrfToken: confirmCsrf } = await getAgentWithCsrf();
    const newPassword = 'TestFixture@2026*';
    const confirmRes = await confirmAgent
      .post('/api/v1/auth/password-reset/confirm')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', confirmCsrf)
      .send({ email: ADMIN_EMAIL, resetToken, newPassword });

    expect(confirmRes.status).toBe(200);
    expect(usersDal.updatePassword).toHaveBeenCalledWith(ADMIN_ID, expect.any(String), expect.anything());

    const storedHash = usersDal.updatePassword.mock.calls[0][1];
    await expect(bcrypt.compare(newPassword, storedHash)).resolves.toBe(true);
  });

  test('reusing the same resetToken a second time fails (single use)', async () => {
    const { agent: reqAgent, csrfToken: reqCsrf } = await getAgentWithCsrf();
    await reqAgent
      .post('/api/v1/auth/password-reset/request')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', reqCsrf)
      .send({ email: ADMIN_EMAIL });
    await flushSetImmediate();
    const code = sendEmail.mock.calls[0][0].text.match(/verification code is: (\d{6})/)[1];

    const { agent: verifyAgent, csrfToken: verifyCsrf } = await getAgentWithCsrf();
    const verifyRes = await verifyAgent
      .post('/api/v1/auth/password-reset/verify')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', verifyCsrf)
      .send({ email: ADMIN_EMAIL, code });
    const { resetToken } = verifyRes.body.data;

    const { agent: firstConfirmAgent, csrfToken: firstConfirmCsrf } = await getAgentWithCsrf();
    const firstConfirm = await firstConfirmAgent
      .post('/api/v1/auth/password-reset/confirm')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', firstConfirmCsrf)
      .send({ email: ADMIN_EMAIL, resetToken, newPassword: 'TestFixture@2026*' });
    expect(firstConfirm.status).toBe(200);

    const { agent: secondConfirmAgent, csrfToken: secondConfirmCsrf } = await getAgentWithCsrf();
    const secondConfirm = await secondConfirmAgent
      .post('/api/v1/auth/password-reset/confirm')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', secondConfirmCsrf)
      .send({ email: ADMIN_EMAIL, resetToken, newPassword: 'Outra@Senha2026*' });

    expect(secondConfirm.status).toBe(400);
  });
});

describe('Password reset — attempt lockout', () => {
  test('code is invalidated after PASSWORD_RESET_MAX_ATTEMPTS wrong attempts', async () => {
    const maxAttempts = parseInt(process.env.PASSWORD_RESET_MAX_ATTEMPTS || '5', 10);

    const { agent: reqAgent, csrfToken: reqCsrf } = await getAgentWithCsrf();
    await reqAgent
      .post('/api/v1/auth/password-reset/request')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', reqCsrf)
      .send({ email: ADMIN_EMAIL });
    await flushSetImmediate();
    const realCode = sendEmail.mock.calls[0][0].text.match(/verification code is: (\d{6})/)[1];
    const wrongCode = realCode === '000000' ? '111111' : '000000';

    for (let i = 0; i < maxAttempts; i++) {
      const { agent, csrfToken } = await getAgentWithCsrf();
      const res = await agent
        .post('/api/v1/auth/password-reset/verify')
        .set('Origin', ORIGIN)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: ADMIN_EMAIL, code: wrongCode });
      expect(res.status).toBe(400);
    }

    // Even the correct code must now be rejected — the request was invalidated.
    const { agent, csrfToken } = await getAgentWithCsrf();
    const finalRes = await agent
      .post('/api/v1/auth/password-reset/verify')
      .set('Origin', ORIGIN)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: ADMIN_EMAIL, code: realCode });

    expect(finalRes.status).toBe(400);
    expect(store.invalidated).toBe(true);
  });
});
