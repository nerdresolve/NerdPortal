'use strict';

const { requireAuth, requireRole } = require('../../middlewares/auth');

function buildReq(sessionData = null) {
  return { session: sessionData };
}

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function runMiddleware(fn, req) {
  const res = buildRes();
  let called = false;
  fn(req, res, () => { called = true; });
  return { res, called };
}

describe('requireAuth middleware', () => {
  test('passes when session has userId', () => {
    const req = buildReq({ userId: 'user-uuid-1' });
    const { called } = runMiddleware(requireAuth, req);
    expect(called).toBe(true);
  });

  test('returns 401 when session is missing', () => {
    const req = buildReq(null);
    const { res, called } = runMiddleware(requireAuth, req);
    expect(called).toBe(false);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Authentication required' })
    );
  });

  test('returns 401 when session exists but has no userId', () => {
    const req = buildReq({});
    const { res, called } = runMiddleware(requireAuth, req);
    expect(called).toBe(false);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 401 when req.session is undefined', () => {
    const req = {};
    const { res } = runMiddleware(requireAuth, req);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireRole middleware', () => {
  describe('single required role', () => {
    test('passes when session role matches', () => {
      const req = buildReq({ userId: 'uid', userRole: 'admin' });
      const { called } = runMiddleware(requireRole('admin'), req);
      expect(called).toBe(true);
    });

    test('returns 403 when session role does not match', () => {
      const req = buildReq({ userId: 'uid', userRole: 'viewer' });
      const { res, called } = runMiddleware(requireRole('admin'), req);
      expect(called).toBe(false);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Insufficient permissions' })
      );
    });

    test('returns 401 when session has no userId', () => {
      const req = buildReq({});
      const { res } = runMiddleware(requireRole('admin'), req);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('returns 401 when session is null', () => {
      const req = buildReq(null);
      const { res } = runMiddleware(requireRole('admin'), req);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('multiple allowed roles', () => {
    test('passes when session role is one of the allowed roles', () => {
      const req = buildReq({ userId: 'uid', userRole: 'editor' });
      const { called } = runMiddleware(requireRole('admin', 'editor'), req);
      expect(called).toBe(true);
    });

    test('returns 403 when session role is not in the allowed roles list', () => {
      const req = buildReq({ userId: 'uid', userRole: 'viewer' });
      const { res } = runMiddleware(requireRole('admin', 'editor'), req);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('privilege escalation attempts', () => {
    test('viewer role cannot access admin endpoint', () => {
      const req = buildReq({ userId: 'uid', userRole: 'viewer' });
      const { res } = runMiddleware(requireRole('admin'), req);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('missing userRole in session returns 403', () => {
      const req = buildReq({ userId: 'uid' });
      const { res } = runMiddleware(requireRole('admin'), req);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
