const express = require('express');
const {
  getDashboardMetrics,
  getRevenueAnalytics,
  getOrderAnalytics,
  getCustomerAnalytics,
  getProductAnalytics
} = require('../controllers/analyticsController');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// All routes require admin authentication
router.use(protectAdmin);

// Dashboard metrics - real-time KPIs
router.get('/dashboard', getDashboardMetrics);

// Revenue analytics with time series and forecasting
router.get('/revenue', getRevenueAnalytics);

// Order analytics - lifecycle, processing times, value distribution
router.get('/orders', getOrderAnalytics);

// Customer analytics - acquisition, retention, lifetime value
router.get('/customers', getCustomerAnalytics);

// Product performance analytics
router.get('/products', getProductAnalytics);

module.exports = router;
