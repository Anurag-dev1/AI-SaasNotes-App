const jwt = require('jsonwebtoken');
const { blocklistClient } = require('../config/redis');
const env = require('../config/env');
const logger = require('../config/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (decoded.jti) {
      try {
        if (blocklistClient.status !== 'ready') {
          logger.warn('Redis blocklist unavailable, failing open for auth check');
        } else {
          // Check jti blocklist, user deactivation, and role changes in one pipeline
          const results = await blocklistClient.mget(
            decoded.jti, 
            `user-deactivated:${decoded.id}`, 
            `role-changed:${decoded.id}`
          );
          
          if (results[0] !== null || results[1] !== null) {
            return res.status(401).json({ error: 'Authentication required or session revoked' });
          }

          const roleChangedTimestamp = results[2];
          if (roleChangedTimestamp && (decoded.iat * 1000) < Number(roleChangedTimestamp)) {
            return res.status(401).json({ error: 'Role updated. Please log in again.' });
          }
        }
      } catch (err) {
        logger.error(`Redis blocklist check failed: ${err.message}`);
        // fail open for local dev without redis
      }
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId,
      jti: decoded.jti,
      exp: decoded.exp,
    };
    req.tenantId = decoded.tenantId;

    next();
  } catch (err) {
    logger.error(`Authentication error: ${err.message}`);
    return res.status(401).json({ error: 'Authentication required' });
  }
};

module.exports = { authenticate };
