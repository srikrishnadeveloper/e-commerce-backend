const mongoose = require('mongoose');
const { Schema } = mongoose;

// Category Schema definition for independent category management
const categorySchema = new Schema({
  // Basic category information
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  
  slug: {
    type: String,
    required: [true, 'Category slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Category status for enable/disable functionality
  status: {
    type: String,
    enum: ['active', 'disabled'],
    default: 'active',
    required: true
  },
  
  // SEO and display information
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'Meta title cannot exceed 60 characters']
  },
  
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  
  // Category image for display
  image: {
    type: String,
    trim: true
  },
  
  // Display order for sorting categories
  displayOrder: {
    type: Number,
    default: 0
  },
  
  // Category statistics (computed fields)
  productCount: {
    type: Number,
    default: 0
  },
  
  // Parent category for hierarchical categories (future enhancement)
  parentCategory: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  
  // Admin notes
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ status: 1 });
categorySchema.index({ displayOrder: 1 });
categorySchema.index({ createdAt: -1 });

// Virtual for checking if category is active
categorySchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Virtual for getting full URL slug
categorySchema.virtual('fullSlug').get(function() {
  return `/products?category=${this.slug}`;
});

// Virtual for id field (maps to _id)
categorySchema.virtual('id').get(function() {
  return this._id ? this._id.toHexString() : null;
});

// Pre-save middleware to generate slug from name if not provided
categorySchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }
  next();
});

// Pre-save middleware to set meta title from name if not provided
categorySchema.pre('save', function(next) {
  if (!this.metaTitle && this.name) {
    this.metaTitle = this.name;
  }
  next();
});

// Static method to find active categories
categorySchema.statics.findActive = function(options = {}) {
  return this.find({ status: 'active' }, null, options).sort({ displayOrder: 1, name: 1 });
};

// Static method to find categories with product counts
categorySchema.statics.findWithProductCounts = async function() {
  const Product = mongoose.model('Product');
  const categories = await this.find().sort({ displayOrder: 1, name: 1 });
  
  // Get product counts for each category
  for (let category of categories) {
    const count = await Product.countDocuments({ 
      categoryId: category._id.toString(),
      ...(category.status === 'active' ? {} : {}) // Include all products for admin view
    });
    category.productCount = count;
  }
  
  return categories;
};

// Instance method to update product count
categorySchema.methods.updateProductCount = async function() {
  const Product = mongoose.model('Product');
  this.productCount = await Product.countDocuments({ categoryId: this._id.toString() });
  return this.save();
};

// Instance method to get products in this category
categorySchema.methods.getProducts = function(options = {}) {
  const Product = mongoose.model('Product');
  return Product.find({ categoryId: this._id.toString() }, null, options);
};

// Instance method to disable category and handle products
categorySchema.methods.disable = async function() {
  this.status = 'disabled';
  await this.save();
  
  // Note: Products remain in database but will be filtered out in frontend queries
  // This preserves data integrity while hiding products from public view
  return this;
};

// Instance method to enable category
categorySchema.methods.enable = async function() {
  this.status = 'active';
  await this.save();
  return this;
};

// Static method to migrate existing product categories
categorySchema.statics.migrateFromProducts = async function() {
  const Product = mongoose.model('Product');
  
  // Get distinct categories from products
  const productCategories = await Product.distinct('category');
  
  const migrations = [];
  for (let categoryName of productCategories) {
    // Check if category already exists
    const existingCategory = await this.findOne({ name: categoryName });
    
    if (!existingCategory) {
      // Create new category
      const newCategory = new this({
        name: categoryName,
        description: `Auto-migrated category for ${categoryName}`,
        status: 'active'
      });
      
      const savedCategory = await newCategory.save();
      
      // Update all products with this category to use the new category ID
      await Product.updateMany(
        { category: categoryName },
        { categoryId: savedCategory._id.toString() }
      );
      
      migrations.push({
        name: categoryName,
        id: savedCategory._id,
        productsUpdated: await Product.countDocuments({ category: categoryName })
      });
    }
  }
  
  return migrations;
};

module.exports = mongoose.model('Category', categorySchema);
