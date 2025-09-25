const { User } = require('../models');
const { NotFoundError } = require('../utils/errors');
const { ApiResponse } = require('../utils/apiResponse');

// Update profile
exports.updateProfile = async (req, res) => {
  const { name, email, avatar } = req.body;
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, email, avatar },
    { new: true, runValidators: true }
  );

  return ApiResponse.success(res, { user: user.toPublicProfile() });
};

// Update preferences
exports.updatePreferences = async (req, res) => {
  const user = await User.findById(req.user._id);
  
  user.preferences = { ...user.preferences, ...req.body };
  await user.save();

  return ApiResponse.success(res, { preferences: user.preferences });
};

// Search users by phone
exports.search = async (req, res) => {
  const { phone } = req.query;
  
  const users = await User.find({
    phoneNumber: { $regex: phone.replace(/\D/g, ''), $options: 'i' },
    isActive: true
  })
    .select('name phoneNumber avatar')
    .limit(10);

  return ApiResponse.success(res, { users });
};

// Get user by ID
exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id).select('name phoneNumber avatar');
  if (!user) throw new NotFoundError('User not found');

  return ApiResponse.success(res, { user });
};

// Deactivate account
exports.deactivate = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { isActive: false });
  return ApiResponse.success(res, { message: 'Account deactivated' });
};
