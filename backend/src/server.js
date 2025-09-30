require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const database = require('./config/database');
const routes = require('./routes');
const { notFound, errorConverter, errorHandler } = require('./middleware/error.middleware');
const logger = require('./utils/logger');

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors?.origin || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit?.maxRequests || 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (config.env !== 'test') {
  app.use(morgan('combined', { stream: logger.stream }));
}

// API routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    name: 'Splitwise API',
    version: '1.0.0',
    docs: '/api/v1/health'
  });
});

// Error handling
app.use(notFound);
app.use(errorConverter);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await database.connect();
    logger.info('Database connected');

    // Start listening
    const PORT = config.port || 3000;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.env} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

startServer();

module.exports = app;
