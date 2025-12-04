const mongoose = require('mongoose');

// Analytics Event Schema for tracking business events
const analyticsEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
      'order_created', 'order_updated', 'order_cancelled', 'order_delivered',
      'product_viewed', 'product_purchased', 'user_registered', 'user_login',
      'cart_added', 'cart_removed', 'wishlist_added', 'wishlist_removed',
      'payment_completed', 'payment_failed', 'refund_processed',
      'inventory_low', 'inventory_out', 'inventory_restocked'
    ]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  value: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Daily Analytics Summary Schema for pre-aggregated data
const dailyAnalyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true
  },
  revenue: {
    total: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    refunds: { type: Number, default: 0 }
  },
  orders: {
    total: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    processing: { type: Number, default: 0 },
    shipped: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 }
  },
  customers: {
    new: { type: Number, default: 0 },
    returning: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  products: {
    sold: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    topSelling: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: Number,
      revenue: Number
    }]
  },
  traffic: {
    sessions: { type: Number, default: 0 },
    pageViews: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Product Performance Analytics Schema
const productAnalyticsSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  period: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly'],
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  metrics: {
    views: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    cartAdds: { type: Number, default: 0 },
    wishlistAdds: { type: Number, default: 0 },
    inventoryTurnover: { type: Number, default: 0 },
    profitMargin: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Customer Analytics Schema
const customerAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  metrics: {
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    lifetimeValue: { type: Number, default: 0 },
    firstOrderDate: Date,
    lastOrderDate: Date,
    daysSinceLastOrder: { type: Number, default: 0 },
    orderFrequency: { type: Number, default: 0 }, // orders per month
    favoriteCategories: [String],
    preferredShippingMethod: String,
    returnRate: { type: Number, default: 0 },
    satisfactionScore: { type: Number, default: 0 }
  },
  segments: [{
    type: String,
    enum: ['new', 'regular', 'vip', 'at_risk', 'churned', 'high_value', 'frequent_buyer']
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Geographic Analytics Schema
const geographicAnalyticsSchema = new mongoose.Schema({
  region: {
    country: { type: String, required: true },
    state: String,
    city: String
  },
  period: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly']
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  metrics: {
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    customers: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    deliveryTime: { type: Number, default: 0 }, // average days
    returnRate: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Inventory Analytics Schema
const inventoryAnalyticsSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  metrics: {
    stockLevel: { type: Number, default: 0 },
    reservedStock: { type: Number, default: 0 },
    availableStock: { type: Number, default: 0 },
    stockMovement: { type: Number, default: 0 }, // +/- change
    turnoverRate: { type: Number, default: 0 },
    daysOfInventory: { type: Number, default: 0 },
    stockoutDays: { type: Number, default: 0 },
    demandForecast: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
    economicOrderQuantity: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Add compound indexes for better query performance
analyticsEventSchema.index({ eventType: 1, timestamp: -1 });
analyticsEventSchema.index({ userId: 1, timestamp: -1 });
analyticsEventSchema.index({ productId: 1, timestamp: -1 });

dailyAnalyticsSchema.index({ date: -1 });

productAnalyticsSchema.index({ productId: 1, period: 1, date: -1 });

geographicAnalyticsSchema.index({ 'region.country': 1, period: 1, date: -1 });
geographicAnalyticsSchema.index({ 'region.state': 1, period: 1, date: -1 });

inventoryAnalyticsSchema.index({ productId: 1, date: -1 });

// Create models
const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
const DailyAnalytics = mongoose.model('DailyAnalytics', dailyAnalyticsSchema);
const ProductAnalytics = mongoose.model('ProductAnalytics', productAnalyticsSchema);
const CustomerAnalytics = mongoose.model('CustomerAnalytics', customerAnalyticsSchema);
const GeographicAnalytics = mongoose.model('GeographicAnalytics', geographicAnalyticsSchema);
const InventoryAnalytics = mongoose.model('InventoryAnalytics', inventoryAnalyticsSchema);

module.exports = {
  AnalyticsEvent,
  DailyAnalytics,
  ProductAnalytics,
  CustomerAnalytics,
  GeographicAnalytics,
  InventoryAnalytics
};
