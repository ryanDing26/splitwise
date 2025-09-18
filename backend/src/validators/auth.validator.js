/**
 * @fileoverview Authentication validation schemas
 */

const Joi = require('joi');
const { PHONE } = require('../config/constants');

// Phone number validation
const phoneNumber = Joi.string()
  .pattern(/^\+?[1-9]\d{9,14}$/)
  .min(PHONE.MIN_LENGTH)
  .max(PHONE.MAX_LENGTH)
  .required()
  .messages({
    'string.pattern.base': 'Please provide a valid phone number',
    'string.min': 'Phone number must be at least {{#limit}} digits',
    'string.max': 'Phone number cannot exceed {{#limit}} digits',
  });

// OTP validation
const otpCode = Joi.string()
  .length(6)
  .pattern(/^\d+$/)
  .required()
  .messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must contain only digits',
  });

// Request OTP schema
const requestOTP = Joi.object({
  phoneNumber: phoneNumber,
  countryCode: Joi.string()
    .pattern(/^\+\d{1,3}$/)
    .default('+1')
    .messages({
      'string.pattern.base': 'Invalid country code format',
    }),
  purpose: Joi.string()
    .valid('login', 'verify', 'reset', 'change_phone')
    .default('login'),
});

// Verify OTP schema
const verifyOTP = Joi.object({
  phoneNumber: phoneNumber,
  code: otpCode,
  purpose: Joi.string()
    .valid('login', 'verify', 'reset', 'change_phone')
    .default('login'),
});

// Refresh token schema
const refreshToken = Joi.object({
  refreshToken: Joi.string().required().messages({
    'string.empty': 'Refresh token is required',
  }),
});

// Register schema
const register = Joi.object({
  phoneNumber: phoneNumber,
  countryCode: Joi.string().pattern(/^\+\d{1,3}$/).default('+1'),
  name: Joi.string().max(100).optional(),
  email: Joi.string().email().optional(),
});

// Login with password schema (alternative login)
const loginWithPassword = Joi.object({
  phoneNumber: phoneNumber,
  password: Joi.string().min(8).required(),
});

// Set password schema
const setPassword = Joi.object({
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, and number',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
    }),
});

// Change password schema
const changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, and number',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
    }),
});

module.exports = {
  requestOTP,
  verifyOTP,
  refreshToken,
  register,
  loginWithPassword,
  setPassword,
  changePassword,
};
