# Splitwise

A production-grade bill splitting application with receipt OCR, phone authentication, and itemized expense tracking.

## Features

- **Phone Authentication**: OTP-based login via SMS (Twilio)
- **Bill Management**: Create, share, and track shared expenses
- **Flexible Splitting**: Equal, by-item, percentage, or custom amounts
- **Receipt OCR**: Scan receipts with Tesseract.js
- **Real-time Updates**: Socket.io for live notifications
- **Payment Tracking**: Record and confirm settlements

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis
- **Auth**: JWT with refresh tokens
- **Validation**: Joi
- **Logging**: Winston with daily rotation

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI, Twilio credentials, etc.

# Run in development
npm run dev

# Run in production
npm start
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/otp/request` - Request OTP
- `POST /api/v1/auth/otp/verify` - Verify OTP and login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user

### Bills
- `GET /api/v1/bills` - List user's bills
- `POST /api/v1/bills` - Create a bill
- `GET /api/v1/bills/:id` - Get bill details
- `PATCH /api/v1/bills/:id` - Update bill
- `POST /api/v1/bills/:id/participants` - Add participant

### Items
- `GET /api/v1/bills/:billId/items` - List items
- `POST /api/v1/bills/:billId/items` - Add item
- `PATCH /api/v1/bills/:billId/items/:id` - Update item
- `POST /api/v1/bills/:billId/items/:id/assign` - Assign to participants

### Payments
- `GET /api/v1/bills/:billId/payments` - List payments
- `POST /api/v1/bills/:billId/payments` - Record payment
- `POST /api/v1/payments/:id/confirm` - Confirm payment

## Project Structure

```
backend/
├── config/         # Configuration (db, redis, constants)
├── controllers/    # Route handlers
├── middleware/     # Auth, validation, error handling
├── models/         # Mongoose schemas
├── routes/         # API routes
├── services/       # Business logic (OCR, SMS, notifications)
├── utils/          # Helpers, logger, errors
└── validators/     # Joi validation schemas

frontend/
TBD!
```
