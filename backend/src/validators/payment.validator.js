/**
 * @fileoverview Payment validation schemas
 */

const Joi = require('joi');

// MongoDB ObjectId validation
const objectId = Joi.string()
  .pattern(/^[a-fA-F0-9]{24}$/)
  .messages({
    'string.pattern.base': 'Invalid ID format',
  });

// Payment methods
const paymentMethods = [
  'cash',
  'venmo',
  'paypal',
  'zelle',
  'apple_pay',
  'google_pay',
  'bank_transfer',
  'credit_card',
  'other',
];

// Record payment schema
const recordPayment = Joi.object({
  participantId: objectId.required().messages({
    'any.required': 'Participant ID is required',
  }),
  
  amount: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Amount must be positive',
      'any.required': 'Amount is required',
    }),
  
  method: Joi.string()
    .valid(...paymentMethods)
    .default('other'),
  
  externalReference: Joi.object({
    provider: Joi.string().max(50),
    transactionId: Joi.string().max(100),
    status: Joi.string().max(50),
  }),
  
  notes: Joi.string().max(500).allow(''),
});

// Update payment schema
const updatePayment = Joi.object({
  amount: Joi.number().positive(),
  method: Joi.string().valid(...paymentMethods),
  externalReference: Joi.object({
    provider: Joi.string().max(50),
    transactionId: Joi.string().max(100),
    status: Joi.string().max(50),
  }),
  notes: Joi.string().max(500).allow(''),
  status: Joi.string().valid('pending', 'completed', 'failed', 'cancelled'),
}).min(1);

// Confirm payment schema
const confirmPayment = Joi.object({
  externalReference: Joi.object({
    provider: Joi.string().max(50),
    transactionId: Joi.string().max(100),
    status: Joi.string().max(50),
  }),
});

// Refund payment schema
const refundPayment = Joi.object({
  amount: Joi.number().positive(),
  reason: Joi.string().max(500).required().messages({
    'any.required': 'Refund reason is required',
  }),
});

// Bulk record payments schema
const bulkRecordPayments = Joi.object({
  payments: Joi.array()
    .items(
      Joi.object({
        participantId: objectId.required(),
        amount: Joi.number().positive().required(),
        method: Joi.string().valid(...paymentMethods).default('other'),
        notes: Joi.string().max(500).allow(''),
      })
    )
    .min(1)
    .max(50)
    .required(),
});

// Payment query params schema
const queryParams = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'completed', 'failed', 'refunded', 'cancelled'),
  method: Joi.string().valid(...paymentMethods),
  startDate: Joi.date(),
  endDate: Joi.date().min(Joi.ref('startDate')),
  minAmount: Joi.number().min(0),
  maxAmount: Joi.number().min(Joi.ref('minAmount')),
  type: Joi.string().valid('sent', 'received', 'all').default('all'),
  sort: Joi.string().valid('amount', 'createdAt', 'method'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

// Payment ID param schema
const paymentIdParam = Joi.object({
  paymentId: objectId.required(),
});

module.exports = {
  recordPayment,
  updatePayment,
  confirmPayment,
  refundPayment,
  bulkRecordPayments,
  queryParams,
  paymentIdParam,
};
