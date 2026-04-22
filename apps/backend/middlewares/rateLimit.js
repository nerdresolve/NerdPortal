const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many login attempts. Try again in 15 minutes.",
  },
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
});

const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many password reset requests. Try again in 15 minutes.",
  },
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
});

const passwordResetVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many password reset verification attempts. Try again in 15 minutes.",
  },
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Rate limit exceeded. Try again shortly.",
  },
});

module.exports = {
  authLimiter,
  passwordResetRequestLimiter,
  passwordResetVerifyLimiter,
  apiLimiter,
};
