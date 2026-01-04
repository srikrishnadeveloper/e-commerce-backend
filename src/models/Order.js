const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  image: {
    type: String,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  itemTotal: {
    type: Number,
    required: true,
    min: 0,
  },
  selectedColor: {
    type: String,
    default: '',
  },
  selectedSize: {
    type: String,
    default: '',
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shipping: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paymentInfo: {
      paymentId: String,
      transactionId: String,
      method: {
        type: String,
        enum: ['card', 'upi', 'net_banking', 'wallet', 'cod', 'razorpay', 'manual_upi'],
        default: 'card'
      },
      status: {
        type: String,
        enum: ['initiated', 'authorized', 'pending_cod', 'pending_verification', 'completed', 'failed'],
        default: 'initiated'
      },
      amount: Number,
      initiatedAt: Date,
      paidAt: Date,
      failedAt: Date,
      failureReason: String,
      // Manual UPI payment fields
      upiTransactionId: String,
      upiSubmittedAt: Date,
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      verificationNotes: String
    },
    shippingAddress: {
      fullName: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      phone: String,
    },
    // Admin management fields
    orderNotes: [{
      note: {
        type: String,
        required: true
      },
      addedAt: {
        type: Date,
        default: Date.now
      },
      addedBy: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['internal', 'customer', 'system'],
        default: 'internal'
      },
      isVisible: {
        type: Boolean,
        default: false // Only visible to customer if true
      }
    }],
    timeline: [{
      action: {
        type: String,
        required: true
      },
      details: String,
      performedAt: {
        type: Date,
        default: Date.now
      },
      performedBy: {
        type: String,
        required: true
      },
      oldValue: String,
      newValue: String,
      notificationSent: {
        type: Boolean,
        default: false
      }
    }],
    shippingInfo: {
      carrier: String,
      trackingNumber: String,
      trackingUrl: String,
      shippedAt: Date,
      estimatedDelivery: Date,
      actualDelivery: Date,
      shippingMethod: {
        type: String,
        enum: ['standard', 'express', 'overnight', 'international'],
        default: 'standard'
      },
      shippingCost: {
        type: Number,
        default: 0
      }
    },
    refundInfo: {
      amount: Number,
      reason: String,
      processedAt: Date,
      refundMethod: String,
      refundReference: String
    },
    // Convenience fields for quick refund queries
    refundedAt: Date,
    refundReason: String,
    refundAmount: Number,
    // Inventory tracking
    inventoryReserved: {
      type: Boolean,
      default: false
    },
    inventoryUpdated: {
      type: Boolean,
      default: false
    },
    // Customer communication preferences
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      orderConfirmation: {
        type: Boolean,
        default: true
      },
      statusUpdates: {
        type: Boolean,
        default: true
      },
      shippingUpdates: {
        type: Boolean,
        default: true
      },
      deliveryConfirmation: {
        type: Boolean,
        default: true
      }
    },
    // Order modification tracking
    modifications: [{
      type: {
        type: String,
        enum: ['item_added', 'item_removed', 'quantity_changed', 'address_updated', 'shipping_changed'],
        required: true
      },
      description: String,
      performedAt: {
        type: Date,
        default: Date.now
      },
      performedBy: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }],
    // Cancellation details
    cancellation: {
      reason: String,
      cancelledAt: Date,
      cancelledBy: String,
      refundStatus: {
        type: String,
        enum: ['pending', 'processed', 'failed'],
        default: 'pending'
      },
      canCancel: {
        type: Boolean,
        default: true
      }
    },
    // Reorder functionality
    isReorder: {
      type: Boolean,
      default: false
    },
    originalOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;






