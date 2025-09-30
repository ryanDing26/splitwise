const router = require('express').Router();
const { billController } = require('../controllers');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { billValidators } = require('../validators');

// All routes require auth
router.use(authenticate);

router.route('/')
  .get(
    validate(billValidators.queryParams), 
    asyncHandler(billController.getAll)
  )
  .post(
    validate(billValidators.createBill), 
    asyncHandler(billController.create)
  );

router.route('/:id')
  .get(asyncHandler(billController.getOne))
  .patch(
    validate(billValidators.updateBill), 
    asyncHandler(billController.update)
  )
  .delete(asyncHandler(billController.delete));

router.post('/:id/participants', 
  validate(billValidators.addParticipant), 
  asyncHandler(billController.addParticipant)
);

router.delete('/:id/participants/:participantId', 
  asyncHandler(billController.removeParticipant)
);

router.get('/:id/split', 
  asyncHandler(billController.calculateSplit)
);

module.exports = router;
