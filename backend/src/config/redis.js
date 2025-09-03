/**
 * @fileoverview Redis connection manager for caching and session management
 */

const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

class RedisConnection {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.isConnected = false;
  }
  
  /**
   * Create Redis client with configuration
   * @returns {Redis}
   */
  createClient() {
    const client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    
    return client;
  }
  
  /**
   * Connect to Redis
   * @returns {Promise<Redis>}
   */
  async connect() {
    if (this.isConnected && this.client) {
      return this.client;
    }
    
    try {
      this.client = this.createClient();
      
      this.client.on('connect', () => {
        logger.info('Redis client connected');
      });
      
      this.client.on('ready', () => {
        this.isConnected = true;
        logger.info('Redis client ready');
      });
      
      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
      });
      
      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });
      
      await this.client.connect();
      
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      // Don't throw - Redis is optional for core functionality
      return null;
    }
  }
  
  /**
   * Get Redis client
   * @returns {Redis|null}
   */
  getClient() {
    return this.client;
  }
  
  /**
   * Disconnect from Redis
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }
  
  /**
   * Health check for Redis
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    try {
      if (!this.client || !this.isConnected) {
        return { status: 'disconnected', healthy: false };
      }
      
      const pong = await this.client.ping();
      return {
        status: 'connected',
        healthy: pong === 'PONG',
      };
    } catch (error) {
      return {
        status: 'error',
        healthy: false,
        error: error.message,
      };
    }
  }
  
  // ==========================================
  // Convenience Methods
  // ==========================================
  
  /**
   * Set value with optional TTL
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds
   */
  async set(key, value, ttlSeconds = null) {
    if (!this.client) return null;
    
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (ttlSeconds) {
      return this.client.setex(key, ttlSeconds, serialized);
    }
    return this.client.set(key, serialized);
  }
  
  /**
   * Get value
   * @param {string} key
   * @returns {Promise<any>}
   */
  async get(key) {
    if (!this.client) return null;
    
    const value = await this.client.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  
  /**
   * Delete key
   * @param {string} key
   */
  async del(key) {
    if (!this.client) return null;
    return this.client.del(key);
  }
  
  /**
   * Check if key exists
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    if (!this.client) return false;
    return (await this.client.exists(key)) === 1;
  }
  
  /**
   * Set hash field
   * @param {string} key
   * @param {string} field
   * @param {any} value
   */
  async hset(key, field, value) {
    if (!this.client) return null;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return this.client.hset(key, field, serialized);
  }
  
  /**
   * Get hash field
   * @param {string} key
   * @param {string} field
   */
  async hget(key, field) {
    if (!this.client) return null;
    const value = await this.client.hget(key, field);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  
  /**
   * Increment value
   * @param {string} key
   * @returns {Promise<number>}
   */
  async incr(key) {
    if (!this.client) return null;
    return this.client.incr(key);
  }
  
  /**
   * Set expiry on key
   * @param {string} key
   * @param {number} seconds
   */
  async expire(key, seconds) {
    if (!this.client) return null;
    return this.client.expire(key, seconds);
  }
}

// Singleton instance
const redisConnection = new RedisConnection();

module.exports = redisConnection;
