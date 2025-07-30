const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getFeaturedProducts,
  getBestsellerProducts,
  searchProducts,
  getProductStats
} = require('../controllers/productController');

// Route: GET /api/products/featured
// Must be defined before /api/products/:id to avoid conflicts
router.get('/featured', getFeaturedProducts);

// Route: GET /api/products/bestsellers
router.get('/bestsellers', getBestsellerProducts);

// Route: GET /api/products/search
router.get('/search', searchProducts);

// Route: GET /api/products/stats
router.get('/stats', getProductStats);

// Route: GET /api/products/category/:categoryId
router.get('/category/:categoryId', getProductsByCategory);

// Route: GET /api/products/:id
router.get('/:id', getProductById);

// Route: GET /api/products
// This should be last to avoid conflicts with other routes
router.get('/', getAllProducts);

module.exports = router;
