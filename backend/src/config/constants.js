/**
 * @fileoverview Application-wide constants
 */

module.exports = {
  // User Roles
  ROLES: {
    USER: 'user',
    ADMIN: 'admin',
  },
  
  // Bill Status
  BILL_STATUS: {
    DRAFT: 'draft',
    ACTIVE: 'active',
    SETTLED: 'settled',
    CANCELLED: 'cancelled',
  },
  
  // Payment Status
  PAYMENT_STATUS: {
    PENDING: 'pending',
    PARTIAL: 'partial',
    PAID: 'paid',
    OVERDUE: 'overdue',
  },
  
  // Item Assignment Type
  ASSIGNMENT_TYPE: {
    EQUAL: 'equal',          // Split equally among all participants
    SPECIFIC: 'specific',    // Assigned to specific participants
    PROPORTIONAL: 'proportional', // Based on proportion/percentage
  },
  
  // Split Method
  SPLIT_METHOD: {
    EQUAL: 'equal',
    BY_ITEM: 'by_item',
    BY_PERCENTAGE: 'by_percentage',
    BY_AMOUNT: 'by_amount',
    BY_SHARES: 'by_shares',
  },
  
  // Notification Types
  NOTIFICATION_TYPE: {
    BILL_CREATED: 'bill_created',
    ITEM_ASSIGNED: 'item_assigned',
    PAYMENT_REMINDER: 'payment_reminder',
    PAYMENT_RECEIVED: 'payment_received',
    BILL_SETTLED: 'bill_settled',
    PARTICIPANT_ADDED: 'participant_added',
    PARTICIPANT_REMOVED: 'participant_removed',
  },
  
  // OCR Status
  OCR_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    MANUAL_REVIEW: 'manual_review',
  },
  
  // Supported Currencies
  CURRENCIES: {
    USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
    INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  },
  
  // Default Currency
  DEFAULT_CURRENCY: 'USD',
  
  // Pagination Defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
  
  // Cache TTL (in seconds)
  CACHE_TTL: {
    SHORT: 60,           // 1 minute
    MEDIUM: 300,         // 5 minutes
    LONG: 3600,          // 1 hour
    VERY_LONG: 86400,    // 24 hours
    OTP: 300,            // 5 minutes for OTP
  },
  
  // Redis Key Prefixes
  REDIS_KEYS: {
    OTP: 'otp:',
    SESSION: 'session:',
    USER_CACHE: 'user:',
    BILL_CACHE: 'bill:',
    RATE_LIMIT: 'rate_limit:',
    REFRESH_TOKEN: 'refresh_token:',
  },
  
  // File Upload
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_MIME_TYPES: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
    ],
    IMAGE_QUALITY: 80,
    MAX_WIDTH: 2000,
    MAX_HEIGHT: 2000,
  },
  
  // Phone Number
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
  },
  
  // Expense Categories
  EXPENSE_CATEGORIES: [
    'food',
    'drinks',
    'groceries',
    'entertainment',
    'travel',
    'utilities',
    'rent',
    'shopping',
    'healthcare',
    'education',
    'other',
  ],
  
  // Tax Types
  TAX_TYPES: {
    PERCENTAGE: 'percentage',
    FIXED: 'fixed',
  },
  
  // HTTP Status Messages
  HTTP_MESSAGES: {
    OK: 'Success',
    CREATED: 'Resource created successfully',
    BAD_REQUEST: 'Bad request',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    NOT_FOUND: 'Resource not found',
    CONFLICT: 'Resource already exists',
    UNPROCESSABLE_ENTITY: 'Validation failed',
    TOO_MANY_REQUESTS: 'Too many requests',
    INTERNAL_ERROR: 'Internal server error',
  },
  
  // Event Names (for EventEmitter)
  EVENTS: {
    BILL_CREATED: 'bill:created',
    BILL_UPDATED: 'bill:updated',
    BILL_DELETED: 'bill:deleted',
    BILL_SETTLED: 'bill:settled',
    ITEM_ADDED: 'item:added',
    ITEM_ASSIGNED: 'item:assigned',
    PARTICIPANT_ADDED: 'participant:added',
    PARTICIPANT_REMOVED: 'participant:removed',
    PAYMENT_RECORDED: 'payment:recorded',
    OCR_COMPLETED: 'ocr:completed',
    OCR_FAILED: 'ocr:failed',
  },
  
  // Regex Patterns
  REGEX: {
    PHONE: /^\+?[1-9]\d{9,14}$/,
    MONGO_ID: /^[a-fA-F0-9]{24}$/,
    CURRENCY_CODE: /^[A-Z]{3}$/,
  },
};
