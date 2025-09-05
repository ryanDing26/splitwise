/**
 * @fileoverview Winston logger configuration with daily rotation
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const config = require('../config');

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console transport
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    logFormat
  ),
});

// File transport for errors
const errorFileTransport = new DailyRotateFile({
  filename: path.join(config.logging.filePath, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '14d',
  format: jsonFormat,
});

// File transport for combined logs
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(config.logging.filePath, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: jsonFormat,
});

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: { service: 'splitwise-backend' },
  transports: [consoleTransport],
  exceptionHandlers: [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: path.join(config.logging.filePath, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: path.join(config.logging.filePath, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

// Add file transports in production
if (config.env === 'production') {
  logger.add(errorFileTransport);
  logger.add(combinedFileTransport);
}

// Stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Helper methods for structured logging
logger.logRequest = (req, extra = {}) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
    ...extra,
  });
};

logger.logResponse = (req, res, extra = {}) => {
  logger.info('Response sent', {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: extra.responseTime,
    ...extra,
  });
};

logger.logError = (error, req = null, extra = {}) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    code: error.code,
    ...extra,
  };
  
  if (req) {
    errorLog.method = req.method;
    errorLog.url = req.originalUrl;
    errorLog.userId = req.user?.id;
  }
  
  logger.error('Error occurred', errorLog);
};

module.exports = logger;
