const { Bill, Item, Payment } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { ApiResponse } = require('../utils/apiResponse');
const { parsePagination, parseSort } = require('../utils/helpers');

// Create bill
exports.create = async (req, res) => {
  const bill = await Bill.create({
    ...req.body,
    createdBy: req.user._id
  });

  return ApiResponse.created(res, { bill });
};

// Get all bills for user
exports.getAll = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sort = parseSort(req.query.sort) || { createdAt: -1 };

  const filter = { status: { $ne: 'cancelled' } };
  if (req.query.status) filter.status = req.query.status;

  const [bills, total] = await Promise.all([
    Bill.findForUser(req.user._id)
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name phoneNumber'),
    Bill.findForUser(req.user._id).find(filter).countDocuments()
  ]);

  return ApiResponse.paginated(res, bills, { page, limit, total });
};

// Get single bill
exports.getOne = async (req, res) => {
  const bill = await Bill.findOne({ 
    $or: [{ _id: req.params.id }, { code: req.params.id.toUpperCase() }]
  })
    .populate('createdBy', 'name phoneNumber avatar')
    .populate('participants.user', 'name phoneNumber avatar');

  if (!bill) throw new NotFoundError('Bill not found');

  // Check access
  const isOwner = bill.createdBy._id.equals(req.user._id);
  const isParticipant = bill.participants.some(p => p.user?._id?.equals(req.user._id));
  
  if (!isOwner && !isParticipant && !bill.isPublic) {
    throw new ForbiddenError('Access denied');
  }

  // Get items and payments
  const [items, payments] = await Promise.all([
    Item.findForBill(bill._id),
    Payment.find({ bill: bill._id }).populate('payer', 'name phoneNumber')
  ]);

  return ApiResponse.success(res, { bill, items, payments });
};

// Update bill
exports.update = async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) throw new NotFoundError('Bill not found');
  if (!bill.createdBy.equals(req.user._id)) throw new ForbiddenError('Not authorized');

  Object.assign(bill, req.body);
  await bill.save();

  return ApiResponse.success(res, { bill });
};

// Delete bill
exports.delete = async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) throw new NotFoundError('Bill not found');
  if (!bill.createdBy.equals(req.user._id)) throw new ForbiddenError('Not authorized');

  bill.status = 'cancelled';
  await bill.save();

  return ApiResponse.success(res, { message: 'Bill deleted' });
};

// Add participant
exports.addParticipant = async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) throw new NotFoundError('Bill not found');
  if (!bill.createdBy.equals(req.user._id)) throw new ForbiddenError('Not authorized');

  await bill.addParticipant(req.body);
  await bill.populate('participants.user', 'name phoneNumber avatar');

  return ApiResponse.success(res, { bill });
};

// Remove participant
exports.removeParticipant = async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) throw new NotFoundError('Bill not found');
  if (!bill.createdBy.equals(req.user._id)) throw new ForbiddenError('Not authorized');

  await bill.removeParticipant(req.params.participantId);

  return ApiResponse.success(res, { bill });
};

// Calculate split
exports.calculateSplit = async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) throw new NotFoundError('Bill not found');

  const split = await bill.calculateSplit();

  return ApiResponse.success(res, { split });
};
