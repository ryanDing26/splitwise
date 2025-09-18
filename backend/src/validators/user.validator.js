/**
 * @fileoverview User validation schemas
 */

const Joi = require('joi');

// MongoDB ObjectId validation
const objectId = Joi.string()
  .pattern(/^[a-fA-F0-9]{24}$/)
  .messages({
    'string.pattern.base': 'Invalid ID format',
  });

// Update profile schema
const updateProfile = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .messages({
      'string.max': 'Name cannot exceed 100 characters',
    }),
  
  email: Joi.string()
    .email()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
  
  avatar: Joi.string().uri().allow(null, ''),
});

// Update preferences schema
const updatePreferences = Joi.object({
  currency: Joi.string().length(3).uppercase(),
  
  notifications: Joi.object({
    sms: Joi.boolean(),
    push: Joi.boolean(),
    email: Joi.boolean(),
  }),
  
  language: Joi.string().length(2).lowercase(),
}).min(1);

// Add push token schema
const addPushToken = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Push token is required',
  }),
  
  platform: Joi.string()
    .valid('ios', 'android', 'web')
    .required()
    .messages({
      'any.only': 'Platform must be ios, android, or web',
    }),
});

// Remove push token schema
const removePushToken = Joi.object({
  token: Joi.string().required(),
});

// Change phone number schema
const changePhoneNumber = Joi.object({
  newPhoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{9,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
  
  countryCode: Joi.string()
    .pattern(/^\+\d{1,3}$/)
    .default('+1'),
});

// User search schema
const searchUsers = Joi.object({
  query: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': 'Search query must be at least 3 characters',
    }),
  
  limit: Joi.number().integer().min(1).max(20).default(10),
});

// User ID param schema
const userIdParam = Joi.object({
  userId: objectId.required(),
});

// Block user schema
const blockUser = Joi.object({
  userId: objectId.required(),
  reason: Joi.string().max(500),
});

// Report user schema
const reportUser = Joi.object({
  userId: objectId.required(),
  reason: Joi.string()
    .valid('spam', 'harassment', 'fraud', 'inappropriate', 'other')
    .required(),
  description: Joi.string().max(1000),
});

// Deactivate account schema
const deactivateAccount = Joi.object({
  reason: Joi.string().max(500),
  feedback: Joi.string().max(1000),
});

module.exports = {
  updateProfile,
  updatePreferences,
  addPushToken,
  removePushToken,
  changePhoneNumber,
  searchUsers,
  userIdParam,
  blockUser,
  reportUser,
  deactivateAccount,
};
