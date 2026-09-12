'use strict';

const crypto = require('crypto');
const csrfProtection = require('../../middlewares/csrf');

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

function buildReq({ method = 'GET', cookies = {}, headers = {} } = {}) {
  return { method, cookies, headers };
}

function buildRes() {
  const res = {};
  res.cookie = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function run(req, res) {
  let called = false;
  csrfProtection(req, res, () => { called = true; });
  return called;
}

describe('CSRF middleware', () => {
  describe('token generation', () => {
    test('sets a csrf_token cookie when none is present on GET', () => {
      const req = buildReq({ method: 'GET', cookies: {} });
      const res = buildRes();
      run(req, res);
      expect(res.cookie).toHaveBeenCalledWith(
        CSRF_COOKIE,
        expect.stringMatching(/^[0-9a-f]{64}$/),
        // "lax", not "strict": the frontend and the API are separate origins in
        // the default deployment, and "strict" would stop the browser sending
        // the cookie back at all. The double-submit header is what stops CSRF.
        expect.objectContaining({ httpOnly: false, sameSite: 'lax' })
      );
    });

    test('does not overwrite an existing csrf_token cookie', () => {
      const token = crypto.randomBytes(32).toString('hex');
      const req = buildReq({ method: 'GET', cookies: { [CSRF_COOKIE]: token } });
      const res = buildRes();
      run(req, res);
      expect(res.cookie).not.toHaveBeenCalled();
    });

    test('exposes csrfToken on the request object', () => {
      const token = crypto.randomBytes(32).toString('hex');
      const req = buildReq({ method: 'GET', cookies: { [CSRF_COOKIE]: token } });
      const res = buildRes();
      run(req, res);
      expect(req.csrfToken).toBe(token);
    });
  });

  describe('safe methods bypass validation', () => {
    test.each(['GET', 'HEAD', 'OPTIONS'])('%s passes without token', (method) => {
      const req = buildReq({ method, cookies: {} });
      const res = buildRes();
      const next = run(req, res);
      expect(next).toBe(true);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('state-changing methods require valid token', () => {
    test.each(['POST', 'PUT', 'DELETE', 'PATCH'])('%s without tokens returns 403', (method) => {
      const req = buildReq({ method, cookies: {}, headers: {} });
      const res = buildRes();
      run(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'CSRF token missing' })
      );
    });

    test('POST with cookie but missing header returns 403', () => {
      const token = crypto.randomBytes(32).toString('hex');
      const req = buildReq({ method: 'POST', cookies: { [CSRF_COOKIE]: token }, headers: {} });
      const res = buildRes();
      run(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'CSRF token missing' })
      );
    });

    test('POST with header but missing cookie returns 403', () => {
      const token = crypto.randomBytes(32).toString('hex');
      const req = buildReq({
        method: 'POST',
        cookies: {},
        headers: { [CSRF_HEADER]: token },
      });
      const res = buildRes();
      run(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('POST with mismatched tokens returns 403', () => {
      const cookieToken = crypto.randomBytes(32).toString('hex');
      const headerToken = crypto.randomBytes(32).toString('hex');
      const req = buildReq({
        method: 'POST',
        cookies: { [CSRF_COOKIE]: cookieToken },
        headers: { [CSRF_HEADER]: headerToken },
      });
      const res = buildRes();
      run(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'CSRF token mismatch' })
      );
    });

    test('POST with matching tokens passes', () => {
      const token = crypto.randomBytes(32).toString('hex');
      const req = buildReq({
        method: 'POST',
        cookies: { [CSRF_COOKIE]: token },
        headers: { [CSRF_HEADER]: token },
      });
      const res = buildRes();
      const next = run(req, res);
      expect(next).toBe(true);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('token comparison rejects prefix-matching tokens of different length', () => {
      const token = crypto.randomBytes(32).toString('hex');
      const shorterToken = token.slice(0, -2);
      const req = buildReq({
        method: 'POST',
        cookies: { [CSRF_COOKIE]: token },
        headers: { [CSRF_HEADER]: shorterToken },
      });
      const res = buildRes();
      run(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('empty string tokens return 403', () => {
      const req = buildReq({
        method: 'POST',
        cookies: { [CSRF_COOKIE]: '' },
        headers: { [CSRF_HEADER]: '' },
      });
      const res = buildRes();
      run(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
