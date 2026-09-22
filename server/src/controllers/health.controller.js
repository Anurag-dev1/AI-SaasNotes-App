const mongoose = require('mongoose');
const { cacheClient, blocklistClient, queueClient } = require('../config/redis');
const env = require('../config/env');

const crypto = require('crypto');

exports.liveness = (req, res) => {
  res.status(200).json({ status: 'ok' });
};

exports.detail = async (req, res) => {
  const probeSecret = req.headers['x-probe-secret'];
  
  if (!probeSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const expectedBuffer = Buffer.from(env.PROBE_SECRET);
  const providedBuffer = Buffer.from(probeSecret);
  
  if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dependencies = {
    mongodb: mongoose.connection.readyState === 1 ? 'up' : 'down',
    redis_cache: 'down',
    redis_durable: 'down',
    worker_heartbeat: 'down',
    last_worker_ping: null
  };

  try {
    if (await cacheClient.ping() === 'PONG') dependencies.redis_cache = 'up';
  } catch (e) {}

  try {
    // Durable redis represents blocklist, quota, and queue
    const { quotaClient } = require('../config/redis');
    if (await blocklistClient.ping() === 'PONG' && await quotaClient.ping() === 'PONG') {
      dependencies.redis_durable = 'up';
    }
  } catch (e) {}

  try {
    const workerHeartbeat = await queueClient.get('worker:heartbeat');
    if (workerHeartbeat) {
      dependencies.last_worker_ping = workerHeartbeat;
      const hbTime = new Date(workerHeartbeat).getTime();
      if (Date.now() - hbTime < 60000) { // 60s
        dependencies.worker_heartbeat = 'up';
      }
    }
  } catch (e) {}

  const overall = (dependencies.mongodb === 'up' && dependencies.redis_cache === 'up' && dependencies.redis_durable === 'up') ? 'ok' : 'error';
  
  res.status(overall === 'ok' ? 200 : 503).json({
    status: overall,
    dependencies
  });
};
