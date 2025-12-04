const express = require('express');
const {
  sendOTP,
  verifyOTP,
  resendOTP,
  signup,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateMe,
  updatePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes - Email verification
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Public routes - Authentication
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.patch('/updateMe', protect, updateMe);
router.patch('/updatePassword', protect, updatePassword);

module.exports = router;
