/**
 * @fileoverview MongoDB connection manager with connection pooling and health checks
 */

const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.connection = null;
    
    // Connection event handlers
    mongoose.connection.on('connected', () => {
      this.isConnected = true;
      logger.info('MongoDB connected successfully');
    });
    
    mongoose.connection.on('error', (err) => {
      this.isConnected = false;
      logger.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      this.isConnected = false;
      logger.warn('MongoDB disconnected');
    });
    
    // Graceful shutdown
    process.on('SIGINT', this.gracefulShutdown.bind(this, 'SIGINT'));
    process.on('SIGTERM', this.gracefulShutdown.bind(this, 'SIGTERM'));
  }
  
  /**
   * Establish connection to MongoDB
   * @returns {Promise<mongoose.Connection>}
   */
  async connect() {
    if (this.isConnected) {
      logger.info('Using existing MongoDB connection');
      return mongoose.connection;
    }
    
    try {
      logger.info('Connecting to MongoDB...');
      
      this.connection = await mongoose.connect(config.mongodb.uri, {
        ...config.mongodb.options,
      });
      
      this.isConnected = true;
      logger.info(`MongoDB connected: ${mongoose.connection.host}`);
      
      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }
  
  /**
   * Disconnect from MongoDB
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }
    
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }
  
  /**
   * Check database health
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', healthy: false };
      }
      
      const adminDb = mongoose.connection.db.admin();
      const result = await adminDb.ping();
      
      return {
        status: 'connected',
        healthy: result.ok === 1,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      };
    } catch (error) {
      return {
        status: 'error',
        healthy: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Graceful shutdown handler
   * @param {string} signal
   */
  async gracefulShutdown(signal) {
    logger.info(`Received ${signal}. Closing MongoDB connection...`);
    await this.disconnect();
    process.exit(0);
  }
  
  /**
   * Get connection status
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected;
  }
}

// Singleton instance
const databaseConnection = new DatabaseConnection();

module.exports = databaseConnection;
