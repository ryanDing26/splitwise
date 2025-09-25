/**
 * @fileoverview Global error handling middleware
 */

const { StatusCodes } = require('http-status-codes');
const { ApiError, handleDatabaseError } = require('../utils/errors');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Handle 404 Not Found
 */
const notFound = (req, res, next) => {
  const error = new ApiError(
    StatusCodes.NOT_FOUND,
    `Route ${req.originalUrl} not found`
  );
  next(error);
};

/**
 * Convert non-ApiError to ApiError
 */
const errorConverter = (err, req, res, next) => {
  let error = err;
  
  if (!(error instanceof ApiError)) {
    // MongoDB/Mongoose errors
    if (error.name === 'ValidationError' || 
        error.name === 'CastError' || 
        error.code === 11000) {
      error = handleDatabaseError(error);
    }
    // JWT errors
    else if (error.name === 'JsonWebTokenError') {
      error = new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token');
    }
    else if (error.name === 'TokenExpiredError') {
      error = new ApiError(StatusCodes.UNAUTHORIZED, 'Token expired');
    }
    // Multer errors
    else if (error.code === 'LIMIT_FILE_SIZE') {
      error = new ApiError(StatusCodes.BAD_REQUEST, 'File too large');
    }
    else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      error = new ApiError(StatusCodes.BAD_REQUEST, 'Unexpected file field');
    }
    // Generic error
    else {
      const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
      const message = error.message || 'Internal server error';
      error = new ApiError(statusCode, message, [], false);
    }
  }
  
  next(error);
};

/**
 * Main error handler
 */
const errorHandler = (err, req, res, next) => {
  const { statusCode, message, errors, stack, isOperational } = err;
  
  // Log error
  if (!isOperational) {
    logger.error('Unhandled Error:', {
      message,
      stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
    });
  } else if (statusCode >= 500) {
    logger.error('Server Error:', {
      message,
      stack,
      url: req.originalUrl,
    });
  } else {
    logger.warn('Client Error:', {
      message,
      url: req.originalUrl,
      statusCode,
    });
  }
  
  // Response object
  const response = {
    success: false,
    message: isOperational ? message : 'Internal server error',
  };
  
  // Add errors array if present
  if (errors && errors.length > 0) {
    response.errors = errors;
  }
  
  // Add stack trace in development
  if (config.env === 'development') {
    response.stack = stack;
  }
  
  // Add request ID if available
  if (req.id) {
    response.requestId = req.id;
  }
  
  res.status(statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json(response);
};

/**
 * Async handler wrapper to catch async errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error handler
 */
const validationErrorHandler = (errors) => {
  return errors.map((error) => ({
    field: error.path?.join('.') || error.context?.key || 'unknown',
    message: error.message,
    value: error.context?.value,
  }));
};

module.exports = {
  notFound,
  errorConverter,
  errorHandler,
  asyncHandler,
  validationErrorHandler,
};
