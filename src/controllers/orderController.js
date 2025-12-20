const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const { sendOrderConfirmationEmail } = require('../utils/orderEmails');

// Create order directly from product selection (for direct checkout)
const createDirectOrder = async (req, res) => {
  try {
    const { productId, quantity = 1, shippingAddress, selectedColor = '', selectedSize = '' } = req.body;

    // Validate required fields
    if (!productId || !shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and shipping address are required'
      });
    }

    // Validate shipping address fields
    const requiredFields = ['fullName', 'addressLine1', 'city', 'state', 'postalCode', 'phone'];
    const missingFields = requiredFields.filter(field => !shippingAddress[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required shipping fields: ${missingFields.join(', ')}`
      });
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product || !product.inStock) {
      return res.status(400).json({
        success: false,
        message: 'Product not available'
      });
    }

    // Calculate totals
    const itemTotal = product.price * quantity;
    const subtotal = itemTotal;
    const shipping = subtotal > 50 ? 0 : 10; // Free shipping over $50
    const total = subtotal + shipping;

    // Create order item
    const orderItem = {
      product: product._id,
      name: product.name,
      price: product.price,
      image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : undefined,
      quantity: parseInt(quantity),
      itemTotal,
      selectedColor,
      selectedSize
    };

    // Create order
    const order = await Order.create({
      user: req.user.id,
      items: [orderItem],
      subtotal,
      shipping,
      total,
      status: 'pending',
      paymentStatus: 'unpaid',
      shippingAddress: {
        ...shippingAddress,
        country: shippingAddress.country || 'United States'
      }
    });

    // Populate the order with product details for response
    await order.populate('items.product', 'name images category');
    await order.populate('user', 'name email');

    // Send order confirmation email
    try {
      await sendOrderConfirmationEmail(order.user, order);
    } catch (emailError) {
      console.error('Order confirmation email failed:', emailError);
      // Don't fail order creation if email fails
    }

    return res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Create direct order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create order from current cart
const createOrderFromCart = async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    // Validate shipping address if provided
    if (shippingAddress) {
      const requiredFields = ['fullName', 'addressLine1', 'city', 'state', 'postalCode', 'phone'];
      const missingFields = requiredFields.filter(field => !shippingAddress[field]);
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required shipping fields: ${missingFields.join(', ')}`
        });
      }
    }

    const user = await User.findById(req.user.id).populate('cart.product');
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }
    
    if (!user.cart || user.cart.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Filter out any cart items with null products
    const validCartItems = user.cart.filter(item => item.product && item.product._id);
    
    if (validCartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid items in cart' });
    }

    let subtotal = 0;
    const items = validCartItems.map((item) => {
      const product = item.product;
      const price = product.price || 0;
      const quantity = item.quantity || 1;
      const itemTotal = price * quantity;
      subtotal += itemTotal;
      return {
        product: product._id,
        name: product.name || 'Unknown Product',
        price: price,
        image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : undefined,
        quantity: quantity,
        itemTotal,
        selectedColor: item.selectedColor || '',
        selectedSize: item.selectedSize || '',
      };
    });

    const shipping = subtotal > 50 ? 0 : 10;
    const total = subtotal + shipping;

    const orderData = {
      user: user._id,
      items,
      subtotal,
      shipping,
      total,
      status: 'pending',
      paymentStatus: 'unpaid',
    };

    // Add shipping address if provided
    if (shippingAddress) {
      orderData.shippingAddress = {
        ...shippingAddress,
        country: shippingAddress.country || 'United States'
      };
    }

    const order = await Order.create(orderData);

    // Populate the order with product details and user info for email
    await order.populate('items.product', 'name images category');
    await order.populate('user', 'name email');

    // Clear user cart after creating order
    await User.findByIdAndUpdate(user._id, { cart: [] });

    // Send order confirmation email
    try {
      await sendOrderConfirmationEmail(order.user, order);
    } catch (emailError) {
      console.error('Order confirmation email failed:', emailError);
      // Don't fail order creation if email fails
    }

    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get current user's orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get a single order
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update order status (user can cancel pending orders)
const cancelMyOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending orders can be cancelled' });
    }
    order.status = 'cancelled';
    await order.save();
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get order tracking information
const getOrderTracking = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('items.product', 'name images');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Create tracking timeline
    const trackingTimeline = [];

    // Order placed
    trackingTimeline.push({
      status: 'pending',
      title: 'Order Placed',
      description: 'Your order has been received and is being processed',
      date: order.createdAt,
      completed: true
    });

    // Processing
    const processingEntry = order.timeline?.find(entry => entry.newValue === 'processing');
    trackingTimeline.push({
      status: 'processing',
      title: 'Processing',
      description: 'Your order is being prepared for shipment',
      date: processingEntry?.performedAt,
      completed: ['processing', 'shipped', 'delivered'].includes(order.status)
    });

    // Shipped
    const shippedEntry = order.timeline?.find(entry => entry.newValue === 'shipped');
    trackingTimeline.push({
      status: 'shipped',
      title: 'Shipped',
      description: order.shippingInfo?.trackingNumber
        ? `Shipped via ${order.shippingInfo.carrier || 'carrier'} - Tracking: ${order.shippingInfo.trackingNumber}`
        : 'Your order has been shipped',
      date: shippedEntry?.performedAt || order.shippingInfo?.shippedAt,
      completed: ['shipped', 'delivered'].includes(order.status),
      trackingNumber: order.shippingInfo?.trackingNumber,
      trackingUrl: order.shippingInfo?.trackingUrl,
      estimatedDelivery: order.shippingInfo?.estimatedDelivery
    });

    // Delivered
    const deliveredEntry = order.timeline?.find(entry => entry.newValue === 'delivered');
    trackingTimeline.push({
      status: 'delivered',
      title: 'Delivered',
      description: 'Your order has been delivered',
      date: deliveredEntry?.performedAt || order.shippingInfo?.actualDelivery,
      completed: order.status === 'delivered'
    });

    return res.status(200).json({
      success: true,
      data: {
        order: {
          _id: order._id,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
          items: order.items,
          shippingAddress: order.shippingAddress
        },
        tracking: trackingTimeline,
        shippingInfo: order.shippingInfo
      }
    });
  } catch (error) {
    console.error('Get order tracking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Create reorder from existing order
const reorderFromOrder = async (req, res) => {
  try {
    const originalOrder = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('items.product');

    if (!originalOrder) {
      return res.status(404).json({
        success: false,
        message: 'Original order not found'
      });
    }

    // Check if all products are still available
    const unavailableItems = [];
    for (const item of originalOrder.items) {
      if (!item.product || !item.product.inStock) {
        unavailableItems.push(item.name);
      }
    }

    if (unavailableItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Some items are no longer available: ${unavailableItems.join(', ')}`
      });
    }

    // Create new order
    const newOrder = new Order({
      user: req.user.id,
      items: originalOrder.items,
      subtotal: originalOrder.subtotal,
      shipping: originalOrder.shipping,
      total: originalOrder.total,
      status: 'pending',
      paymentStatus: 'unpaid',
      shippingAddress: originalOrder.shippingAddress,
      isReorder: true,
      originalOrderId: originalOrder._id,
      timeline: [{
        action: 'Order Created',
        details: `Reorder created from order #${originalOrder._id.toString().slice(-8)}`,
        performedAt: new Date(),
        performedBy: req.user.id
      }]
    });

    await newOrder.save();
    await newOrder.populate('items.product', 'name images category');
    await newOrder.populate('user', 'name email');

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail(newOrder.user, newOrder);
    } catch (emailError) {
      console.error('Reorder confirmation email failed:', emailError);
    }

    return res.status(201).json({
      success: true,
      data: newOrder,
      message: 'Reorder created successfully'
    });
  } catch (error) {
    console.error('Reorder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get order statistics for user dashboard
const getMyOrderStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({ user: userId });

    const stats = {
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + order.total, 0),
      statusCounts: {
        pending: orders.filter(o => o.status === 'pending').length,
        processing: orders.filter(o => o.status === 'processing').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length
      },
      recentOrders: orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(order => ({
          _id: order._id,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
          itemCount: order.items.length
        }))
    };

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = {
  createDirectOrder,
  createOrderFromCart,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
  getOrderTracking,
  reorderFromOrder,
  getMyOrderStats
};






