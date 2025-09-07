/**
 * @fileoverview Bill model - Core entity for bill splitting
 */

const mongoose = require('mongoose');
const { 
  BILL_STATUS, 
  SPLIT_METHOD, 
  DEFAULT_CURRENCY,
  TAX_TYPES,
} = require('../config/constants');

const billSchema = new mongoose.Schema(
  {
    // Unique bill code for sharing
    code: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      index: true,
    },
    
    // Bill metadata
    title: {
      type: String,
      required: [true, 'Bill title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    
    // Creator of the bill
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // Bill status
    status: {
      type: String,
      enum: Object.values(BILL_STATUS),
      default: BILL_STATUS.DRAFT,
      index: true,
    },
    
    // Split method
    splitMethod: {
      type: String,
      enum: Object.values(SPLIT_METHOD),
      default: SPLIT_METHOD.BY_ITEM,
    },
    
    // Currency
    currency: {
      type: String,
      default: DEFAULT_CURRENCY,
      uppercase: true,
    },
    
    // Receipt image info
    receipt: {
      originalUrl: String,
      processedUrl: String,
      uploadedAt: Date,
      ocrStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'manual_review'],
        default: 'pending',
      },
      ocrConfidence: Number,
      ocrRawData: mongoose.Schema.Types.Mixed,
    },
    
    // Merchant/venue info (from OCR or manual)
    merchant: {
      name: String,
      address: String,
      phone: String,
      category: String,
    },
    
    // Date of the expense
    expenseDate: {
      type: Date,
      default: Date.now,
    },
    
    // Subtotal (before tax and tip)
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Tax configuration
    tax: {
      type: {
        type: String,
        enum: Object.values(TAX_TYPES),
        default: TAX_TYPES.PERCENTAGE,
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
      // How to split tax
      splitMethod: {
        type: String,
        enum: ['proportional', 'equal'],
        default: 'proportional',
      },
    },
    
    // Tip configuration
    tip: {
      type: {
        type: String,
        enum: Object.values(TAX_TYPES),
        default: TAX_TYPES.PERCENTAGE,
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
      // How to split tip
      splitMethod: {
        type: String,
        enum: ['proportional', 'equal'],
        default: 'proportional',
      },
    },
    
    // Service charges and fees
    fees: [{
      name: String,
      type: {
        type: String,
        enum: Object.values(TAX_TYPES),
        default: TAX_TYPES.FIXED,
      },
      value: Number,
      amount: Number,
    }],
    
    // Discounts
    discounts: [{
      name: String,
      type: {
        type: String,
        enum: Object.values(TAX_TYPES),
        default: TAX_TYPES.FIXED,
      },
      value: Number,
      amount: Number,
    }],
    
    // Grand total
    total: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Participants (embedded for performance)
    participants: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      // For non-registered users
      phoneNumber: String,
      name: String,
      
      // Share configuration
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
      
      // Calculated amounts
      itemsTotal: {
        type: Number,
        default: 0,
      },
      taxAmount: {
        type: Number,
        default: 0,
      },
      tipAmount: {
        type: Number,
        default: 0,
      },
      feesAmount: {
        type: Number,
        default: 0,
      },
      discountAmount: {
        type: Number,
        default: 0,
      },
      totalOwed: {
        type: Number,
        default: 0,
      },
      
      // Payment tracking
      amountPaid: {
        type: Number,
        default: 0,
      },
      paymentStatus: {
        type: String,
        enum: ['pending', 'partial', 'paid'],
        default: 'pending',
      },
      
      // Timestamps
      addedAt: {
        type: Date,
        default: Date.now,
      },
      paidAt: Date,
      
      // Notifications
      notified: {
        type: Boolean,
        default: false,
      },
      lastNotifiedAt: Date,
    }],
    
    // Settlement tracking
    settlement: {
      isSettled: {
        type: Boolean,
        default: false,
      },
      settledAt: Date,
      settledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    
    // Notes and comments
    notes: {
      type: String,
      maxlength: 2000,
    },
    
    // Tags for categorization
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    
    // Category
    category: {
      type: String,
      default: 'other',
    },
    
    // Visibility
    isPublic: {
      type: Boolean,
      default: false,
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

// Indexes for query optimization
billSchema.index({ createdBy: 1, createdAt: -1 });
billSchema.index({ 'participants.user': 1, createdAt: -1 });
billSchema.index({ 'participants.phoneNumber': 1 });
billSchema.index({ status: 1, createdAt: -1 });
billSchema.index({ category: 1 });
billSchema.index({ expenseDate: -1 });
billSchema.index({ code: 1 }, { unique: true });

// Text index for search
billSchema.index({ title: 'text', description: 'text', 'merchant.name': 'text' });

// Virtual for items (populated separately)
billSchema.virtual('items', {
  ref: 'Item',
  localField: '_id',
  foreignField: 'bill',
});

// Virtual for payments (populated separately)
billSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'bill',
});

// Virtual for participant count
billSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Virtual for remaining amount
billSchema.virtual('remainingAmount').get(function() {
  const totalPaid = this.participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  return Math.max(0, this.total - totalPaid);
});

// Pre-save: Calculate totals
billSchema.pre('save', function(next) {
  // Calculate tax amount if percentage
  if (this.tax.type === 'percentage') {
    this.tax.amount = (this.subtotal * this.tax.value) / 100;
  } else {
    this.tax.amount = this.tax.value;
  }
  
  // Calculate tip amount if percentage
  if (this.tip.type === 'percentage') {
    this.tip.amount = (this.subtotal * this.tip.value) / 100;
  } else {
    this.tip.amount = this.tip.value;
  }
  
  // Calculate fees
  const feesTotal = this.fees.reduce((sum, fee) => {
    if (fee.type === 'percentage') {
      fee.amount = (this.subtotal * fee.value) / 100;
    } else {
      fee.amount = fee.value;
    }
    return sum + fee.amount;
  }, 0);
  
  // Calculate discounts
  const discountsTotal = this.discounts.reduce((sum, discount) => {
    if (discount.type === 'percentage') {
      discount.amount = (this.subtotal * discount.value) / 100;
    } else {
      discount.amount = discount.value;
    }
    return sum + discount.amount;
  }, 0);
  
  // Calculate total
  this.total = this.subtotal + this.tax.amount + this.tip.amount + feesTotal - discountsTotal;
  
  // Round to 2 decimal places
  this.total = Math.round(this.total * 100) / 100;
  
  next();
});

// Instance method: Add participant
billSchema.methods.addParticipant = function(participantData) {
  // Check if already exists
  const exists = this.participants.some(p => 
    (p.user && p.user.toString() === participantData.user?.toString()) ||
    (p.phoneNumber && p.phoneNumber === participantData.phoneNumber)
  );
  
  if (exists) {
    throw new Error('Participant already exists');
  }
  
  this.participants.push({
    ...participantData,
    addedAt: new Date(),
  });
  
  return this;
};

// Instance method: Remove participant
billSchema.methods.removeParticipant = function(participantId) {
  this.participants = this.participants.filter(
    p => p._id.toString() !== participantId.toString()
  );
  return this;
};

// Instance method: Get participant by user ID or phone
billSchema.methods.getParticipant = function(identifier) {
  return this.participants.find(p =>
    (p.user && p.user.toString() === identifier.toString()) ||
    p.phoneNumber === identifier ||
    p._id.toString() === identifier.toString()
  );
};

// Instance method: Update participant payment
billSchema.methods.recordPayment = function(participantId, amount) {
  const participant = this.participants.id(participantId);
  
  if (!participant) {
    throw new Error('Participant not found');
  }
  
  participant.amountPaid = (participant.amountPaid || 0) + amount;
  
  if (participant.amountPaid >= participant.totalOwed) {
    participant.paymentStatus = 'paid';
    participant.paidAt = new Date();
  } else if (participant.amountPaid > 0) {
    participant.paymentStatus = 'partial';
  }
  
  // Check if bill is fully settled
  const allPaid = this.participants.every(p => p.paymentStatus === 'paid');
  if (allPaid) {
    this.status = BILL_STATUS.SETTLED;
    this.settlement.isSettled = true;
    this.settlement.settledAt = new Date();
  }
  
  return participant;
};

// Instance method: Calculate split for all participants
billSchema.methods.calculateSplit = function() {
  const participantCount = this.participants.length;
  
  if (participantCount === 0) return this;
  
  // Calculate each participant's share based on split method
  this.participants.forEach(participant => {
    // Reset calculated amounts
    participant.taxAmount = 0;
    participant.tipAmount = 0;
    participant.feesAmount = 0;
    participant.discountAmount = 0;
    
    // Calculate proportional share of tax/tip/fees
    const proportion = participant.itemsTotal / this.subtotal || 0;
    
    if (this.tax.splitMethod === 'proportional') {
      participant.taxAmount = this.tax.amount * proportion;
    } else {
      participant.taxAmount = this.tax.amount / participantCount;
    }
    
    if (this.tip.splitMethod === 'proportional') {
      participant.tipAmount = this.tip.amount * proportion;
    } else {
      participant.tipAmount = this.tip.amount / participantCount;
    }
    
    // Fees and discounts proportional
    this.fees.forEach(fee => {
      participant.feesAmount += fee.amount * proportion;
    });
    
    this.discounts.forEach(discount => {
      participant.discountAmount += discount.amount * proportion;
    });
    
    // Calculate total owed
    participant.totalOwed = 
      participant.itemsTotal +
      participant.taxAmount +
      participant.tipAmount +
      participant.feesAmount -
      participant.discountAmount;
    
    // Round to 2 decimal places
    participant.totalOwed = Math.round(participant.totalOwed * 100) / 100;
  });
  
  return this;
};

// Static method: Generate unique bill code
billSchema.statics.generateCode = async function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const existing = await this.findOne({ code });
    isUnique = !existing;
  }
  
  return code;
};

// Static method: Find bills for user
billSchema.statics.findForUser = function(userId, options = {}) {
  const { status, page = 1, limit = 20 } = options;
  
  const query = {
    $or: [
      { createdBy: userId },
      { 'participants.user': userId },
    ],
    deletedAt: null,
  };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('createdBy', 'name phoneNumber avatar')
    .populate('participants.user', 'name phoneNumber avatar');
};

const Bill = mongoose.model('Bill', billSchema);

module.exports = Bill;
