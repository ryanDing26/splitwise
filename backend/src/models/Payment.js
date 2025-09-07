/**
 * @fileoverview Payment model - Track payments and settlements
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // Reference to bill
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      required: true,
      index: true,
    },
    
    // Who paid
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    
    // Non-registered payer
    payerPhone: String,
    payerName: String,
    
    // Participant reference in bill
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    
    // Who received the payment (bill creator or designated collector)
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    
    // Payment amount
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment must be positive'],
    },
    
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    
    // Payment method
    method: {
      type: String,
      enum: [
        'cash',
        'venmo',
        'paypal',
        'zelle',
        'apple_pay',
        'google_pay',
        'bank_transfer',
        'credit_card',
        'other',
      ],
      default: 'other',
    },
    
    // External payment reference (Venmo ID, etc.)
    externalReference: {
      provider: String,
      transactionId: String,
      status: String,
    },
    
    // Payment status
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'completed',
    },
    
    // Notes
    notes: {
      type: String,
      maxlength: 500,
    },
    
    // Recorded by
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Timestamps for payment lifecycle
    confirmedAt: Date,
    refundedAt: Date,
    
    // Refund info
    refund: {
      amount: Number,
      reason: String,
      processedAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
paymentSchema.index({ bill: 1, createdAt: -1 });
paymentSchema.index({ payer: 1, createdAt: -1 });
paymentSchema.index({ receiver: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for display name of payer
paymentSchema.virtual('payerDisplay').get(function() {
  if (this.payerName) return this.payerName;
  if (this.payerPhone) return `User ending ${this.payerPhone.slice(-4)}`;
  return 'Unknown';
});

// Post-save: Update bill participant payment status
paymentSchema.post('save', async function(doc) {
  if (doc.status !== 'completed') return;
  
  const Bill = mongoose.model('Bill');
  const bill = await Bill.findById(doc.bill);
  
  if (bill) {
    bill.recordPayment(doc.participantId, doc.amount);
    await bill.save();
  }
});

// Instance method: Confirm payment
paymentSchema.methods.confirm = function() {
  this.status = 'completed';
  this.confirmedAt = new Date();
  return this;
};

// Instance method: Refund payment
paymentSchema.methods.processRefund = function(amount, reason) {
  this.status = 'refunded';
  this.refundedAt = new Date();
  this.refund = {
    amount: amount || this.amount,
    reason,
    processedAt: new Date(),
  };
  return this;
};

// Static method: Get total paid for bill
paymentSchema.statics.getTotalForBill = async function(billId) {
  const result = await this.aggregate([
    {
      $match: {
        bill: new mongoose.Types.ObjectId(billId),
        status: 'completed',
      },
    },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: '$amount' },
        paymentCount: { $sum: 1 },
      },
    },
  ]);
  
  return result[0] || { totalPaid: 0, paymentCount: 0 };
};

// Static method: Get payments by user
paymentSchema.statics.getByUser = function(userId, options = {}) {
  const { type = 'all', page = 1, limit = 20 } = options;
  
  let query = { status: 'completed' };
  
  if (type === 'sent') {
    query.payer = userId;
  } else if (type === 'received') {
    query.receiver = userId;
  } else {
    query.$or = [{ payer: userId }, { receiver: userId }];
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('bill', 'title code total')
    .populate('payer', 'name phoneNumber')
    .populate('receiver', 'name phoneNumber');
};

// Static method: Get payment summary for user
paymentSchema.statics.getUserSummary = async function(userId) {
  const result = await this.aggregate([
    {
      $match: {
        status: 'completed',
        $or: [
          { payer: new mongoose.Types.ObjectId(userId) },
          { receiver: new mongoose.Types.ObjectId(userId) },
        ],
      },
    },
    {
      $group: {
        _id: null,
        totalSent: {
          $sum: {
            $cond: [
              { $eq: ['$payer', new mongoose.Types.ObjectId(userId)] },
              '$amount',
              0,
            ],
          },
        },
        totalReceived: {
          $sum: {
            $cond: [
              { $eq: ['$receiver', new mongoose.Types.ObjectId(userId)] },
              '$amount',
              0,
            ],
          },
        },
        sentCount: {
          $sum: {
            $cond: [
              { $eq: ['$payer', new mongoose.Types.ObjectId(userId)] },
              1,
              0,
            ],
          },
        },
        receivedCount: {
          $sum: {
            $cond: [
              { $eq: ['$receiver', new mongoose.Types.ObjectId(userId)] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  
  return result[0] || {
    totalSent: 0,
    totalReceived: 0,
    sentCount: 0,
    receivedCount: 0,
  };
};

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
