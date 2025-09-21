const Category = require('../models/Category');
const Product = require('../models/Product');

// @desc    Get all categories with filtering and pagination
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      status = 'all',
      sortBy = 'displayOrder',
      sortOrder = 'asc',
      includeProductCount = 'false'
    } = req.query;

    // Build query
    const query = {};

    // Filter by status (for frontend, only show active; for admin, show all or filter by status)
    if (status !== 'all') {
      query.status = status;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // If sorting by displayOrder, add name as secondary sort
    if (sortBy === 'displayOrder') {
      sortOptions.name = 1;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    let categories;
    if (includeProductCount === 'true') {
      categories = await Category.findWithProductCounts();
      // Apply pagination to the result
      categories = categories.slice(skip, skip + parseInt(limit));
    } else {
      categories = await Category.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));
    }

    // Get total count for pagination
    const total = await Category.countDocuments(query);

    res.status(200).json({
      success: true,
      count: categories.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: categories
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
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get product count for this category
    const productCount = await Product.countDocuments({ categoryId: category._id.toString() });

    // Add product count to response
    const categoryData = category.toObject();
    categoryData.productCount = productCount;

    res.status(200).json({
      success: true,
      data: categoryData
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
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // For public access, only return products if category is active
    if (category.status !== 'active' && !req.query.admin) {
      return res.status(404).json({
        success: false,
        message: 'Category not available'
      });
    }

    const {
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'name',
      sortOrder = 'asc',
      inStock,
      featured,
      bestseller
    } = req.query;

    // Build product query
    const productQuery = { categoryId: category._id.toString() };

    // Add filters
    if (search) {
      productQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (inStock !== undefined) {
      productQuery.inStock = inStock === 'true';
    }

    if (featured !== undefined) {
      productQuery.featured = featured === 'true';
    }

    if (bestseller !== undefined) {
      productQuery.bestseller = bestseller === 'true';
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(productQuery)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(productQuery);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      category: {
        id: category._id,
        name: category.name,
        slug: category.slug,
        status: category.status
      },
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
    const categories = await Category.find().sort({ displayOrder: 1, name: 1 });

    const stats = await Promise.all(categories.map(async (category) => {
      const products = await Product.find({ categoryId: category._id.toString() });

      const productCount = products.length;
      const averagePrice = productCount > 0
        ? products.reduce((sum, product) => sum + product.price, 0) / productCount
        : 0;
      const totalValue = products.reduce((sum, product) => sum + (product.price * (product.stockQuantity || 1)), 0);
      const activeProducts = products.filter(p => p.inStock).length;

      return {
        id: category._id,
        name: category.name,
        slug: category.slug,
        status: category.status,
        productCount,
        activeProducts,
        averagePrice: Math.round(averagePrice * 100) / 100,
        totalValue: Math.round(totalValue * 100) / 100,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      };
    }));

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private
const createCategory = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      status = 'active',
      metaTitle,
      metaDescription,
      image,
      displayOrder = 0,
      adminNotes
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Check if category with same name already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Create new category
    const category = new Category({
      name,
      slug,
      description,
      status,
      metaTitle,
      metaDescription,
      image,
      displayOrder,
      adminNotes
    });

    const savedCategory = await category.save();

    res.status(201).json({
      success: true,
      data: savedCategory
    });
  } catch (error) {
    console.error('Error creating category:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Category with this ${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const {
      name,
      slug,
      description,
      status,
      metaTitle,
      metaDescription,
      image,
      displayOrder,
      adminNotes
    } = req.body;

    // Check if name is being changed and if new name already exists
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    // Update fields
    if (name !== undefined) category.name = name;
    if (slug !== undefined) category.slug = slug;
    if (description !== undefined) category.description = description;
    if (status !== undefined) category.status = status;
    if (metaTitle !== undefined) category.metaTitle = metaTitle;
    if (metaDescription !== undefined) category.metaDescription = metaDescription;
    if (image !== undefined) category.image = image;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;
    if (adminNotes !== undefined) category.adminNotes = adminNotes;

    const updatedCategory = await category.save();

    res.status(200).json({
      success: true,
      data: updatedCategory
    });
  } catch (error) {
    console.error('Error updating category:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Category with this ${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ categoryId: category._id.toString() });

    if (productCount > 0) {
      const { reassignTo } = req.query;

      if (!reassignTo) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category. It has ${productCount} products. Please reassign products to another category first.`,
          productCount,
          requiresReassignment: true
        });
      }

      // Validate reassignment category
      const reassignCategory = await Category.findById(reassignTo);
      if (!reassignCategory) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reassignment category'
        });
      }

      // Reassign all products to the new category
      await Product.updateMany(
        { categoryId: category._id.toString() },
        {
          categoryId: reassignTo,
          category: reassignCategory.name // Update the category name as well
        }
      );
    }

    // Delete the category
    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      productsReassigned: productCount > 0 ? productCount : 0
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Toggle category status (enable/disable)
// @route   PATCH /api/categories/:id/toggle-status
// @access  Private
const toggleCategoryStatus = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Toggle status
    category.status = category.status === 'active' ? 'disabled' : 'active';
    const updatedCategory = await category.save();

    res.status(200).json({
      success: true,
      message: `Category ${updatedCategory.status === 'active' ? 'enabled' : 'disabled'} successfully`,
      data: updatedCategory
    });
  } catch (error) {
    console.error('Error toggling category status:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Bulk update category status
// @route   PATCH /api/categories/bulk-status
// @access  Private
const bulkUpdateStatus = async (req, res) => {
  try {
    const { categoryIds, status } = req.body;

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category IDs array is required'
      });
    }

    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "active" or "disabled"'
      });
    }

    const result = await Category.updateMany(
      { _id: { $in: categoryIds } },
      { status }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} categories updated successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk updating category status:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Migrate existing product categories to new category system
// @route   POST /api/categories/migrate
// @access  Private
const migrateCategories = async (req, res) => {
  try {
    const migrations = await Category.migrateFromProducts();

    res.status(200).json({
      success: true,
      message: 'Categories migrated successfully',
      data: migrations
    });
  } catch (error) {
    console.error('Error migrating categories:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Fix categories that don't have proper ObjectIds
// @route   POST /api/categories/fix-ids
// @access  Private
const fixCategoryIds = async (req, res) => {
  try {
    // Find categories that don't have proper _id fields
    const categories = await Category.find({});
    const fixed = [];

    for (let category of categories) {
      // If category doesn't have a proper _id, recreate it
      if (!category._id || category._id === null) {
        const categoryData = {
          name: category.name,
          slug: category.slug,
          description: category.description,
          status: category.status || 'active',
          metaTitle: category.metaTitle,
          metaDescription: category.metaDescription,
          image: category.image,
          displayOrder: category.displayOrder || 0,
          adminNotes: category.adminNotes
        };

        // Delete the old category
        await Category.deleteOne({ name: category.name });

        // Create new category with proper ObjectId
        const newCategory = new Category(categoryData);
        const savedCategory = await newCategory.save();

        // Update products to use the new category ID
        await Product.updateMany(
          { category: category.name },
          { categoryId: savedCategory._id.toString() }
        );

        fixed.push({
          name: category.name,
          oldId: category._id,
          newId: savedCategory._id,
          productsUpdated: await Product.countDocuments({ category: category.name })
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Category IDs fixed successfully',
      data: fixed
    });
  } catch (error) {
    console.error('Error fixing category IDs:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  getCategoryProducts,
  getCategoryStats,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  bulkUpdateStatus,
  migrateCategories,
  fixCategoryIds
};
