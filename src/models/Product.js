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
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  
  // Images - array of file paths for product images (default/gallery images)
  images: [{
    type: String,
    required: true
  }],
  
  // Color options with images (for color-specific product images like Amazon/Flipkart)
  colors: [{
    name: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    },
    images: [{
      type: String
    }] // Array of image URLs for this color variant
  }],
  
  // Size options with prices
  sizes: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      default: 0
    }
  }],
  
  // Inventory and ratings
  inStock: {
    type: Boolean,
    default: true
  },
  stockQuantity: {
    type: Number,
    min: 0,
    default: 0
  },
  reservedQuantity: {
    type: Number,
    min: 0,
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    min: 0,
    default: 5
  },
  trackInventory: {
    type: Boolean,
    default: true
  },
  allowBackorder: {
    type: Boolean,
    default: false
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
  
  // Technical specifications
  specifications: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Product Variants - for size/color combinations with separate stock
  variants: [{
    sku: {
      type: String,
      trim: true
    },
    size: {
      type: String,
      trim: true
    },
    color: {
      name: {
        type: String,
        trim: true
      },
      value: {
        type: String,
        trim: true
      }
    },
    price: {
      type: Number,
      min: 0
    },
    originalPrice: {
      type: Number,
      min: 0
    },
    stockQuantity: {
      type: Number,
      min: 0,
      default: 0
    },
    reservedQuantity: {
      type: Number,
      min: 0,
      default: 0
    },
    inStock: {
      type: Boolean,
      default: true
    },
    images: [{
      type: String
    }],
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Whether to use variant-based inventory or single product inventory
  hasVariants: {
    type: Boolean,
    default: false
  },
  
  // Marketing flags
  bestseller: {
    type: Boolean,
    default: false
  },
  hotDeal: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Add indexes for better query performance
productSchema.index({ name: 'text', description: 'text', category: 'text', tags: 'text' }); // Text search
productSchema.index({ categoryId: 1 }); // Category filtering
productSchema.index({ price: 1 }); // Price sorting
productSchema.index({ rating: -1 }); // Rating sorting
productSchema.index({ bestseller: 1 }); // Bestseller filtering
productSchema.index({ hotDeal: 1 }); // Hot Deal filtering
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

// Static method to find hot deal products
productSchema.statics.findHotDeals = function() {
  return this.find({ hotDeal: true, inStock: true });
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
  return `₹${this.price.toFixed(2)}`;
};

// Instance method to get primary image
productSchema.methods.getPrimaryImage = function() {
  return this.images && this.images.length > 0 ? this.images[0] : null;
};

// Instance method to check available quantity
productSchema.methods.getAvailableQuantity = function() {
  if (!this.trackInventory) return 999; // Unlimited if not tracking
  return Math.max(0, this.stockQuantity - this.reservedQuantity);
};

// Instance method to check if product is low stock
productSchema.methods.isLowStock = function() {
  if (!this.trackInventory) return false;
  return this.getAvailableQuantity() <= this.lowStockThreshold;
};

// Instance method to reserve inventory
productSchema.methods.reserveInventory = async function(quantity) {
  if (!this.trackInventory) return true;

  const available = this.getAvailableQuantity();
  if (available < quantity && !this.allowBackorder) {
    throw new Error(`Insufficient inventory. Available: ${available}, Requested: ${quantity}`);
  }

  this.reservedQuantity += quantity;
  await this.save();
  return true;
};

// Instance method to release reserved inventory
productSchema.methods.releaseInventory = async function(quantity) {
  if (!this.trackInventory) return true;

  this.reservedQuantity = Math.max(0, this.reservedQuantity - quantity);
  await this.save();
  return true;
};

// Instance method to update stock after order fulfillment
productSchema.methods.updateStock = async function(quantity) {
  if (!this.trackInventory) return true;

  this.stockQuantity = Math.max(0, this.stockQuantity - quantity);
  this.reservedQuantity = Math.max(0, this.reservedQuantity - quantity);
  this.inStock = this.getAvailableQuantity() > 0 || this.allowBackorder;
  await this.save();
  return true;
};

// Instance method to restock inventory
productSchema.methods.restock = async function(quantity) {
  if (!this.trackInventory) return true;

  this.stockQuantity += quantity;
  this.inStock = true;
  await this.save();
  return true;
};

// Instance method to find variant by size and color
productSchema.methods.findVariant = function(size, colorName) {
  if (!this.hasVariants || !this.variants || this.variants.length === 0) {
    return null;
  }
  
  return this.variants.find(v => {
    const sizeMatch = !size || v.size === size;
    const colorMatch = !colorName || (v.color && v.color.name === colorName);
    return sizeMatch && colorMatch && v.isActive;
  });
};

// Instance method to get variant available quantity
productSchema.methods.getVariantAvailableQuantity = function(variantId) {
  if (!this.hasVariants || !this.variants) return 0;
  
  const variant = this.variants.id(variantId);
  if (!variant) return 0;
  
  return Math.max(0, variant.stockQuantity - variant.reservedQuantity);
};

// Instance method to reserve variant inventory
productSchema.methods.reserveVariantInventory = async function(variantId, quantity) {
  if (!this.hasVariants) return this.reserveInventory(quantity);
  
  const variant = this.variants.id(variantId);
  if (!variant) throw new Error('Variant not found');
  
  const available = variant.stockQuantity - variant.reservedQuantity;
  if (available < quantity) {
    throw new Error(`Insufficient variant inventory. Available: ${available}, Requested: ${quantity}`);
  }
  
  variant.reservedQuantity += quantity;
  await this.save();
  return true;
};

// Instance method to update variant stock after order fulfillment
productSchema.methods.updateVariantStock = async function(variantId, quantity) {
  if (!this.hasVariants) return this.updateStock(quantity);
  
  const variant = this.variants.id(variantId);
  if (!variant) throw new Error('Variant not found');
  
  variant.stockQuantity = Math.max(0, variant.stockQuantity - quantity);
  variant.reservedQuantity = Math.max(0, variant.reservedQuantity - quantity);
  variant.inStock = (variant.stockQuantity - variant.reservedQuantity) > 0;
  
  // Update parent product stock status
  this.inStock = this.variants.some(v => v.inStock && v.isActive);
  
  await this.save();
  return true;
};

// Static method to get all variant combinations for a product
productSchema.statics.getVariantOptions = async function(productId) {
  const product = await this.findById(productId);
  if (!product || !product.hasVariants) return null;
  
  const sizes = [...new Set(product.variants.filter(v => v.size).map(v => v.size))];
  const colors = [...new Set(product.variants.filter(v => v.color && v.color.name).map(v => JSON.stringify(v.color)))].map(c => JSON.parse(c));
  
  return { sizes, colors, variants: product.variants };
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
