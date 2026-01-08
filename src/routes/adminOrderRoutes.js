const express = require('express');
const {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  addOrderNotes,
  bulkUpdateStatus,
  getOrderAnalytics,
  updateOrderItems,
  updateShippingInfo,
  createReorder,
  processRefund,
  getRefundStats
} = require('../controllers/adminOrderController');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// All routes require admin authentication
router.use(protectAdmin);

// @route   GET /api/admin/orders/analytics/overview
// @desc    Get order analytics overview
// @access  Private (Admin)
router.get('/analytics/overview', getOrderAnalytics);

// @route   GET /api/admin/orders/refunds/stats
// @desc    Get refund statistics
// @access  Private (Admin)
router.get('/refunds/stats', getRefundStats);

// @route   POST /api/admin/orders/bulk/status
// @desc    Bulk update order status
// @access  Private (Admin)
router.post('/bulk/status', bulkUpdateStatus);

// @route   GET /api/admin/orders/:id
// @desc    Get order by ID with full details
// @access  Private (Admin)
router.get('/:id', getOrderById);

// @route   PATCH /api/admin/orders/:id/status
// @desc    Update order status
// @access  Private (Admin)
router.patch('/:id/status', updateOrderStatus);

// @route   PATCH /api/admin/orders/:id/payment
// @desc    Update payment status
// @access  Private (Admin)
router.patch('/:id/payment', updatePaymentStatus);

// @route   POST /api/admin/orders/:id/notes
// @desc    Add order notes
// @access  Private (Admin)
router.post('/:id/notes', addOrderNotes);

// @route   PATCH /api/admin/orders/:id/items
// @desc    Update order items
// @access  Private (Admin)
router.patch('/:id/items', updateOrderItems);

// @route   PATCH /api/admin/orders/:id/shipping
// @desc    Update shipping information
// @access  Private (Admin)
router.patch('/:id/shipping', updateShippingInfo);

// @route   POST /api/admin/orders/:id/reorder
// @desc    Create reorder from existing order
// @access  Private (Admin)
router.post('/:id/reorder', createReorder);

// @route   POST /api/admin/orders/:id/refund
// @desc    Process refund for an order
// @access  Private (Admin)
router.post('/:id/refund', processRefund);

// @route   GET /api/admin/orders
// @desc    Get all orders with filtering and pagination
// @access  Private (Admin)
router.get('/', getAllOrders);

module.exports = router;
