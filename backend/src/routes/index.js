const router = require('express').Router();

const authRoutes = require('./auth.routes');
const billRoutes = require('./bill.routes');
const itemRoutes = require('./item.routes');
const paymentRoutes = require('./payment.routes');
const userRoutes = require('./user.routes');

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/bills', billRoutes);
router.use('/bills/:billId/items', itemRoutes);
router.use('/bills/:billId/payments', paymentRoutes);
router.use('/payments', paymentRoutes); // Also mount at top level for /payments/summary
router.use('/users', userRoutes);

module.exports = router;
