const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and API abuse
 */

// General API rate limiter
// In development we relax the limits to avoid blocking local development
const defaultWindowMs = 15 * 60 * 1000; // 15 minutes
let defaultMax = 100; // default production-ish limit
if (process.env.NODE_ENV === 'development') {
  // allow a much higher limit in dev to avoid accidental 429 spam during local testing
  defaultMax = 2000;
}
// Allow override via environment variable for CI or advanced setups
if (process.env.API_RATE_LIMIT_MAX) {
  const parsed = parseInt(process.env.API_RATE_LIMIT_MAX, 10);
  if (!Number.isNaN(parsed) && parsed > 0) defaultMax = parsed;
}

const apiLimiter = rateLimit({
  windowMs: defaultWindowMs,
  max: defaultMax,
  message: {
    success: false,
    message: 'Too many requests, please try again after some time'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict limiter for auth endpoints (login, signup, forgot password)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful requests
});

// Strict limiter for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Limiter for order creation
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 orders per hour
  message: {
    success: false,
    message: 'Too many orders placed, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Limiter for reviews
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 reviews per hour
  message: {
    success: false,
    message: 'Too many reviews submitted, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Limiter for search/heavy queries
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: {
    success: false,
    message: 'Too many search requests, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Create account limiter (stricter)
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 account creations per hour per IP
  message: {
    success: false,
    message: 'Too many accounts created from this IP, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  orderLimiter,
  reviewLimiter,
  searchLimiter,
  createAccountLimiter
};
