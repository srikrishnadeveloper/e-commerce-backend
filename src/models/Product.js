const mongoose = require('mongoose');
const { Schema } = mongoose;

// Product Schema definition based on products.json structure
const productSchema = new Schema({
  // Basic product information
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  
  // Category information
  category: {
    type: String,
    required: true
  },
  categoryId: {
    type: String,
    required: true
  },
  
  // Images - array of file paths for product images
  images: [{
    type: String,
    required: true
  }],
  
  // Color options
  colors: [{
    name: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    }
  }],
  
  // Size options
  sizes: [{
    type: String,
    required: true
  }],
  
  // Inventory and ratings
  inStock: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviews: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Product features
  features: [{
    type: String
  }],
  
  // Technical specifications
  specifications: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Tags for search and filtering
  tags: [{
    type: String
  }],
  
  // Marketing flags
  bestseller: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Add indexes for better query performance
productSchema.index({ name: 'text', description: 'text' }); // Text search
productSchema.index({ categoryId: 1 }); // Category filtering
productSchema.index({ price: 1 }); // Price sorting
productSchema.index({ rating: -1 }); // Rating sorting
productSchema.index({ bestseller: 1 }); // Bestseller filtering
productSchema.index({ featured: 1 }); // Featured filtering
productSchema.index({ inStock: 1 }); // Stock filtering

// Virtual for calculating discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

// Virtual for checking if product is on sale
productSchema.virtual('onSale').get(function() {
  return this.originalPrice && this.originalPrice > this.price;
});

// Ensure virtual fields are serialized
productSchema.set('toJSON', { virtuals: true });

// Static method to find products by category
productSchema.statics.findByCategory = function(categoryId) {
  return this.find({ categoryId, inStock: true });
};

// Static method to find featured products
productSchema.statics.findFeatured = function() {
  return this.find({ featured: true, inStock: true });
};

// Static method to find bestsellers
productSchema.statics.findBestsellers = function() {
  return this.find({ bestseller: true, inStock: true });
};

// Static method to search products
productSchema.statics.searchProducts = function(query) {
  return this.find({ 
    $text: { $search: query },
    inStock: true 
  });
};

// Instance method to format price
productSchema.methods.getFormattedPrice = function() {
  return `$${this.price.toFixed(2)}`;
};

// Instance method to get primary image
productSchema.methods.getPrimaryImage = function() {
  return this.images && this.images.length > 0 ? this.images[0] : null;
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
