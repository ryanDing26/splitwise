/**
 * Notification Service
 * Handles multi-channel notifications (SMS, Push, Email, In-App)
 */

const Notification = require('../models/Notification');
const smsService = require('./sms.service');
const logger = require('../utils/logger');
const { redis } = require('../config/redis');
const { REDIS_KEYS, CACHE_TTL } = require('../config/constants');

class NotificationService {
  constructor() {
    this.defaultChannels = ['inApp'];
  }

  /**
   * Create and send notification
   * @param {Object} options - Notification options
   * @returns {Promise<Object>}
   */
  async notify(options) {
    const {
      userId,
      phoneNumber,
      type,
      title,
      message,
      channels = this.defaultChannels,
      data = {},
      priority = 'normal',
      triggeredBy = null
    } = options;

    try {
      // Create notification record
      const notification = await Notification.createNotification({
        user: userId,
        phoneNumber,
        type,
        title,
        message,
        bill: data.billId,
        item: data.itemId,
        payment: data.paymentId,
        triggeredBy,
        channels: channels.map(ch => ({ channel: ch, status: 'pending' })),
        priority,
        metadata: data.metadata,
        actionUrl: data.actionUrl
      });

      // Send through each channel
      const results = await Promise.allSettled(
        channels.map(channel => this.sendViaChannel(notification, channel, options))
      );

      // Update notification with results
      for (let i = 0; i < channels.length; i++) {
        const result = results[i];
        const channel = channels[i];
        
        if (result.status === 'fulfilled') {
          await notification.updateChannelStatus(channel, 'sent', result.value);
        } else {
          await notification.updateChannelStatus(channel, 'failed', {
            error: result.reason?.message
          });
        }
      }

      // Invalidate unread count cache
      if (userId) {
        await this.invalidateUnreadCache(userId);
      }

      return notification;
    } catch (error) {
      logger.error('Failed to create notification', { error: error.message, type });
      throw error;
    }
  }

