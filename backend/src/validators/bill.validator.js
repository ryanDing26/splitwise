/**
 * @fileoverview Bill validation schemas
 */

const Joi = require('joi');
const { 
  BILL_STATUS, 
  SPLIT_METHOD, 
  TAX_TYPES,
  EXPENSE_CATEGORIES,
} = require('../config/constants');

// MongoDB ObjectId validation
const objectId = Joi.string()
  .pattern(/^[a-fA-F0-9]{24}$/)
  .messages({
    'string.pattern.base': 'Invalid ID format',
  });

// Phone number for participants
const phoneNumber = Joi.string()
  .pattern(/^\+?[1-9]\d{9,14}$/)
  .messages({
    'string.pattern.base': 'Invalid phone number format',
  });

// Participant schema
const participantSchema = Joi.object({
  user: objectId,
  phoneNumber: phoneNumber,
  name: Joi.string().max(100),
  shares: Joi.number().min(0).default(1),
  percentage: Joi.number().min(0).max(100),
  fixedAmount: Joi.number().min(0),
}).or('user', 'phoneNumber');

// Tax/Tip schema
const taxTipSchema = Joi.object({
  type: Joi.string().valid(...Object.values(TAX_TYPES)).default('percentage'),
  value: Joi.number().min(0).required(),
  splitMethod: Joi.string().valid('proportional', 'equal').default('proportional'),
});

// Fee schema
const feeSchema = Joi.object({
  name: Joi.string().max(100).required(),
  type: Joi.string().valid(...Object.values(TAX_TYPES)).default('fixed'),
  value: Joi.number().min(0).required(),
});

// Discount schema
const discountSchema = Joi.object({
  name: Joi.string().max(100).required(),
  type: Joi.string().valid(...Object.values(TAX_TYPES)).default('fixed'),
  value: Joi.number().min(0).required(),
});

// Create bill schema
const createBill = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Bill title is required',
      'string.max': 'Title cannot exceed 200 characters',
    }),
  
  description: Joi.string().max(1000).allow(''),
  
  splitMethod: Joi.string()
    .valid(...Object.values(SPLIT_METHOD))
    .default('by_item'),
  
  currency: Joi.string()
    .length(3)
    .uppercase()
    .default('USD'),
  
  merchant: Joi.object({
    name: Joi.string().max(200),
    address: Joi.string().max(500),
    phone: Joi.string().max(20),
    category: Joi.string().max(50),
  }),
  
  expenseDate: Joi.date().max('now').default(Date.now),
  
  subtotal: Joi.number().min(0).default(0),
  
  tax: taxTipSchema,
  
  tip: taxTipSchema,
  
  fees: Joi.array().items(feeSchema).default([]),
  
  discounts: Joi.array().items(discountSchema).default([]),
  
  participants: Joi.array().items(participantSchema).default([]),
  
  category: Joi.string()
    .valid(...EXPENSE_CATEGORIES)
    .default('other'),
  
  notes: Joi.string().max(2000).allow(''),
  
  tags: Joi.array().items(Joi.string().max(50)).max(10).default([]),
  
  isPublic: Joi.boolean().default(false),
});

// Update bill schema
const updateBill = Joi.object({
  title: Joi.string().min(1).max(200),
  description: Joi.string().max(1000).allow(''),
  splitMethod: Joi.string().valid(...Object.values(SPLIT_METHOD)),
  currency: Joi.string().length(3).uppercase(),
  merchant: Joi.object({
    name: Joi.string().max(200),
    address: Joi.string().max(500),
    phone: Joi.string().max(20),
    category: Joi.string().max(50),
  }),
  expenseDate: Joi.date().max('now'),
  subtotal: Joi.number().min(0),
  tax: taxTipSchema,
  tip: taxTipSchema,
  fees: Joi.array().items(feeSchema),
  discounts: Joi.array().items(discountSchema),
  category: Joi.string().valid(...EXPENSE_CATEGORIES),
  notes: Joi.string().max(2000).allow(''),
  tags: Joi.array().items(Joi.string().max(50)).max(10),
  isPublic: Joi.boolean(),
}).min(1);

// Add participant schema
const addParticipant = Joi.object({
  user: objectId,
  phoneNumber: phoneNumber,
  name: Joi.string().max(100),
  shares: Joi.number().min(0).default(1),
  percentage: Joi.number().min(0).max(100),
  fixedAmount: Joi.number().min(0),
}).or('user', 'phoneNumber');

// Update participant schema
const updateParticipant = Joi.object({
  name: Joi.string().max(100),
  shares: Joi.number().min(0),
  percentage: Joi.number().min(0).max(100),
  fixedAmount: Joi.number().min(0),
}).min(1);

// Update bill status schema
const updateStatus = Joi.object({
  status: Joi.string()
    .valid(...Object.values(BILL_STATUS))
    .required(),
});

// Bill query params schema
const queryParams = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(...Object.values(BILL_STATUS)),
  category: Joi.string().valid(...EXPENSE_CATEGORIES),
  startDate: Joi.date(),
  endDate: Joi.date().min(Joi.ref('startDate')),
  search: Joi.string().max(100),
  sort: Joi.string().max(50),
  minAmount: Joi.number().min(0),
  maxAmount: Joi.number().min(Joi.ref('minAmount')),
});

// Bill ID param schema
const billIdParam = Joi.object({
  billId: objectId.required(),
});

// Participant ID param schema
const participantIdParam = Joi.object({
  participantId: objectId.required(),
});

module.exports = {
  createBill,
  updateBill,
  addParticipant,
  updateParticipant,
  updateStatus,
  queryParams,
  billIdParam,
  participantIdParam,
};
