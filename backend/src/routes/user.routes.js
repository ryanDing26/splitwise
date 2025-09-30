const router = require('express').Router();
const { userController } = require('../controllers');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { userValidators } = require('../validators');

router.use(authenticate);

router.patch('/profile', 
  validate(userValidators.updateProfile), 
  asyncHandler(userController.updateProfile)
);

router.patch('/preferences', 
  validate(userValidators.updatePreferences), 
  asyncHandler(userController.updatePreferences)
);

router.get('/search', 
  validate(userValidators.searchUsers), 
  asyncHandler(userController.search)
);

router.get('/:id', asyncHandler(userController.getUser));

router.post('/deactivate', 
  validate(userValidators.deactivateAccount), 
  asyncHandler(userController.deactivate)
);

module.exports = router;
