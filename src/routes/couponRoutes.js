const express = require('express');
const {
  applyCoupon,
  removeCoupon,
  getActiveCoupons,
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus
} = require('../controllers/couponController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/active', getActiveCoupons);

// Protected routes (user)
router.post('/apply', protect, applyCoupon);
router.post('/remove', protect, removeCoupon);

// Admin routes (TODO: Add admin auth middleware)
router.get('/', getAllCoupons);
router.get('/:id', getCouponById);
router.post('/', createCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);
router.patch('/:id/toggle', toggleCouponStatus);

module.exports = router;
