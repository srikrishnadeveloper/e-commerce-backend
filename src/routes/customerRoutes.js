const express = require('express');
const {
  getCustomers,
  getCustomerById,
  getCustomerWishlist,
  getCustomerOrders,
  getCustomerAnalytics,
  getCustomerStats,
  getCustomerSuggestions,
  exportCustomers
} = require('../controllers/customerController');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// All routes require admin authentication
router.use(protectAdmin);

// @route   GET /api/admin/customers/analytics/overview
// @desc    Get customer analytics overview
// @access  Private (Admin)
router.get('/analytics/overview', getCustomerAnalytics);

// @route   GET /api/admin/customers/stats
// @desc    Get customer statistics
// @access  Private (Admin)
router.get('/stats', getCustomerStats);

// @route   GET /api/admin/customers/search/suggestions
// @desc    Get customer search suggestions
// @access  Private (Admin)
router.get('/search/suggestions', getCustomerSuggestions);

// @route   GET /api/admin/customers/export
// @desc    Export customers data
// @access  Private (Admin)
router.get('/export', exportCustomers);

// @route   GET /api/admin/customers/:id/wishlist
// @desc    Get customer wishlist with pagination
// @access  Private (Admin)
router.get('/:id/wishlist', getCustomerWishlist);

// @route   GET /api/admin/customers/:id/orders
// @desc    Get customer order history with pagination
// @access  Private (Admin)
router.get('/:id/orders', getCustomerOrders);

// @route   GET /api/admin/customers/:id
// @desc    Get customer by ID with detailed information
// @access  Private (Admin)
router.get('/:id', getCustomerById);

// @route   GET /api/admin/customers
// @desc    Get all customers with filtering and pagination
// @access  Private (Admin)
router.get('/', getCustomers);

module.exports = router;
