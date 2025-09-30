const router = require('express').Router({ mergeParams: true });
const { itemController } = require('../controllers');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { itemValidators } = require('../validators');

router.use(authenticate);

// Bill-scoped routes (mounted at /bills/:billId/items)
router.route('/')
  .get(asyncHandler(itemController.getForBill))
  .post(
    validate(itemValidators.createItem), 
    asyncHandler(itemController.create)
  );

router.post('/bulk', 
  validate(itemValidators.bulkCreateItems), 
  asyncHandler(itemController.bulkCreate)
);

// Item-specific routes
router.route('/:id')
  .get(asyncHandler(itemController.getOne))
  .patch(
    validate(itemValidators.updateItem), 
    asyncHandler(itemController.update)
  )
  .delete(asyncHandler(itemController.delete));

router.post('/:id/assign', 
  validate(itemValidators.assignItem), 
  asyncHandler(itemController.assign)
);

router.patch('/:id/assignments/:assignmentId', 
  validate(itemValidators.updateAssignment), 
  asyncHandler(itemController.updateAssignment)
);

module.exports = router;