  /**
   * Send notification via specific channel
   * @param {Object} notification - Notification document
   * @param {string} channel - Channel type
   * @param {Object} options - Original options
   * @returns {Promise<Object>}
   */
  async sendViaChannel(notification, channel, options) {
    switch (channel) {
      case 'sms':
        return this.sendSMS(notification, options);
      case 'push':
        return this.sendPush(notification, options);
      case 'email':
        return this.sendEmail(notification, options);
      case 'inApp':
        // In-app notifications are created via the database
        return { success: true };
      default:
        logger.warn('Unknown notification channel', { channel });
        return { success: false, error: 'Unknown channel' };
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(notification, options) {
    const phoneNumber = options.phoneNumber || notification.phoneNumber;
    
    if (!phoneNumber) {
      throw new Error('No phone number for SMS notification');
    }

    return smsService.send(phoneNumber, notification.message);
  }

  /**
   * Send push notification
   * @todo Implement push notification (Firebase/APNS)
   */
  async sendPush(notification, options) {
    // Placeholder for push notification implementation
    // Would typically use Firebase Cloud Messaging or Apple Push Notification Service
    logger.info('Push notification queued', { 
      notificationId: notification._id,
      userId: notification.user
    });
    
    return { success: true, provider: 'push', status: 'queued' };
  }

  /**
   * Send email notification
   * @todo Implement email notification
   */
  async sendEmail(notification, options) {
    // Placeholder for email implementation
    // Would typically use SendGrid, AWS SES, or similar
    logger.info('Email notification queued', {
      notificationId: notification._id,
      userId: notification.user
    });
    
    return { success: true, provider: 'email', status: 'queued' };
  }

  /**
   * Notify about new bill invitation
   */
  async notifyBillInvitation(participant, bill, creator) {
    const channels = ['inApp'];
    
    // Add SMS for non-registered users or based on preferences
    if (participant.phoneNumber && !participant.user) {
      channels.push('sms');
    }

    return this.notify({
      userId: participant.user,
      phoneNumber: participant.phoneNumber,
      type: 'bill_created',
      title: 'New Bill Invitation',
      message: `${creator.name || 'Someone'} invited you to split "${bill.title}"`,
      channels,
      data: {
        billId: bill._id,
        metadata: {
          billCode: bill.code,
          creatorName: creator.name,
          total: bill.total,
          currency: bill.currency
        },
        actionUrl: `/bills/${bill.code}`
      },
      triggeredBy: creator._id
    });
  }

  /**
   * Notify about item assignment
   */
  async notifyItemAssigned(participant, item, bill, assignedBy) {
    return this.notify({
      userId: participant.user,
      phoneNumber: participant.phoneNumber,
      type: 'item_assigned',
      title: 'Item Assigned',
      message: `You were assigned "${item.name}" (${bill.currency}${item.totalPrice.toFixed(2)}) on "${bill.title}"`,
      channels: ['inApp'],
      data: {
        billId: bill._id,
        itemId: item._id,
        metadata: {
          itemName: item.name,
          amount: item.totalPrice
        }
      },
      triggeredBy: assignedBy
    });
  }

  /**
   * Notify about payment received
   */
  async notifyPaymentReceived(receiver, payment, bill, payer) {
    const channels = ['inApp'];
    
    // Include SMS for significant amounts
    if (payment.amount >= 10) {
      channels.push('sms');
    }

    return this.notify({
      userId: receiver._id,
      phoneNumber: receiver.phoneNumber,
      type: 'payment_received',
      title: 'Payment Received',
      message: `${payer.name || 'Someone'} paid you ${bill.currency}${payment.amount.toFixed(2)} for "${bill.title}"`,
      channels,
      data: {
        billId: bill._id,
        paymentId: payment._id,
        metadata: {
          amount: payment.amount,
          payerName: payer.name,
          method: payment.method
        }
      },
      triggeredBy: payer._id,
      priority: 'high'
    });
  }

  /**
   * Notify about payment confirmation
   */
  async notifyPaymentConfirmed(payer, payment, bill, confirmedBy) {
    return this.notify({
      userId: payer._id,
      type: 'payment_confirmed',
      title: 'Payment Confirmed',
      message: `Your payment of ${bill.currency}${payment.amount.toFixed(2)} for "${bill.title}" was confirmed`,
      channels: ['inApp'],
      data: {
        billId: bill._id,
        paymentId: payment._id
      },
      triggeredBy: confirmedBy
    });
  }

  /**
   * Notify about bill settlement
   */
  async notifyBillSettled(participants, bill) {
    const notifications = [];

    for (const participant of participants) {
      if (!participant.user) continue;

      notifications.push(
        this.notify({
          userId: participant.user,
          type: 'bill_settled',
          title: 'Bill Settled!',
          message: `"${bill.title}" has been fully settled`,
          channels: ['inApp', 'sms'],
          data: {
            billId: bill._id,
            metadata: {
              total: bill.total
            }
          }
        })
      );
    }

    return Promise.allSettled(notifications);
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(participant, bill, requestedBy) {
    const channels = ['inApp', 'sms'];

    return this.notify({
      userId: participant.user,
      phoneNumber: participant.phoneNumber,
      type: 'payment_reminder',
      title: 'Payment Reminder',
      message: `Reminder: You owe ${bill.currency}${(participant.totalOwed - participant.amountPaid).toFixed(2)} for "${bill.title}"`,
      channels,
      data: {
        billId: bill._id,
        metadata: {
          amountOwed: participant.totalOwed - participant.amountPaid
        },
        actionUrl: `/bills/${bill.code}/pay`
      },
      triggeredBy: requestedBy,
      priority: 'high'
    });
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    // Try cache first
    const cacheKey = `${REDIS_KEYS.NOTIFICATION_COUNT}${userId}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        return parseInt(cached, 10);
      }
    } catch (error) {
      logger.debug('Cache miss for unread count', { userId });
    }

    // Get from database
    const count = await Notification.getUnreadCount(userId);

    // Cache result
    try {
      await redis.setex(cacheKey, CACHE_TTL.NOTIFICATION_COUNT, count.toString());
    } catch (error) {
      logger.debug('Failed to cache unread count', { userId });
    }

    return count;
  }

  /**
   * Invalidate unread count cache
   */
  async invalidateUnreadCache(userId) {
    try {
      const cacheKey = `${REDIS_KEYS.NOTIFICATION_COUNT}${userId}`;
      await redis.del(cacheKey);
    } catch (error) {
      logger.debug('Failed to invalidate unread cache', { userId });
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    return Notification.getForUser(userId, { page, limit, unreadOnly });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.markAsRead();
    await this.invalidateUnreadCache(userId);

    return notification;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    await Notification.markAllRead(userId);
    await this.invalidateUnreadCache(userId);
  }

  /**
   * Delete old notifications
   */
  async cleanupOldNotifications(daysOld = 90) {
    const result = await Notification.deleteOld(daysOld);
    logger.info('Cleaned up old notifications', { deletedCount: result.deletedCount });
    return result;
  }
}

module.exports = new NotificationService();
