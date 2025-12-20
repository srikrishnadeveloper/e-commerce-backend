const express = require('express');
const {
  initiatePayment,
  processPayment,
  getPaymentStatus,
  processCOD,
  getPaymentMethods,
  createRazorpayOrder,
  verifyRazorpayPayment
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/methods', getPaymentMethods);

// Protected routes
router.post('/initiate', protect, initiatePayment);
router.post('/process', protect, processPayment);
router.post('/cod', protect, processCOD);
router.post('/razorpay/order', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);
router.get('/:orderId/status', protect, getPaymentStatus);

module.exports = router;
