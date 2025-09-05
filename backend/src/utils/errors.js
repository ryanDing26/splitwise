/**
 * @fileoverview Custom error classes for consistent error handling
 */

const { StatusCodes } = require('http-status-codes');

/**
 * Base API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = [], isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON() {
    return {
      status: this.status,
      statusCode: this.statusCode,
      message: this.message,
      errors: this.errors.length > 0 ? this.errors : undefined,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }
}

/**
 * 400 Bad Request
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad request', errors = []) {
    super(StatusCodes.BAD_REQUEST, message, errors);
    this.name = 'BadRequestError';
  }
}

/**
 * 401 Unauthorized
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized access') {
    super(StatusCodes.UNAUTHORIZED, message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden
 */
class ForbiddenError extends ApiError {
  constructor(message = 'Access forbidden') {
    super(StatusCodes.FORBIDDEN, message);
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found
 */
class NotFoundError extends ApiError {
  constructor(resource = 'Resource', identifier = '') {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(StatusCodes.NOT_FOUND, message);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

/**
 * 409 Conflict
 */
class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(StatusCodes.CONFLICT, message);
    this.name = 'ConflictError';
  }
}

/**
 * 422 Unprocessable Entity (Validation Error)
 */
class ValidationError extends ApiError {
  constructor(errors = [], message = 'Validation failed') {
    super(StatusCodes.UNPROCESSABLE_ENTITY, message, errors);
    this.name = 'ValidationError';
  }
}

/**
 * 429 Too Many Requests
 */
class TooManyRequestsError extends ApiError {
  constructor(message = 'Too many requests, please try again later', retryAfter = 60) {
    super(StatusCodes.TOO_MANY_REQUESTS, message);
    this.name = 'TooManyRequestsError';
    this.retryAfter = retryAfter;
  }
}

/**
 * 500 Internal Server Error
 */
class InternalServerError extends ApiError {
  constructor(message = 'Internal server error') {
    super(StatusCodes.INTERNAL_SERVER_ERROR, message, [], false);
    this.name = 'InternalServerError';
  }
}

/**
 * 503 Service Unavailable
 */
class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service temporarily unavailable') {
    super(StatusCodes.SERVICE_UNAVAILABLE, message);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * OCR Processing Error
 */
class OCRError extends ApiError {
  constructor(message = 'Failed to process receipt image') {
    super(StatusCodes.UNPROCESSABLE_ENTITY, message);
    this.name = 'OCRError';
  }
}

/**
 * Payment Error
 */
class PaymentError extends ApiError {
  constructor(message = 'Payment processing failed') {
    super(StatusCodes.PAYMENT_REQUIRED, message);
    this.name = 'PaymentError';
  }
}

/**
 * Database Error Handler
 * Converts MongoDB/Mongoose errors to API errors
 */
const handleDatabaseError = (error) => {
  // Duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return new ConflictError(`${field} already exists`);
  }
  
  // Validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
    }));
    return new ValidationError(errors);
  }
  
  // Cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return new BadRequestError(`Invalid ${error.path}: ${error.value}`);
  }
  
  return new InternalServerError('Database operation failed');
};

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  OCRError,
  PaymentError,
  handleDatabaseError,
};
