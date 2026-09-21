require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const env = require('./src/config/env');
const { connectDatabase } = require('./src/config/database');
const { closeAllRedis } = require('./src/config/redis');
const logger = require('./src/config/logger');
const app = require('./src/app');

let server;

async function startServer() {
  try {
    await connectDatabase();
    
    server = app.listen(env.PORT, () => {
      logger.info(`Server started in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('Shutting down gracefully...');
  
  if (server) {
    server.close((err) => {
      if (err) logger.error('Error closing HTTP server', err);
      else logger.info('HTTP server closed');
    });
  }
  
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  }
  
  await closeAllRedis();
  
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();
