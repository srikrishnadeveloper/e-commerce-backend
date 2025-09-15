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

// @desc    Get category by ID
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = async (req, res) => {
  try {
    const categories = await Product.find().distinct('category');
    const categoryIndex = parseInt(req.params.id) - 1;
    
    if (categoryIndex < 0 || categoryIndex >= categories.length) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    const category = categories[categoryIndex];
    const productCount = await Product.countDocuments({ category });
    
    res.status(200).json({
      success: true,
      data: {
        id: parseInt(req.params.id),
        name: category,
        slug: category.toLowerCase().replace(/ /g, '-'),
        productCount
      }
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get products by category
// @route   GET /api/categories/:id/products
// @access  Public
const getCategoryProducts = async (req, res) => {
  try {
    const categories = await Product.find().distinct('category');
    const categoryIndex = parseInt(req.params.id) - 1;
    
    if (categoryIndex < 0 || categoryIndex >= categories.length) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    const categoryName = categories[categoryIndex];
    const products = await Product.find({ category: categoryName });
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error fetching category products:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get category stats
// @route   GET /api/categories/stats/overview
// @access  Public
const getCategoryStats = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          productCount: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          totalValue: { $sum: { $multiply: ['$price', '$stockQuantity'] } }
        }
      },
      {
        $sort: { productCount: -1 }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: categories.map((cat, index) => ({
        id: index + 1,
        name: cat._id,
        slug: cat._id.toLowerCase().replace(/ /g, '-'),
        productCount: cat.productCount,
        averagePrice: cat.averagePrice,
        totalValue: cat.totalValue
      }))
    });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Note: Create, Update, Delete operations would modify product categories
// For now, we'll return appropriate responses indicating these need to be handled via products

// @desc    Create category (placeholder - categories are derived from products)
// @route   POST /api/categories
// @access  Private
const createCategory = async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Categories are derived from products. Add products with new categories instead.'
  });
};

// @desc    Update category (placeholder - categories are derived from products)
// @route   PUT /api/categories/:id
// @access  Private
const updateCategory = async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Categories are derived from products. Update product categories instead.'
  });
};

// @desc    Delete category (placeholder - categories are derived from products)
// @route   DELETE /api/categories/:id
// @access  Private
const deleteCategory = async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Categories are derived from products. Remove all products in this category instead.'
  });
};

module.exports = {
  getCategories,
  getCategoryById,
  getCategoryProducts,
  getCategoryStats,
  createCategory,
  updateCategory,
  deleteCategory
};
