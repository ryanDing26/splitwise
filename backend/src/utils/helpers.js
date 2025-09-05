/**
 * @fileoverview General helper utility functions
 */

const crypto = require('crypto');
const { nanoid } = require('nanoid');
const { PAGINATION } = require('../config/constants');

/**
 * Generate random OTP
 * @param {number} length - OTP length
 * @returns {string}
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
};

/**
 * Generate unique identifier
 * @param {number} size - ID length
 * @returns {string}
 */
const generateId = (size = 12) => {
  return nanoid(size);
};

/**
 * Generate secure random token
 * @param {number} bytes - Number of bytes
 * @returns {string}
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash string using SHA256
 * @param {string} str
 * @returns {string}
 */
const hashString = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

/**
 * Format phone number to E.164 format
 * @param {string} phone
 * @param {string} countryCode
 * @returns {string}
 */
const formatPhoneNumber = (phone, countryCode = '+1') => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code if not present
  if (!phone.startsWith('+')) {
    return `${countryCode}${cleaned}`;
  }
  
  return `+${cleaned}`;
};

/**
 * Parse pagination parameters
 * @param {Object} query - Request query object
 * @returns {Object}
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

/**
 * Create pagination metadata
 * @param {number} total - Total documents
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object}
 */
const createPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Parse sort parameters
 * @param {string} sortString - Sort string (e.g., '-createdAt,name')
 * @param {Array<string>} allowedFields - Allowed sort fields
 * @returns {Object}
 */
const parseSort = (sortString, allowedFields = []) => {
  if (!sortString) {
    return { createdAt: -1 }; // Default sort
  }
  
  const sortFields = sortString.split(',');
  const sortObject = {};
  
  for (const field of sortFields) {
    const isDescending = field.startsWith('-');
    const fieldName = isDescending ? field.slice(1) : field;
    
    if (allowedFields.length === 0 || allowedFields.includes(fieldName)) {
      sortObject[fieldName] = isDescending ? -1 : 1;
    }
  }
  
  return Object.keys(sortObject).length > 0 ? sortObject : { createdAt: -1 };
};

/**
 * Parse filter parameters
 * @param {Object} query - Query object
 * @param {Array<string>} allowedFields - Allowed filter fields
 * @returns {Object}
 */
const parseFilters = (query, allowedFields = []) => {
  const filters = {};
  const operators = ['gt', 'gte', 'lt', 'lte', 'ne', 'in', 'nin'];
  
  for (const [key, value] of Object.entries(query)) {
    // Skip pagination and sort params
    if (['page', 'limit', 'sort', 'fields', 'search'].includes(key)) {
      continue;
    }
    
    // Check if field is allowed
    const baseField = key.split('[')[0];
    if (allowedFields.length > 0 && !allowedFields.includes(baseField)) {
      continue;
    }
    
    // Handle operators
    const operatorMatch = key.match(/\[(\w+)\]$/);
    if (operatorMatch) {
      const operator = operatorMatch[1];
      const field = key.replace(`[${operator}]`, '');
      
      if (operators.includes(operator)) {
        filters[field] = filters[field] || {};
        filters[field][`$${operator}`] = parseValue(value);
      }
    } else {
      filters[key] = parseValue(value);
    }
  }
  
  return filters;
};

/**
 * Parse value to appropriate type
 * @param {string} value
 * @returns {any}
 */
const parseValue = (value) => {
  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // Number
  if (!isNaN(value) && value !== '') {
    return Number(value);
  }
  
  // Array
  if (value.includes(',')) {
    return value.split(',').map(parseValue);
  }
  
  return value;
};

/**
 * Calculate percentage
 * @param {number} value
 * @param {number} total
 * @param {number} decimals
 * @returns {number}
 */
const calculatePercentage = (value, total, decimals = 2) => {
  if (total === 0) return 0;
  return Number(((value / total) * 100).toFixed(decimals));
};

/**
 * Round to decimal places
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 */
const roundToDecimals = (value, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/**
 * Calculate equal split with remainder handling
 * @param {number} total - Total amount
 * @param {number} count - Number of splits
 * @returns {Array<number>}
 */
const calculateEqualSplit = (total, count) => {
  if (count === 0) return [];
  
  const baseAmount = Math.floor((total * 100) / count) / 100;
  const remainder = roundToDecimals(total - (baseAmount * count));
  
  const splits = Array(count).fill(baseAmount);
  
  // Add remainder to first person
  if (remainder > 0) {
    splits[0] = roundToDecimals(splits[0] + remainder);
  }
  
  return splits;
};

/**
 * Deep clone object
 * @param {Object} obj
 * @returns {Object}
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Pick specific keys from object
 * @param {Object} obj
 * @param {Array<string>} keys
 * @returns {Object}
 */
const pick = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
};

/**
 * Omit specific keys from object
 * @param {Object} obj
 * @param {Array<string>} keys
 * @returns {Object}
 */
const omit = (obj, keys) => {
  return Object.keys(obj).reduce((acc, key) => {
    if (!keys.includes(key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries
 * @param {number} baseDelay
 * @returns {Promise<any>}
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
};

/**
 * Mask phone number for privacy
 * @param {string} phone
 * @returns {string}
 */
const maskPhoneNumber = (phone) => {
  if (!phone || phone.length < 4) return phone;
  const lastFour = phone.slice(-4);
  return `***-***-${lastFour}`;
};

/**
 * Check if value is empty
 * @param {any} value
 * @returns {boolean}
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

module.exports = {
  generateOTP,
  generateId,
  generateSecureToken,
  hashString,
  formatPhoneNumber,
  parsePagination,
  createPaginationMeta,
  parseSort,
  parseFilters,
  parseValue,
  calculatePercentage,
  roundToDecimals,
  calculateEqualSplit,
  deepClone,
  pick,
  omit,
  sleep,
  retryWithBackoff,
  maskPhoneNumber,
  isEmpty,
};
