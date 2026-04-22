'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// Builds the Express app with a MemoryStore session for isolated testing.
// All DAL modules must be mocked by the calling test file before invoking this.
function createTestApp({ injectSession = null } = {}) {
  const securityHeaders = require('../../middlewares/securityHeaders');
  const corsMiddleware = require('../../middlewares/cors');
  const csrfProtection = require('../../middlewares/csrf');
  const xssSanitizer = require('../../middlewares/xssSanitizer');
  const auditMiddleware = require('../../middlewares/audit');
  const { apiLimiter } = require('../../middlewares/rateLimit');
  const routes = require('../../routes');

  const app = express();
  app.set('trust proxy', 1);

  app.use(securityHeaders());
  app.use(corsMiddleware());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  app.use(
    session({
      name: 'itportal.sid',
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000,
      },
    })
  );

  if (injectSession) {
    app.use((req, res, next) => {
      Object.assign(req.session, injectSession);
      next();
    });
  }

  app.use(xssSanitizer);
  app.use(csrfProtection);
  app.use('/api/', apiLimiter);
  app.use(auditMiddleware);
  app.use('/api/v1', routes);

  app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
  });

  app.use((err, req, res, _next) => {
    if (err.message && err.message.includes('CORS')) {
      return res.status(403).json({ success: false, error: 'CORS policy violation' });
    }
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  });

  return app;
}

// Returns a CSRF token by issuing a GET request and reading the set cookie.
// Requires a supertest agent that persists cookies.
async function getCsrfToken(agent) {
  const res = await agent
    .get('/api/v1/health')
    .set('Origin', 'http://localhost:3000');
  const cookies = res.headers['set-cookie'] || [];
  const csrfCookie = cookies.find((c) => c.startsWith('csrf_token='));
  if (!csrfCookie) {
    throw new Error('CSRF cookie not set by server');
  }
  return csrfCookie.split(';')[0].split('=')[1];
}

module.exports = { createTestApp, getCsrfToken };
