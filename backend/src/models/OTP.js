/**
 * @fileoverview OTP model for phone number verification
 */

const mongoose = require('mongoose');
const config = require('../config');

const otpSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    
    code: {
      type: String,
      required: true,
    },
    
    purpose: {
      type: String,
      enum: ['login', 'verify', 'reset', 'change_phone'],
      default: 'login',
    },
    
    attempts: {
      type: Number,
      default: 0,
    },
    
    maxAttempts: {
      type: Number,
      default: 5,
    },
    
    isUsed: {
      type: Boolean,
      default: false,
    },
    
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    
    usedAt: Date,
    
    // Metadata
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Compound index for lookup
otpSchema.index({ phoneNumber: 1, purpose: 1, isUsed: 1 });

// TTL index - automatically delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save: Set expiration
otpSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(
      Date.now() + config.otp.expiryMinutes * 60 * 1000
    );
  }
  next();
});

// Instance method: Verify OTP
otpSchema.methods.verify = function(code) {
  // Check if already used
  if (this.isUsed) {
    return { valid: false, error: 'OTP already used' };
  }
  
  // Check if expired
  if (this.expiresAt < new Date()) {
    return { valid: false, error: 'OTP expired' };
  }
  
  // Check attempts
  if (this.attempts >= this.maxAttempts) {
    return { valid: false, error: 'Maximum attempts exceeded' };
  }
  
  // Increment attempts
  this.attempts += 1;
  
  // Check code
  if (this.code !== code) {
    return { valid: false, error: 'Invalid OTP' };
  }
  
  // Mark as used
  this.isUsed = true;
  this.usedAt = new Date();
  
  return { valid: true };
};

// Static method: Create new OTP
otpSchema.statics.createOTP = async function(phoneNumber, purpose = 'login', metadata = {}) {
  // Invalidate existing OTPs
  await this.updateMany(
    { phoneNumber, purpose, isUsed: false },
    { isUsed: true }
  );
  
  // Generate new OTP
  const code = Math.random()
    .toString()
    .slice(2, 2 + config.otp.length);
  
  const otp = await this.create({
    phoneNumber,
    code,
    purpose,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
  });
  
  return otp;
};

// Static method: Verify OTP
otpSchema.statics.verifyOTP = async function(phoneNumber, code, purpose = 'login') {
  const otp = await this.findOne({
    phoneNumber,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  
  if (!otp) {
    return { valid: false, error: 'No valid OTP found' };
  }
  
  const result = otp.verify(code);
  await otp.save();
  
  return result;
};

// Static method: Get recent OTP count (for rate limiting)
otpSchema.statics.getRecentCount = async function(phoneNumber, minutes = 60) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  
  return this.countDocuments({
    phoneNumber,
    createdAt: { $gte: since },
  });
};

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
