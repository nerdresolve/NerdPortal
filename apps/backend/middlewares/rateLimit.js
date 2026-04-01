const rateLimit = require("express-rate-limit");

// Strict limiter for authentication endpoints to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
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

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
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
