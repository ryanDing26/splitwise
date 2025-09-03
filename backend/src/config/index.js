/**
 * @fileoverview Central configuration management
 * Loads and validates all environment variables
 */

require('dotenv').config();

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',
  
  // MongoDB
  mongodb: {
    uri: process.env.NODE_ENV === 'test' 
      ? process.env.MONGODB_URI_TEST 
      : process.env.MONGODB_URI,
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  // Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  
  // OCR
  ocr: {
    provider: process.env.OCR_PROVIDER || 'tesseract',
    googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY,
  },
  
  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024,
    path: process.env.UPLOAD_PATH || './uploads',
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp')
      .split(','),
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    otpMaxRequests: parseInt(process.env.OTP_RATE_LIMIT_MAX, 10) || 5,
  },
  
  // OTP
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5,
    length: parseInt(process.env.OTP_LENGTH, 10) || 6,
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    filePath: process.env.LOG_FILE_PATH || './logs',
  },
  
  // CORS
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  
  // Feature Flags
  features: {
    smsEnabled: process.env.NODE_ENV === 'production',
    pushNotificationsEnabled: !!process.env.FIREBASE_PROJECT_ID,
  }
};

// Validation
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

const validateConfig = () => {
  const missing = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );
  
  if (missing.length > 0 && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Only validate in non-test environments
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

module.exports = config;
