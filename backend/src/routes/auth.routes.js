const router = require('express').Router();
const { authController } = require('../controllers');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { authValidators } = require('../validators');

router.post('/otp/request', 
  validate(authValidators.requestOTP), 
  asyncHandler(authController.requestOTP)
);

router.post('/otp/verify', 
  validate(authValidators.verifyOTP), 
  asyncHandler(authController.verifyOTP)
);

router.post('/refresh', 
  validate(authValidators.refreshToken), 
  asyncHandler(authController.refreshToken)
);

router.post('/logout', 
  authenticate, 
  asyncHandler(authController.logout)
);

router.get('/me', 
  authenticate, 
  asyncHandler(authController.me)
);

module.exports = router;
