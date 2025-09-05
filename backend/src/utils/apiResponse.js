/**
 * @fileoverview Standardized API response utilities
 */

const { StatusCodes } = require('http-status-codes');

/**
 * Success response wrapper
 */
class ApiResponse {
  /**
   * Send success response
   * @param {Object} res - Express response object
   * @param {Object} options - Response options
   */
  static success(res, options = {}) {
    const {
      statusCode = StatusCodes.OK,
      message = 'Success',
      data = null,
      meta = null,
    } = options;
    
    const response = {
      success: true,
      message,
    };
    
    if (data !== null) {
      response.data = data;
    }
    
    if (meta !== null) {
      response.meta = meta;
    }
    
    return res.status(statusCode).json(response);
  }
  
  /**
   * Send created response (201)
   */
  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, {
      statusCode: StatusCodes.CREATED,
      message,
      data,
    });
  }
  
  /**
   * Send no content response (204)
   */
  static noContent(res) {
    return res.status(StatusCodes.NO_CONTENT).send();
  }
  
  /**
   * Send paginated response
   */
  static paginated(res, data, pagination, message = 'Success') {
    return this.success(res, {
      message,
      data,
      meta: { pagination },
    });
  }
  
  /**
   * Send error response
   */
  static error(res, options = {}) {
    const {
      statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
      message = 'An error occurred',
      errors = [],
      stack = null,
    } = options;
    
    const response = {
      success: false,
      message,
    };
    
    if (errors.length > 0) {
      response.errors = errors;
    }
    
    // Include stack trace in development
    if (process.env.NODE_ENV === 'development' && stack) {
      response.stack = stack;
    }
    
    return res.status(statusCode).json(response);
  }
  
  /**
   * Send bad request error (400)
   */
  static badRequest(res, message = 'Bad request', errors = []) {
    return this.error(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      message,
      errors,
    });
  }
  
  /**
   * Send unauthorized error (401)
   */
  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, {
      statusCode: StatusCodes.UNAUTHORIZED,
      message,
    });
  }
  
  /**
   * Send forbidden error (403)
   */
  static forbidden(res, message = 'Access forbidden') {
    return this.error(res, {
      statusCode: StatusCodes.FORBIDDEN,
      message,
    });
  }
  
  /**
   * Send not found error (404)
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, {
      statusCode: StatusCodes.NOT_FOUND,
      message,
    });
  }
  
  /**
   * Send conflict error (409)
   */
  static conflict(res, message = 'Resource already exists') {
    return this.error(res, {
      statusCode: StatusCodes.CONFLICT,
      message,
    });
  }
  
  /**
   * Send validation error (422)
   */
  static validationError(res, errors, message = 'Validation failed') {
    return this.error(res, {
      statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
      message,
      errors,
    });
  }
  
  /**
   * Send too many requests error (429)
   */
  static tooManyRequests(res, message = 'Too many requests', retryAfter = 60) {
    res.set('Retry-After', retryAfter);
    return this.error(res, {
      statusCode: StatusCodes.TOO_MANY_REQUESTS,
      message,
    });
  }
  
  /**
   * Send internal server error (500)
   */
  static internalError(res, message = 'Internal server error', stack = null) {
    return this.error(res, {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message,
      stack,
    });
  }
}

module.exports = ApiResponse;
