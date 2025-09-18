/**
 * @fileoverview Validator exports
 */

const authValidator = require('./auth.validator');
const billValidator = require('./bill.validator');
const itemValidator = require('./item.validator');
const paymentValidator = require('./payment.validator');
const userValidator = require('./user.validator');

module.exports = {
  authValidators: authValidator,
  billValidators: billValidator,
  itemValidators: itemValidator,
  paymentValidators: paymentValidator,
  userValidators: userValidator,
};
