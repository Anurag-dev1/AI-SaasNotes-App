const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

const MAX_RETRIES = 3;
const RETRY_INTERVAL_MS = 5000;

async function connectDatabase(retries = MAX_RETRIES) {
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  while (retries > 0) {
    try {
      await mongoose.connect(env.MONGODB_URI);
      return;
    } catch (err) {
      retries -= 1;
      logger.error(`Failed to connect to MongoDB. Retries left: ${retries}`, err);
      if (retries === 0) {
        throw new Error('Could not connect to MongoDB after multiple retries.');
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
    }
  }
}

module.exports = { connectDatabase };
