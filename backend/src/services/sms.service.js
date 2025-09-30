/**
 * SMS Service
 * Handles SMS sending via Twilio
 */

const twilio = require('twilio');
const config = require('../config');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/errors');

class SMSService {
  constructor() {
    this.client = null;
    this.fromNumber = config.twilio.phoneNumber;
    this.isEnabled = config.twilio.enabled;
    this.initialize();
  }

  initialize() {
    if (this.isEnabled && config.twilio.accountSid && config.twilio.authToken) {
      try {
        this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
        logger.info('Twilio SMS service initialized');
      } catch (error) {
        logger.error('Failed to initialize Twilio client', { error: error.message });
        this.isEnabled = false;
      }
    } else {
      logger.warn('Twilio SMS service is disabled or not configured');
    }
  }

  /**
   * Send SMS message
   * @param {string} to - Recipient phone number
   * @param {string} message - Message content
   * @returns {Promise<Object>} - Twilio message response
   */
  async send(to, message) {
    if (!this.isEnabled || !this.client) {
      logger.warn('SMS not sent - service disabled', { to, messagePreview: message.substring(0, 50) });
      return { success: false, reason: 'SMS service disabled' };
    }

    try {
      const formattedTo = this.formatPhoneNumber(to);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedTo
      });

      logger.info('SMS sent successfully', {
        to: formattedTo,
        messageSid: result.sid,
        status: result.status
      });

      return {
        success: true,
        messageSid: result.sid,
        status: result.status
      };
    } catch (error) {
      logger.error('Failed to send SMS', {
        to,
        error: error.message,
        code: error.code
      });

      // Don't throw, return failure status
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  /**
   * Send OTP via SMS
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} otp - OTP code
   * @param {string} purpose - OTP purpose
   * @returns {Promise<Object>}
   */
  async sendOTP(phoneNumber, otp, purpose = 'verification') {
    const purposeMessages = {
      login: `Your SplitWise login code is: ${otp}. Valid for 5 minutes.`,
      verify: `Your SplitWise verification code is: ${otp}. Valid for 5 minutes.`,
      reset: `Your SplitWise password reset code is: ${otp}. Valid for 5 minutes.`,
      change_phone: `Your SplitWise phone change verification code is: ${otp}. Valid for 5 minutes.`
    };

    const message = purposeMessages[purpose] || purposeMessages.verify;
    return this.send(phoneNumber, message);
  }

  /**
   * Send bill invitation
   * @param {string} phoneNumber - Recipient phone number
   * @param {Object} billData - Bill information
   * @returns {Promise<Object>}
   */
  async sendBillInvitation(phoneNumber, billData) {
    const { billCode, creatorName, billTitle, amount, currency } = billData;
    
    const message = `${creatorName} invited you to split "${billTitle}" (${currency}${amount.toFixed(2)}). ` +
      `Join SplitWise to view details. Bill code: ${billCode}`;
    
    return this.send(phoneNumber, message);
  }

  /**
   * Send payment reminder
   * @param {string} phoneNumber - Recipient phone number
   * @param {Object} reminderData - Reminder information
   * @returns {Promise<Object>}
   */
  async sendPaymentReminder(phoneNumber, reminderData) {
    const { billTitle, amount, currency, payeeName } = reminderData;
    
    const message = `Reminder: You owe ${currency}${amount.toFixed(2)} to ${payeeName} for "${billTitle}". ` +
      `Open SplitWise to settle up.`;
    
    return this.send(phoneNumber, message);
  }

  /**
   * Send payment confirmation
   * @param {string} phoneNumber - Recipient phone number
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>}
   */
  async sendPaymentConfirmation(phoneNumber, paymentData) {
    const { amount, currency, payerName, billTitle } = paymentData;
    
    const message = `${payerName} paid you ${currency}${amount.toFixed(2)} for "${billTitle}" via SplitWise.`;
    
    return this.send(phoneNumber, message);
  }

  /**
   * Send bill settlement notification
   * @param {string} phoneNumber - Recipient phone number
   * @param {Object} billData - Bill information
   * @returns {Promise<Object>}
   */
  async sendBillSettled(phoneNumber, billData) {
    const { billTitle, total, currency } = billData;
    
    const message = `Bill "${billTitle}" (${currency}${total.toFixed(2)}) has been fully settled! ` +
      `Thanks for using SplitWise.`;
    
    return this.send(phoneNumber, message);
  }

  /**
   * Format phone number to E.164 format
   * @param {string} phoneNumber - Phone number to format
   * @returns {string}
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Add + if not present and starts with country code
    if (!cleaned.startsWith('+')) {
      // Assume US if 10 digits
      if (cleaned.length === 10) {
        cleaned = '+1' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }
    
    return cleaned;
  }

  /**
   * Verify phone number format
   * @param {string} phoneNumber - Phone number to verify
   * @returns {Promise<Object>}
   */
  async lookupPhoneNumber(phoneNumber) {
    if (!this.isEnabled || !this.client) {
      return { valid: true, carrier: null };
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const lookup = await this.client.lookups.v2.phoneNumbers(formattedNumber).fetch();
      
      return {
        valid: lookup.valid,
        countryCode: lookup.countryCode,
        nationalFormat: lookup.nationalFormat,
        phoneNumber: lookup.phoneNumber
      };
    } catch (error) {
      logger.error('Phone lookup failed', { phoneNumber, error: error.message });
      // Return valid true to not block on lookup failures
      return { valid: true, error: error.message };
    }
  }

  /**
   * Get SMS service status
   * @returns {Object}
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      configured: !!this.client,
      fromNumber: this.fromNumber ? this.maskPhoneNumber(this.fromNumber) : null
    };
  }

  /**
   * Mask phone number for logging
   * @param {string} phoneNumber 
   * @returns {string}
   */
  maskPhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.length < 6) return '***';
    return phoneNumber.substring(0, 3) + '****' + phoneNumber.substring(phoneNumber.length - 2);
  }
}

// Export singleton instance
module.exports = new SMSService();
