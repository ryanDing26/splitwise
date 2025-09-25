/**
 * @fileoverview Validation middleware using Joi
 */

const { ValidationError } = require('../utils/errors');
const { validationErrorHandler } = require('./error.middleware');

/**
 * Validate request against Joi schema
 * @param {Object} schema - Object containing schemas for body, query, params
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationErrors = [];
    
    // Validate each part of the request
    ['params', 'query', 'body'].forEach((key) => {
      if (schema[key]) {
        const { error, value } = schema[key].validate(req[key], {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });
        
        if (error) {
          const formattedErrors = validationErrorHandler(error.details);
          validationErrors.push(
            ...formattedErrors.map((e) => ({
              ...e,
              location: key,
            }))
          );
        } else {
          // Replace with validated/converted values
          req[key] = value;
        }
      }
    });
    
    if (validationErrors.length > 0) {
      return next(new ValidationError(validationErrors));
    }
    
    next();
  };
};

/**
 * Validate request body
 * @param {Joi.Schema} schema
 */
const validateBody = (schema) => {
  return validate({ body: schema });
};

/**
 * Validate request query
 * @param {Joi.Schema} schema
 */
const validateQuery = (schema) => {
  return validate({ query: schema });
};

/**
 * Validate request params
 * @param {Joi.Schema} schema
 */
const validateParams = (schema) => {
  return validate({ params: schema });
};

/**
 * Sanitize input - remove potentially dangerous content
 */
const sanitize = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove null bytes
      value = value.replace(/\0/g, '');
      // Trim whitespace
      value = value.trim();
    }
    return value;
  };
  
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeValue);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = sanitizeValue(value);
      }
    }
    return sanitized;
  };
  
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  
  next();
};

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  sanitize,
};
