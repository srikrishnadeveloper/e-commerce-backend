const express = require('express');
const { getCategories } = require('../controllers/categoryController');

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all product categories
// @access  Public
router.get('/', getCategories);

module.exports = router;
