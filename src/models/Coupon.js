const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Discount type is required']
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  minimumPurchase: {
    type: Number,
    default: 0,
    min: 0
  },
  maximumDiscount: {
    type: Number, // Max discount for percentage coupons
    default: null
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  usageLimit: {
    type: Number, // Total times coupon can be used
    default: null // null = unlimited
  },
  usageCount: {
    type: Number,
    default: 0
  },
  usageLimitPerUser: {
    type: Number, // Times each user can use
    default: 1
  },
  usedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    discountAmount: Number
  }],
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  excludedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFirstPurchaseOnly: {
    type: Boolean,
    default: false
  },
  freeShipping: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String,
    default: 'Admin'
  }
}, {
  timestamps: true
});

// Index for faster lookups
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, validUntil: 1 });

// Virtual to check if coupon is valid
couponSchema.virtual('isValid').get(function() {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (this.usageLimit === null || this.usageCount < this.usageLimit)
  );
});

// Method to check if user can use coupon
couponSchema.methods.canUserUse = function(userId) {
  if (!this.isValid) return { canUse: false, reason: 'Coupon is not valid' };
  
  const userUsage = this.usedBy.filter(
    u => u.user.toString() === userId.toString()
  ).length;
  
  if (userUsage >= this.usageLimitPerUser) {
    return { canUse: false, reason: 'You have already used this coupon' };
  }
  
  return { canUse: true };
};

// Method to calculate discount
couponSchema.methods.calculateDiscount = function(cartTotal, cartItems = []) {
  if (cartTotal < this.minimumPurchase) {
    return {
      discount: 0,
      error: `Minimum purchase of $${this.minimumPurchase} required`
    };
  }

  let discount = 0;
  
  if (this.discountType === 'percentage') {
    discount = (cartTotal * this.discountValue) / 100;
    if (this.maximumDiscount && discount > this.maximumDiscount) {
      discount = this.maximumDiscount;
    }
  } else {
    discount = this.discountValue;
  }

  // Don't exceed cart total
  discount = Math.min(discount, cartTotal);

  return {
    discount: Math.round(discount * 100) / 100,
    discountType: this.discountType,
    discountValue: this.discountValue,
    freeShipping: this.freeShipping
  };
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
