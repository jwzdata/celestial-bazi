// Simple in-memory rate limiter for Vercel Serverless Functions
// Note: In serverless, each function instance has its own memory,
// so this is per-instance. For production, use Upstash Redis or Vercel KV.

const rateLimitStore = {};

/**
 * Rate limiter middleware
 * @param {object} req - Vercel request object
 * @param {object} options - { windowMs: 60000, max: 10 }
 * @returns {{ success: boolean, remaining: number, resetMs: number }}
 */
function rateLimit(req, options = {}) {
  const { windowMs = 60000, max = 10 } = options;

  // Get IP (Vercel provides x-forwarded-for or x-real-ip)
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || 'unknown';

  const now = Date.now();
  const key = `${ip}:${Math.floor(now / windowMs)}`;

  if (!rateLimitStore[key]) {
    rateLimitStore[key] = { count: 0, resetAt: now + windowMs };
  }

  // Cleanup old entries (keep store lean)
  if (rateLimitStore[key].resetAt < now) {
    delete rateLimitStore[key];
    rateLimitStore[key] = { count: 0, resetAt: now + windowMs };
  }

  rateLimitStore[key].count++;
  const remaining = Math.max(0, max - rateLimitStore[key].count);

  return {
    success: rateLimitStore[key].count <= max,
    remaining,
    resetMs: rateLimitStore[key].resetAt - now
  };
}

module.exports = { rateLimit };
