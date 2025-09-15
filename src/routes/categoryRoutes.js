const express = require('express');
const { 
  getCategories, 
  getCategoryById, 
  getCategoryProducts, 
  getCategoryStats,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all product categories
// @access  Public
router.get('/', getCategories);

// @route   GET /api/categories/stats/overview
// @desc    Get category statistics
// @access  Public
router.get('/stats/overview', getCategoryStats);

// @route   GET /api/categories/:id
// @desc    Get category by ID
// @access  Public
router.get('/:id', getCategoryById);

// @route   GET /api/categories/:id/products
// @desc    Get products by category
// @access  Public
router.get('/:id/products', getCategoryProducts);

// @route   POST /api/categories
// @desc    Create category (placeholder)
// @access  Private
router.post('/', createCategory);

// @route   PUT /api/categories/:id
// @desc    Update category (placeholder)
// @access  Private
router.put('/:id', updateCategory);

// @route   DELETE /api/categories/:id
// @desc    Delete category (placeholder)
// @access  Private
router.delete('/:id', deleteCategory);

module.exports = router;
