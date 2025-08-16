const Order = require('../models/Order');
const User = require('../models/User');

// Create order from current cart
const createOrderFromCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('cart.product');
    if (!user || !user.cart || user.cart.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    let subtotal = 0;
    const items = user.cart.map((item) => {
      const product = item.product;
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      return {
        product: product._id,
        name: product.name,
        price: product.price,
        image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : undefined,
        quantity: item.quantity,
        itemTotal,
      };
    });

    const shipping = subtotal > 50 ? 0 : 10;
    const total = subtotal + shipping;

    const order = await Order.create({
      user: user._id,
      items,
      subtotal,
      shipping,
      total,
      status: 'pending',
      paymentStatus: 'unpaid',
    });

    // Clear user cart after creating order
    user.cart = [];
    await user.save();

    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
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

module.exports = {
  createOrderFromCart,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
};






