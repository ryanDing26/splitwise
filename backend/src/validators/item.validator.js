/**
 * @fileoverview Item validation schemas
 */

const Joi = require('joi');
const { ASSIGNMENT_TYPE } = require('../config/constants');

// MongoDB ObjectId validation
const objectId = Joi.string()
  .pattern(/^[a-fA-F0-9]{24}$/)
  .messages({
    'string.pattern.base': 'Invalid ID format',
  });

// Assignment schema
const assignmentSchema = Joi.object({
  participantId: objectId.required(),
  user: objectId,
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{9,14}$/),
  shares: Joi.number().min(0).default(1),
  percentage: Joi.number().min(0).max(100),
  fixedAmount: Joi.number().min(0),
});

// Create item schema
const createItem = Joi.object({
  name: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Item name is required',
      'string.max': 'Name cannot exceed 200 characters',
    }),
  
  description: Joi.string().max(500).allow(''),
  
  quantity: Joi.number()
    .positive()
    .default(1)
    .messages({
      'number.positive': 'Quantity must be positive',
    }),
  
  unitPrice: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.min': 'Price cannot be negative',
      'any.required': 'Unit price is required',
    }),
  
  category: Joi.string().max(50).lowercase(),
  
  taxable: Joi.boolean().default(true),
  
  taxRate: Joi.number().min(0).max(100),
  
  assignmentType: Joi.string()
    .valid(...Object.values(ASSIGNMENT_TYPE))
    .default('equal'),
  
  assignments: Joi.array()
    .items(assignmentSchema)
    .default([]),
  
  notes: Joi.string().max(500).allow(''),
  
  sortOrder: Joi.number().integer().min(0),
});

// Update item schema
const updateItem = Joi.object({
  name: Joi.string().min(1).max(200),
  description: Joi.string().max(500).allow(''),
  quantity: Joi.number().positive(),
  unitPrice: Joi.number().min(0),
  category: Joi.string().max(50).lowercase(),
  taxable: Joi.boolean(),
  taxRate: Joi.number().min(0).max(100),
  assignmentType: Joi.string().valid(...Object.values(ASSIGNMENT_TYPE)),
  notes: Joi.string().max(500).allow(''),
  sortOrder: Joi.number().integer().min(0),
}).min(1);

// Bulk create items schema
const bulkCreateItems = Joi.object({
  items: Joi.array()
    .items(createItem)
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one item is required',
      'array.max': 'Cannot create more than 100 items at once',
    }),
});

// Assign item schema
const assignItem = Joi.object({
  participantIds: Joi.array()
    .items(objectId)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one participant is required',
    }),
  
  assignmentType: Joi.string()
    .valid(...Object.values(ASSIGNMENT_TYPE))
    .default('equal'),
  
  // For specific/proportional assignments
  assignments: Joi.array().items(assignmentSchema),
});

// Update assignment schema
const updateAssignment = Joi.object({
  shares: Joi.number().min(0),
  percentage: Joi.number().min(0).max(100),
  fixedAmount: Joi.number().min(0),
}).min(1);

// Bulk assign items schema
const bulkAssignItems = Joi.object({
  itemIds: Joi.array()
    .items(objectId)
    .min(1)
    .required(),
  
  participantIds: Joi.array()
    .items(objectId)
    .min(1)
    .required(),
  
  assignmentType: Joi.string()
    .valid(...Object.values(ASSIGNMENT_TYPE))
    .default('equal'),
});

// Reorder items schema
const reorderItems = Joi.object({
  itemIds: Joi.array()
    .items(objectId)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one item ID is required',
    }),
});

// Item query params schema
const queryParams = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  category: Joi.string().max(50),
  assignedTo: objectId,
  unassigned: Joi.boolean(),
  search: Joi.string().max(100),
  sort: Joi.string().valid('name', 'price', 'createdAt', 'sortOrder'),
  order: Joi.string().valid('asc', 'desc').default('asc'),
});

// Item ID param schema
const itemIdParam = Joi.object({
  itemId: objectId.required(),
});

module.exports = {
  createItem,
  updateItem,
  bulkCreateItems,
  assignItem,
  updateAssignment,
  bulkAssignItems,
  reorderItems,
  queryParams,
  itemIdParam,
};
