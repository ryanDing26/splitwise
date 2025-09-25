const { Payment, Bill } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { ApiResponse } = require('../utils/apiResponse');

// Record payment
exports.create = async (req, res) => {
  const bill = await Bill.findById(req.params.billId);
  if (!bill) throw new NotFoundError('Bill not found');

  const payment = await Payment.create({
    ...req.body,
    bill: req.params.billId,
    payer: req.user._id,
    recordedBy: req.user._id
  });

  await payment.populate('payer', 'name phoneNumber');

  return ApiResponse.created(res, { payment });
};

// Get payments for bill
exports.getForBill = async (req, res) => {
  const payments = await Payment.find({ bill: req.params.billId })
    .populate('payer', 'name phoneNumber')
    .populate('receiver', 'name phoneNumber')
    .sort({ createdAt: -1 });

  return ApiResponse.success(res, { payments });
};

// Get user's payments
exports.getMyPayments = async (req, res) => {
  const payments = await Payment.getByUser(req.user._id);
  return ApiResponse.success(res, { payments });
};

// Confirm payment
exports.confirm = async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new NotFoundError('Payment not found');

  // Only receiver can confirm
  const bill = await Bill.findById(payment.bill);
  if (!bill.createdBy.equals(req.user._id) && !payment.receiver?.equals(req.user._id)) {
    throw new ForbiddenError('Not authorized to confirm');
  }

  await payment.confirm();

  return ApiResponse.success(res, { payment });
};

// Refund payment
exports.refund = async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new NotFoundError('Payment not found');

  const bill = await Bill.findById(payment.bill);
  if (!bill.createdBy.equals(req.user._id)) {
    throw new ForbiddenError('Not authorized');
  }

  await payment.processRefund(req.body.amount, req.body.reason);

  return ApiResponse.success(res, { payment });
};

// Get payment summary for user
exports.getSummary = async (req, res) => {
  const summary = await Payment.getUserSummary(req.user._id);
  return ApiResponse.success(res, { summary });
};
