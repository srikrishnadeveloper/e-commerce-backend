const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { protectAdmin } = require('../middleware/adminAuth');

// All routes require admin authentication
router.use(protectAdmin);

// Get available export types
router.get('/types', exportController.getExportTypes);

// Export orders
router.get('/orders', exportController.exportOrders);

// Export customers
router.get('/customers', exportController.exportCustomers);

// Export products
router.get('/products', exportController.exportProducts);

// Export sales report
router.get('/sales', exportController.exportSalesReport);

module.exports = router;
