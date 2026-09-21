const mongoose = require('mongoose');
const { cacheClient, blocklistClient, queueClient } = require('../config/redis');
const env = require('../config/env');

exports.liveness = (req, res) => {
  res.status(200).json({ status: 'ok' });
};

exports.detail = async (req, res) => {
  const probeSecret = req.headers['x-probe-secret'];
  if (!probeSecret || probeSecret !== env.PROBE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const status = {
    mongodb: mongoose.connection.readyState === 1 ? 'up' : 'down',
    cache: 'down',
    blocklist: 'down',
    worker: 'down'
  };

  try {
    if (await cacheClient.ping() === 'PONG') status.cache = 'up';
  } catch (e) {}

  try {
    if (await blocklistClient.ping() === 'PONG') status.blocklist = 'up';
  } catch (e) {}

  try {
    const workerHeartbeat = await queueClient.get('worker:heartbeat');
    if (workerHeartbeat) {
      const hbTime = new Date(workerHeartbeat).getTime();
      if (Date.now() - hbTime < 60000) { // 60s
        status.worker = 'up';
      }
    }
  } catch (e) {}

  const overall = Object.values(status).every(s => s === 'up') ? 'ok' : 'error';
  
  res.status(overall === 'ok' ? 200 : 503).json({
    status: overall,
    services: status
  });
};
