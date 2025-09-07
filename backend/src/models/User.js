/**
 * @fileoverview User model for authentication and profile management
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    
    countryCode: {
      type: String,
      default: '+1',
      trim: true,
    },
    
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    
    avatar: {
      type: String,
      default: null,
    },
    
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
    },
    
    isVerified: {
      type: Boolean,
      default: false,
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
    
    // For password-based auth (optional)
    password: {
      type: String,
      minlength: 8,
      select: false,
    },
    
    // Default preferences
    preferences: {
      currency: {
        type: String,
        default: 'USD',
      },
      notifications: {
        sms: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
      },
      language: {
        type: String,
        default: 'en',
      },
    },
    
    // Push notification tokens
    pushTokens: [{
      token: String,
      platform: {
        type: String,
        enum: ['ios', 'android', 'web'],
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // Statistics
    stats: {
      totalBillsCreated: { type: Number, default: 0 },
      totalBillsParticipated: { type: Number, default: 0 },
      totalAmountOwed: { type: Number, default: 0 },
      totalAmountPaid: { type: Number, default: 0 },
    },
    
    // Timestamps
    lastLoginAt: Date,
    passwordChangedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'stats.totalBillsCreated': -1 });

// Virtual for full phone number
userSchema.virtual('fullPhoneNumber').get(function() {
  return `${this.countryCode}${this.phoneNumber.replace(/^\+/, '')}`;
});

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  return this.name || `User ${this.phoneNumber.slice(-4)}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordChangedAt = Date.now() - 1000;
  }
  
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if password changed after token was issued
userSchema.methods.changedPasswordAfter = function(jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

// Instance method to get public profile
userSchema.methods.toPublicProfile = function() {
  return {
    id: this._id,
    phoneNumber: this.phoneNumber,
    name: this.name,
    displayName: this.displayName,
    avatar: this.avatar,
    isVerified: this.isVerified,
  };
};

// Static method to find by phone number
userSchema.statics.findByPhoneNumber = function(phoneNumber) {
  // Normalize phone number for lookup
  const normalized = phoneNumber.replace(/\D/g, '');
  return this.findOne({
    $or: [
      { phoneNumber: normalized },
      { phoneNumber: `+${normalized}` },
      { phoneNumber: phoneNumber },
    ],
  });
};

// Static method to find or create user by phone
userSchema.statics.findOrCreateByPhone = async function(phoneNumber, countryCode = '+1') {
  let user = await this.findByPhoneNumber(phoneNumber);
  
  if (!user) {
    const normalized = phoneNumber.replace(/\D/g, '');
    user = await this.create({
      phoneNumber: normalized,
      countryCode,
    });
  }
  
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
