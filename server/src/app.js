const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const logger = require('./config/logger');

const app = express();

app.use(helmet());

const corsOptions = {
  origin: env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Mount routes (Assuming routes file exists or will be created)
try {
  const routes = require('./routes');
  app.use('/api/v1', routes);
} catch (err) {
  logger.warn('Routes module not found, skipping route mounting');
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler (Assuming middleware exists or will be created)
try {
  const errorHandler = require('./middleware/error-handler');
  app.use(errorHandler);
} catch (err) {
  logger.warn('Error handler middleware not found, using default');
  app.use((err, req, res, next) => {
    logger.error('Unhandled error', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });
}

module.exports = app;
