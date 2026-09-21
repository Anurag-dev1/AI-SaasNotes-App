const { quotaClient } = require('../config/redis');
const env = require('../config/env');
const logger = require('../config/logger');

exports.checkAndIncrement = async (tenantId) => {
  try {
    const currentHourBucket = Math.floor(Date.now() / 3600000);
    const key = `tenant:${tenantId}:hour:${currentHourBucket}`;
    const limit = env.AI_TENANT_HOURLY_QUOTA || 100;

    const count = await quotaClient.incr(key);
    
    if (count === 1) {
      await quotaClient.expire(key, 3600);
    }

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      limit
    };
  } catch (err) {
    logger.error(`Quota check error: ${err.message}`);
    // Fail open if Redis is down
    return { allowed: true, remaining: 1, limit: env.AI_TENANT_HOURLY_QUOTA || 100 };
  }
};

exports.getRemainingQuota = async (tenantId) => {
  try {
    const currentHourBucket = Math.floor(Date.now() / 3600000);
    const key = `tenant:${tenantId}:hour:${currentHourBucket}`;
    const limit = env.AI_TENANT_HOURLY_QUOTA || 100;
    
    let count = await quotaClient.get(key);
    count = count ? parseInt(count, 10) : 0;
    
    return {
      count,
      remaining: Math.max(0, limit - count),
      limit
    };
  } catch (err) {
    logger.error(`Quota check error: ${err.message}`);
    return { count: 0, remaining: env.AI_TENANT_HOURLY_QUOTA || 100, limit: env.AI_TENANT_HOURLY_QUOTA || 100 };
  }
};
