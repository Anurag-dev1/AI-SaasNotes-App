const Redis = require('ioredis');
const env = require('./env');
const logger = require('./logger');

const cacheClient = new Redis(env.REDIS_CACHE_URL, { db: 0, keyPrefix: 'cache:', lazyConnect: false, enableOfflineQueue: false });
const rateLimitClient = new Redis(env.REDIS_CACHE_URL, { db: 1, lazyConnect: false, enableOfflineQueue: false });
const blocklistClient = new Redis(env.REDIS_DURABLE_URL, { db: 0, keyPrefix: 'blocklist:', lazyConnect: false, enableOfflineQueue: false });
const queueClient = new Redis(env.REDIS_DURABLE_URL, { db: 1, maxRetriesPerRequest: null, lazyConnect: false, enableOfflineQueue: false });
const quotaClient = new Redis(env.REDIS_DURABLE_URL, { db: 2, keyPrefix: 'quota:', lazyConnect: false, enableOfflineQueue: false });

const clients = [
  { name: 'cacheClient', client: cacheClient },
  { name: 'rateLimitClient', client: rateLimitClient },
  { name: 'blocklistClient', client: blocklistClient },
  { name: 'queueClient', client: queueClient },
  { name: 'quotaClient', client: quotaClient }
];

clients.forEach(({ name, client }) => {
  client.on('connect', () => logger.info(`Redis client ${name} connected`));
  
  // We silence the repetitive connection refused errors so they don't spam the deployment logs
  // and hide the actual fatal errors (like MongoDB connection failures).
  client.on('error', (err) => {
    if (err.code !== 'ECONNREFUSED') {
      logger.error(`Redis client ${name} error:`, err);
    }
  });
});

async function closeAllRedis() {
  logger.info('Closing all Redis connections...');
  const closePromises = clients.map(({ client }) => client.quit());
  await Promise.allSettled(closePromises);
  logger.info('All Redis connections closed.');
}

module.exports = {
  cacheClient,
  rateLimitClient,
  blocklistClient,
  queueClient,
  quotaClient,
  closeAllRedis
};
