require('dotenv').config({ path: '../.env' });
const env = require('../server/src/config/env');
// Assuming database connection is established through mongoose in the database config file
require('../server/src/config/database'); 
const { startWorker, stopWorker } = require('../server/src/workers/ai.worker');
const logger = require('../server/src/config/logger');
const { queueClient, cacheClient, blocklistClient, quotaClient } = require('../server/src/config/redis');
const mongoose = require('mongoose');

async function init() {
  try {
    startWorker();
    logger.info('Worker process started');
  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
}

init();

async function shutdown() {
  logger.info('Shutting down worker process...');
  await stopWorker();
  
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  
  queueClient.quit();
  cacheClient.quit();
  blocklistClient.quit();
  quotaClient.quit();
  
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
