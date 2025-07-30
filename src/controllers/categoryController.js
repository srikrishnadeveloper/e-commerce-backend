const Product = require('../models/Product');

// @desc    Get all unique product categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    // Use distinct to get unique category values from the products collection
    const categories = await Product.find().distinct('category');
    
    if (!categories || categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No product categories found'
      });
    }
    
    // Format the response to match the old structure if needed
    const formattedCategories = categories.map((category, index) => ({
      id: index + 1, // Or generate a more stable ID if you have one
      name: category,
      slug: category.toLowerCase().replace(/ /g, '-')
    }));

    res.status(200).json({
      success: true,
      count: formattedCategories.length,
      data: formattedCategories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = {
  getCategories
};
