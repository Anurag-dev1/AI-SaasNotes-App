const { rateLimitClient } = require('../config/redis');
const logger = require('../config/logger');

const createRateLimiter = ({ type, getIdentifier, limit, windowSeconds }) => {
  return async (req, res, next) => {
    if (rateLimitClient.status !== 'ready') {
      logger.warn(`rateLimitClient unavailable — failing open for ${type}`);
      return next();
    }

    try {
      const identifier = getIdentifier(req);
      if (!identifier) {
        return next();
      }

      const key = `ratelimit:${type}:${identifier}`;
      const now = Date.now();
      const windowStart = now - windowSeconds * 1000;
      const member = `${now}-${Math.random().toString(36).substring(2)}`;

      await rateLimitClient.zadd(key, now, member);
      await rateLimitClient.zremrangebyscore(key, '-inf', windowStart);
      const count = await rateLimitClient.zcard(key);
      await rateLimitClient.expire(key, windowSeconds);

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowSeconds * 1000) / 1000));

      if (count > limit) {
        res.setHeader('Retry-After', windowSeconds);
        return res.status(429).json({ error: 'Too many requests, please try again later.' });
      }

      next();
    } catch (err) {
      logger.error(`Rate limiting error: ${err.message}`);
      // fail open on error
      next();
    }
  };
};

const authRateLimit = createRateLimiter({
  type: 'auth',
  getIdentifier: (req) => req.ip,
  limit: 10,
  windowSeconds: 60,
});

const apiRateLimit = createRateLimiter({
  type: 'api',
  getIdentifier: (req) => req.user?.id,
  limit: 120,
  windowSeconds: 60,
});

const aiRateLimit = createRateLimiter({
  type: 'ai',
  getIdentifier: (req) => req.user?.id,
  limit: 10,
  windowSeconds: 60,
});

module.exports = { authRateLimit, apiRateLimit, aiRateLimit };
