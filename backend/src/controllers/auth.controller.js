const { User, OTP } = require('../models');
const { ApiError, UnauthorizedError, BadRequestError } = require('../utils/errors');
const { ApiResponse } = require('../utils/apiResponse');
const { generateTokens, blacklistToken, verifyRefreshToken } = require('../middleware/auth.middleware');
const { generateOTP } = require('../utils/helpers');
const logger = require('../utils/logger');

// Request OTP for login/registration
exports.requestOTP = async (req, res) => {
  const { phoneNumber, countryCode = '+1' } = req.body;
  const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;

  // Check rate limit (max 5 OTPs per hour)
  const recentCount = await OTP.getRecentCount(fullPhone, 60);
  if (recentCount >= 5) {
    throw new BadRequestError('Too many OTP requests. Please try again later.');
  }

  // Generate and save OTP
  const code = generateOTP();
  await OTP.createOTP(fullPhone, code, 'login');

  // TODO: Send OTP via SMS service
  logger.info(`OTP generated for ${fullPhone}: ${code}`); // Remove in production

  return ApiResponse.success(res, {
    message: 'OTP sent successfully',
    phoneNumber: fullPhone,
    expiresIn: 300 // 5 minutes
  });
};

// Verify OTP and login/register
exports.verifyOTP = async (req, res) => {
  const { phoneNumber, countryCode = '+1', code } = req.body;
  const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;

  // Verify OTP
  const otp = await OTP.verifyOTP(fullPhone, code, 'login');
  if (!otp) {
    throw new UnauthorizedError('Invalid or expired OTP');
  }

  // Find or create user
  let user = await User.findByPhoneNumber(fullPhone);
  let isNewUser = false;

  if (!user) {
    user = await User.create({
      phoneNumber: phoneNumber.replace(/\D/g, ''),
      countryCode,
      isVerified: true
    });
    isNewUser = true;
  } else if (!user.isVerified) {
    user.isVerified = true;
    await user.save();
  }

  // Generate tokens
  const tokens = generateTokens(user);

  return ApiResponse.success(res, {
    message: isNewUser ? 'Account created successfully' : 'Login successful',
    user: user.toPublicProfile(),
    tokens,
    isNewUser
  });
};

// Refresh access token
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const user = await User.findById(payload.userId);
  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found or inactive');
  }

  const tokens = generateTokens(user);

  return ApiResponse.success(res, { tokens });
};

// Logout
exports.logout = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    await blacklistToken(token);
  }

  return ApiResponse.success(res, { message: 'Logged out successfully' });
};

// Get current user
exports.me = async (req, res) => {
  return ApiResponse.success(res, { user: req.user.toPublicProfile() });
};
