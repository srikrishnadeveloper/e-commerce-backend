const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getFeaturedProducts,
  getBestsellerProducts,
  searchProducts,
  getProductStats,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus
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

// Route: GET /api/products/:id/related
router.get('/:id/related', getRelatedProducts);

// Route: PATCH /api/products/:id/status
router.patch('/:id/status', updateProductStatus);

// Route: PUT /api/products/:id
router.put('/:id', updateProduct);

// Route: DELETE /api/products/:id
router.delete('/:id', deleteProduct);

// Route: GET /api/products/:id
router.get('/:id', getProductById);

// Route: POST /api/products
router.post('/', createProduct);

// Route: GET /api/products
// This should be last to avoid conflicts with other routes
router.get('/', getAllProducts);

module.exports = router;
