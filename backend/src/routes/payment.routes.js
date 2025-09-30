const router = require('express').Router({ mergeParams: true });
const { paymentController } = require('../controllers');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { paymentValidators } = require('../validators');

router.use(authenticate);

// User's payment summary
router.get('/summary', asyncHandler(paymentController.getSummary));
router.get('/my', asyncHandler(paymentController.getMyPayments));

// Bill-scoped payment routes (mounted at /bills/:billId/payments)
router.route('/')
  .get(asyncHandler(paymentController.getForBill))
  .post(
    validate(paymentValidators.recordPayment), 
    asyncHandler(paymentController.create)
  );

router.post('/:id/confirm', asyncHandler(paymentController.confirm));

router.post('/:id/refund', 
  validate(paymentValidators.refundPayment), 
  asyncHandler(paymentController.refund)
);

module.exports = router;
