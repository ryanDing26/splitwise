/**
 * @fileoverview Item model - Individual items within a bill
 */

const mongoose = require('mongoose');
const { ASSIGNMENT_TYPE } = require('../config/constants');

const itemSchema = new mongoose.Schema(
  {
    // Reference to parent bill
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      required: true,
      index: true,
    },
    
    // Item details
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [200, 'Item name cannot exceed 200 characters'],
    },
    
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    
    // Quantity and pricing
    quantity: {
      type: Number,
      default: 1,
      min: [0.01, 'Quantity must be positive'],
    },
    
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Price cannot be negative'],
    },
    
    // Total price (quantity * unitPrice)
    totalPrice: {
      type: Number,
      default: 0,
    },
    
    // Optional: Category for the item
    category: {
      type: String,
      trim: true,
      lowercase: true,
    },
    
    // Item-specific tax (optional override)
    taxable: {
      type: Boolean,
      default: true,
    },
    
    taxRate: {
      type: Number,
      min: 0,
      max: 100,
    },
    
    // Assignment configuration
    assignmentType: {
      type: String,
      enum: Object.values(ASSIGNMENT_TYPE),
      default: ASSIGNMENT_TYPE.EQUAL,
    },
    
    // Assigned participants with their shares
    assignments: [{
      // Reference to participant in bill
      participantId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      
      // For user reference (optional, for quick lookup)
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      
      phoneNumber: String,
      
      // Assignment details
      shares: {
        type: Number,
        default: 1,
        min: 0,
      },
      
      percentage: {
        type: Number,
        min: 0,
        max: 100,
      },
      
      fixedAmount: {
        type: Number,
        min: 0,
      },
      
      // Calculated share of this item
      calculatedAmount: {
        type: Number,
        default: 0,
      },
      
      assignedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // OCR metadata (if extracted from receipt)
    ocrData: {
      rawText: String,
      confidence: Number,
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number,
      },
      lineNumber: Number,
    },
    
    // Manual adjustment flag
    isManuallyEdited: {
      type: Boolean,
      default: false,
    },
    
    // Order in the bill
    sortOrder: {
      type: Number,
      default: 0,
    },
    
    // Notes
    notes: {
      type: String,
      maxlength: 500,
    },
    
    // Soft delete
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
itemSchema.index({ bill: 1, sortOrder: 1 });
itemSchema.index({ bill: 1, createdAt: 1 });
itemSchema.index({ 'assignments.participantId': 1 });
itemSchema.index({ 'assignments.user': 1 });

// Text index for search
itemSchema.index({ name: 'text', description: 'text' });

// Virtual for assigned count
itemSchema.virtual('assignedCount').get(function() {
  return this.assignments.length;
});

// Virtual for fully assigned
itemSchema.virtual('isFullyAssigned').get(function() {
  if (this.assignments.length === 0) return false;
  
  const totalAssigned = this.assignments.reduce((sum, a) => sum + a.calculatedAmount, 0);
  return Math.abs(totalAssigned - this.totalPrice) < 0.01;
});

// Pre-save: Calculate total price
itemSchema.pre('save', function(next) {
  this.totalPrice = Math.round(this.quantity * this.unitPrice * 100) / 100;
  next();
});

// Pre-save: Calculate assignment amounts
itemSchema.pre('save', function(next) {
  if (this.assignments.length === 0) {
    return next();
  }
  
  switch (this.assignmentType) {
    case ASSIGNMENT_TYPE.EQUAL:
      // Split equally among all assigned participants
      const equalShare = this.totalPrice / this.assignments.length;
      this.assignments.forEach(assignment => {
        assignment.calculatedAmount = Math.round(equalShare * 100) / 100;
      });
      break;
      
    case ASSIGNMENT_TYPE.SPECIFIC:
      // Use shares for proportional split
      const totalShares = this.assignments.reduce((sum, a) => sum + (a.shares || 1), 0);
      this.assignments.forEach(assignment => {
        const proportion = (assignment.shares || 1) / totalShares;
        assignment.calculatedAmount = Math.round(this.totalPrice * proportion * 100) / 100;
      });
      break;
      
    case ASSIGNMENT_TYPE.PROPORTIONAL:
      // Use percentages
      this.assignments.forEach(assignment => {
        if (assignment.percentage) {
          assignment.calculatedAmount = Math.round(this.totalPrice * (assignment.percentage / 100) * 100) / 100;
        } else if (assignment.fixedAmount) {
          assignment.calculatedAmount = assignment.fixedAmount;
        }
      });
      break;
  }
  
  // Handle rounding differences - add to first assignment
  const totalAssigned = this.assignments.reduce((sum, a) => sum + a.calculatedAmount, 0);
  const difference = Math.round((this.totalPrice - totalAssigned) * 100) / 100;
  
  if (difference !== 0 && this.assignments.length > 0) {
    this.assignments[0].calculatedAmount += difference;
  }
  
  next();
});

// Instance method: Assign to participants
itemSchema.methods.assignTo = function(participantIds, assignmentType = ASSIGNMENT_TYPE.EQUAL) {
  this.assignmentType = assignmentType;
  this.assignments = participantIds.map(pid => ({
    participantId: pid.participantId || pid,
    user: pid.user,
    phoneNumber: pid.phoneNumber,
    shares: pid.shares || 1,
    percentage: pid.percentage,
    fixedAmount: pid.fixedAmount,
  }));
  
  return this;
};

// Instance method: Add single assignment
itemSchema.methods.addAssignment = function(participantData) {
  // Check if already assigned
  const exists = this.assignments.some(a => 
    a.participantId.toString() === participantData.participantId?.toString()
  );
  
  if (exists) {
    throw new Error('Participant already assigned to this item');
  }
  
  this.assignments.push({
    participantId: participantData.participantId,
    user: participantData.user,
    phoneNumber: participantData.phoneNumber,
    shares: participantData.shares || 1,
    percentage: participantData.percentage,
    fixedAmount: participantData.fixedAmount,
  });
  
  return this;
};

// Instance method: Remove assignment
itemSchema.methods.removeAssignment = function(participantId) {
  this.assignments = this.assignments.filter(
    a => a.participantId.toString() !== participantId.toString()
  );
  return this;
};

// Instance method: Clear all assignments
itemSchema.methods.clearAssignments = function() {
  this.assignments = [];
  return this;
};

// Instance method: Get assignment for participant
itemSchema.methods.getAssignment = function(participantId) {
  return this.assignments.find(
    a => a.participantId.toString() === participantId.toString()
  );
};

// Static method: Find items for bill
itemSchema.statics.findForBill = function(billId, options = {}) {
  const { includeDeleted = false } = options;
  
  const query = { bill: billId };
  
  if (!includeDeleted) {
    query.deletedAt = null;
  }
  
  return this.find(query).sort({ sortOrder: 1, createdAt: 1 });
};

// Static method: Find items assigned to participant
itemSchema.statics.findForParticipant = function(billId, participantId) {
  return this.find({
    bill: billId,
    'assignments.participantId': participantId,
    deletedAt: null,
  }).sort({ sortOrder: 1 });
};

// Static method: Get items total for participant in a bill
itemSchema.statics.getParticipantTotal = async function(billId, participantId) {
  const result = await this.aggregate([
    {
      $match: {
        bill: new mongoose.Types.ObjectId(billId),
        'assignments.participantId': new mongoose.Types.ObjectId(participantId),
        deletedAt: null,
      },
    },
    {
      $unwind: '$assignments',
    },
    {
      $match: {
        'assignments.participantId': new mongoose.Types.ObjectId(participantId),
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$assignments.calculatedAmount' },
        itemCount: { $sum: 1 },
      },
    },
  ]);
  
  return result[0] || { total: 0, itemCount: 0 };
};

// Static method: Bulk create items from OCR
itemSchema.statics.createFromOCR = async function(billId, ocrItems) {
  const items = ocrItems.map((item, index) => ({
    bill: billId,
    name: item.name || `Item ${index + 1}`,
    quantity: item.quantity || 1,
    unitPrice: item.price || 0,
    category: item.category,
    ocrData: {
      rawText: item.rawText,
      confidence: item.confidence,
      boundingBox: item.boundingBox,
      lineNumber: item.lineNumber,
    },
    sortOrder: index,
  }));
  
  return this.insertMany(items);
};

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
