/**
 * @fileoverview Authentication middleware using JWT
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const redis = require('../config/redis');
const { REDIS_KEYS } = require('../config/constants');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired');
      }
      throw new UnauthorizedError('Invalid token');
    }
    
    // Check if token is blacklisted (logout)
    if (redis.getClient()) {
      const isBlacklisted = await redis.exists(`${REDIS_KEYS.SESSION}blacklist:${token}`);
      if (isBlacklisted) {
        throw new UnauthorizedError('Token has been revoked');
      }
    }
    
    // Get user
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }
    
    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      throw new UnauthorizedError('Password changed. Please login again');
    }
    
    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
        req.token = token;
      }
    } catch (error) {
      // Ignore token errors for optional auth
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require specific role(s)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    
    next();
  };
};

/**
 * Require verified phone number
 */
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }
  
  if (!req.user.isVerified) {
    return next(new ForbiddenError('Phone number verification required'));
  }
  
  next();
};

/**
 * Check if user is bill owner
 */
const isBillOwner = async (req, res, next) => {
  try {
    const { Bill } = require('../models');
    const billId = req.params.billId || req.params.id;
    
    if (!billId) {
      return next(new Error('Bill ID is required'));
    }
    
    const bill = await Bill.findById(billId);
    
    if (!bill) {
      return next(new Error('Bill not found'));
    }
    
    if (bill.createdBy.toString() !== req.user.id) {
      return next(new ForbiddenError('Only bill owner can perform this action'));
    }
    
    req.bill = bill;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user is bill participant
 */
const isBillParticipant = async (req, res, next) => {
  try {
    const { Bill } = require('../models');
    const billId = req.params.billId || req.params.id;
    
    if (!billId) {
      return next(new Error('Bill ID is required'));
    }
    
    const bill = await Bill.findById(billId);
    
    if (!bill) {
      return next(new Error('Bill not found'));
    }
    
    const isOwner = bill.createdBy.toString() === req.user.id;
    const isParticipant = bill.participants.some(
      p => p.user && p.user.toString() === req.user.id
    );
    
    if (!isOwner && !isParticipant) {
      return next(new ForbiddenError('Access denied'));
    }
    
    req.bill = bill;
    req.isOwner = isOwner;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Generate JWT tokens
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  
  const refreshToken = jwt.sign(
    { id: userId, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
  
  return { accessToken, refreshToken };
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new UnauthorizedError('Invalid refresh token');
  }
};

/**
 * Blacklist token (for logout)
 */
const blacklistToken = async (token) => {
  if (!redis.getClient()) return;
  
  try {
    const decoded = jwt.decode(token);
    if (!decoded) return;
    
    // Calculate remaining TTL
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    
    if (expiresIn > 0) {
      await redis.set(
        `${REDIS_KEYS.SESSION}blacklist:${token}`,
        '1',
        expiresIn
      );
    }
  } catch (error) {
    // Ignore blacklist errors
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  requireVerified,
  isBillOwner,
  isBillParticipant,
  generateTokens,
  verifyRefreshToken,
  blacklistToken,
};
