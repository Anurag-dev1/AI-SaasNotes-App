const { cacheClient, rateLimitClient, blocklistClient, queueClient, quotaClient } = require('../config/redis');
const logger = require('../config/logger');

function checkRedis(client, clientName, failBehavior) {
  return (req, res, next) => {
    if (client.status === 'ready') return next();
    
    if (failBehavior === 'open') {
      logger.warn(`${clientName} unavailable — failing open`);
      req[`${clientName}Available`] = false;
      return next();
    }
    
    // fail-closed
    logger.error(`${clientName} unavailable — failing closed (503)`);
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  };
}

const checkCache = checkRedis(cacheClient, 'cacheClient', 'open');
const checkRateLimit = checkRedis(rateLimitClient, 'rateLimitClient', 'open');
const checkBlocklist = checkRedis(blocklistClient, 'blocklistClient', 'closed');
const checkQueue = checkRedis(queueClient, 'queueClient', 'closed');
const checkQuota = checkRedis(quotaClient, 'quotaClient', 'closed');

module.exports = {
  checkRedis,
  checkCache,
  checkRateLimit,
  checkBlocklist,
  checkQueue,
  checkQuota,
};
