const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const routes = require('./routes');
const { notFound, errorHandler, errorConverter } = require('./middleware/error.middleware');
const logger = require('./utils/logger');

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: config.cors?.origin || '*',
  credentials: true,
}));

// Request logging
if (config.env !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) }
  }));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: (config.rateLimit?.windowMinutes || 15) * 60 * 1000,
  max: config.rateLimit?.maxRequests || 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// API routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Splitwise Backend API',
    version: '1.0.0',
    docs: '/api/v1/health',
  });
});

// Error handling
app.use(notFound);
app.use(errorConverter);
app.use(errorHandler);

module.exports = app;
