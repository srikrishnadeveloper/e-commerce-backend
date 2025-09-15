const Product = require('../models/Product');

// @desc    Get all products with optional filtering and pagination
// @route   GET /api/products
// @access  Public
const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      featured,
      bestseller,
      inStock,
      minPrice,
      maxPrice,
      sort = 'createdAt',
      order = 'desc',
      search
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (category) filter.categoryId = category;
    if (featured === 'true') filter.featured = true;
    if (bestseller === 'true') filter.bestseller = true;
    if (inStock === 'true') filter.inStock = true;
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination
    const products = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:categoryId
// @access  Public
const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query;

    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find products by category
    const products = await Product.find({ categoryId, inStock: true })
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Product.countDocuments({ categoryId, inStock: true });
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products by category',
      error: error.message
    });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const products = await Product.find({ featured: true, inStock: true })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured products',
      error: error.message
    });
  }
};

// @desc    Get bestseller products
// @route   GET /api/products/bestsellers
// @access  Public
const getBestsellerProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const products = await Product.find({ bestseller: true, inStock: true })
      .sort({ rating: -1, reviews: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching bestseller products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bestseller products',
      error: error.message
    });
  }
};

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Search products using text index
    const products = await Product.find({
      $text: { $search: q },
      inStock: true
    })
      .sort({ score: { $meta: 'textScore' }, rating: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Product.countDocuments({
      $text: { $search: q },
      inStock: true
    });
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      },
      searchQuery: q
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching products',
      error: error.message
    });
  }
};

// @desc    Get product statistics
// @route   GET /api/products/stats
// @access  Public
const getProductStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const featuredProducts = await Product.countDocuments({ featured: true });
    const bestsellerProducts = await Product.countDocuments({ bestseller: true });
    const inStockProducts = await Product.countDocuments({ inStock: true });

    res.json({
      success: true,
      data: {
        totalProducts,
        featuredProducts,
        bestsellerProducts,
        inStockProducts
      }
    });
  } catch (error) {
    console.error('Error fetching product stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product statistics',
      error: error.message
    });
  }
};

// @desc    Get related products for a specific product
// @route   GET /api/products/:id/related
// @access  Public
const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 4 } = req.query;

    // Get the current product to find its category
    const currentProduct = await Product.findById(id);
    
    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find related products from the same category, excluding the current product
    const relatedProducts = await Product.find({
      categoryId: currentProduct.categoryId,
      _id: { $ne: id } // Exclude current product
    })
    .limit(parseInt(limit))
    .sort({ featured: -1, bestseller: -1, createdAt: -1 }); // Prioritize featured and bestseller products

    res.json({
      success: true,
      data: relatedProducts
    });
  } catch (error) {
    console.error('Error fetching related products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching related products',
      error: error.message
    });
  }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Private (Admin only)
const createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();

    res.status(201).json({
      success: true,
      data: savedProduct,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Admin only)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

// @desc    Update product status (featured, bestseller, inStock)
// @route   PATCH /api/products/:id/status
// @access  Private (Admin only)
const updateProductStatus = async (req, res) => {
  try {
    const { featured, bestseller, inStock } = req.body;
    const updateFields = {};
    
    if (featured !== undefined) updateFields.featured = featured;
    if (bestseller !== undefined) updateFields.bestseller = bestseller;
    if (inStock !== undefined) updateFields.inStock = inStock;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product,
      message: 'Product status updated successfully'
    });
  } catch (error) {
    console.error('Error updating product status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product status',
      error: error.message
    });
  }
};

module.exports = {
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
};
