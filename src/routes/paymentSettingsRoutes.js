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
const { protect } = require('../middleware/auth');
const { protectAdmin } = require('../middleware/adminAuth');

// Public route - get payment mode for frontend
router.get('/mode', getPaymentMode);

// Protected route - user submits UPI transaction ID
router.post('/submit-upi', protect, submitUPITransaction);

// Admin routes - use protectAdmin for admin authentication
router.get('/', protectAdmin, getPaymentSettings);
router.put('/', protectAdmin, updatePaymentSettings);
router.post('/upload-qr', protectAdmin, uploadQRCode);
router.get('/pending-verifications', protectAdmin, getPendingVerifications);
router.post('/verify-payment', protectAdmin, verifyUPIPayment);

module.exports = router;
