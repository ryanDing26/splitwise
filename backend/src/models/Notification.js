/**
 * @fileoverview Notification model - Track all notifications sent to users
 */

const mongoose = require('mongoose');
const { NOTIFICATION_TYPE } = require('../config/constants');

const notificationSchema = new mongoose.Schema(
  {
    // Recipient
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    
    // For non-registered users
    phoneNumber: {
      type: String,
      index: true,
    },
    
    // Notification type
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      required: true,
      index: true,
    },
    
    // Notification content
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    
    // Related entities
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      index: true,
    },
    
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
    },
    
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    
    // Triggered by
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Delivery channels
    channels: {
      sms: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        messageId: String,
        status: String,
        error: String,
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        messageId: String,
        status: String,
        error: String,
      },
      email: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        messageId: String,
        status: String,
        error: String,
      },
      inApp: {
        sent: { type: Boolean, default: true },
        sentAt: { type: Date, default: Date.now },
      },
    },
    
    // Read status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    readAt: Date,
    
    // Action URL
    actionUrl: String,
    
    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    
    // Priority
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    
    // Expiry
    expiresAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ bill: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });

// TTL for auto-cleanup of old notifications
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 days
);

// Virtual for channel summary
notificationSchema.virtual('deliveryStatus').get(function() {
  const channels = [];
  if (this.channels.sms.sent) channels.push('sms');
  if (this.channels.push.sent) channels.push('push');
  if (this.channels.email.sent) channels.push('email');
  if (this.channels.inApp.sent) channels.push('inApp');
  return channels;
});

// Instance method: Mark as read
notificationSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
  }
  return this;
};

// Instance method: Update channel status
notificationSchema.methods.updateChannelStatus = function(channel, status) {
  if (this.channels[channel]) {
    Object.assign(this.channels[channel], status);
  }
  return this;
};

// Static method: Create notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = await this.create(data);
  return notification;
};

// Static method: Get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    user: userId,
    isRead: false,
  });
};

// Static method: Get notifications for user
notificationSchema.statics.getForUser = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false,
    type = null,
  } = options;
  
  const query = { user: userId };
  
  if (unreadOnly) {
    query.isRead = false;
  }
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('bill', 'title code')
    .populate('triggeredBy', 'name phoneNumber');
};

// Static method: Mark all as read
notificationSchema.statics.markAllRead = async function(userId) {
  return this.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Static method: Delete old notifications
notificationSchema.statics.deleteOld = async function(daysOld = 90) {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.deleteMany({ createdAt: { $lt: cutoff } });
};

// Static method: Get notification stats for user
notificationSchema.statics.getStats = async function(userId) {
  const result = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: {
          $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] },
        },
        byType: {
          $push: { type: '$type', isRead: '$isRead' },
        },
      },
    },
  ]);
  
  return result[0] || { total: 0, unread: 0, byType: [] };
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
