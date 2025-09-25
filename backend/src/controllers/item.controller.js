const { Item, Bill } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { ApiResponse } = require('../utils/apiResponse');

// Helper to check bill access
const checkBillAccess = async (billId, userId) => {
  const bill = await Bill.findById(billId);
  if (!bill) throw new NotFoundError('Bill not found');
  if (!bill.createdBy.equals(userId)) throw new ForbiddenError('Not authorized');
  return bill;
};

// Create item
exports.create = async (req, res) => {
  await checkBillAccess(req.params.billId, req.user._id);

  const item = await Item.create({
    ...req.body,
    bill: req.params.billId
  });

  return ApiResponse.created(res, { item });
};

// Bulk create items
exports.bulkCreate = async (req, res) => {
  await checkBillAccess(req.params.billId, req.user._id);

  const items = await Item.insertMany(
    req.body.items.map((item, idx) => ({
      ...item,
      bill: req.params.billId,
      sortOrder: item.sortOrder ?? idx
    }))
  );

  return ApiResponse.created(res, { items });
};

// Get items for bill
exports.getForBill = async (req, res) => {
  const items = await Item.findForBill(req.params.billId);
  return ApiResponse.success(res, { items });
};

// Get single item
exports.getOne = async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) throw new NotFoundError('Item not found');

  return ApiResponse.success(res, { item });
};

// Update item
exports.update = async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) throw new NotFoundError('Item not found');

  await checkBillAccess(item.bill, req.user._id);

  Object.assign(item, req.body);
  if (req.body.unitPrice || req.body.quantity) {
    item.isManuallyEdited = true;
  }
  await item.save();

  return ApiResponse.success(res, { item });
};

// Delete item
exports.delete = async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) throw new NotFoundError('Item not found');

  await checkBillAccess(item.bill, req.user._id);
  await item.deleteOne();

  return ApiResponse.success(res, { message: 'Item deleted' });
};

// Assign item to participants
exports.assign = async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) throw new NotFoundError('Item not found');

  await checkBillAccess(item.bill, req.user._id);

  const { participantIds, assignmentType = 'equal' } = req.body;
  
  item.clearAssignments();
  item.assignmentType = assignmentType;

  for (const participantId of participantIds) {
    item.addAssignment({ participantId });
  }

  await item.save();

  return ApiResponse.success(res, { item });
};

// Update single assignment
exports.updateAssignment = async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) throw new NotFoundError('Item not found');

  await checkBillAccess(item.bill, req.user._id);

  const assignment = item.assignments.id(req.params.assignmentId);
  if (!assignment) throw new NotFoundError('Assignment not found');

  Object.assign(assignment, req.body);
  await item.save();

  return ApiResponse.success(res, { item });
};
