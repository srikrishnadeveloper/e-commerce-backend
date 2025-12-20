const express = require('express');
const router = express.Router();
const {
  getPaymentMode,
  getPaymentSettings,
  updatePaymentSettings,
  uploadQRCode,
  submitUPITransaction,
  getPendingVerifications,
  verifyUPIPayment
} = require('../controllers/paymentSettingsController');
const { protect, restrictTo } = require('../middleware/auth');

// Public route - get payment mode for frontend
router.get('/mode', getPaymentMode);

// Protected route - user submits UPI transaction ID
router.post('/submit-upi', protect, submitUPITransaction);

// Admin routes
router.get('/', protect, restrictTo('admin'), getPaymentSettings);
router.put('/', protect, restrictTo('admin'), updatePaymentSettings);
router.post('/upload-qr', protect, restrictTo('admin'), uploadQRCode);
router.get('/pending-verifications', protect, restrictTo('admin'), getPendingVerifications);
router.post('/verify-payment', protect, restrictTo('admin'), verifyUPIPayment);

module.exports = router;
