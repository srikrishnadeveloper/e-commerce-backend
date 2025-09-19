const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');

// Get user cart
const getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({ path: 'cart.product', options: { lean: true } })
      .lean();
    
    let subtotal = 0;
    let totalItems = 0;
    
    const cartItems = user.cart.map(item => {
      const itemTotal = item.product.price * item.quantity;
      subtotal += itemTotal;
      totalItems += item.quantity;
      
      return {
        _id: item._id,
        product: item.product,
        quantity: item.quantity,
        itemTotal: itemTotal
      };
    });

    res.status(200).json({
      success: true,
      data: {
        items: cartItems,
        subtotal: subtotal,
        totalItems: totalItems,
        shipping: subtotal > 50 ? 0 : 10,
        total: subtotal + (subtotal > 50 ? 0 : 10)
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Add product to cart
const addToCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const qty = parseInt(req.body?.quantity ?? 1, 10);
    const quantity = Number.isFinite(qty) && qty > 0 ? qty : 1;

    // Validate product exists and is in stock; lean for speed
    const product = await Product.findById(productId).select('price inStock').lean();
    if (!product || !product.inStock) {
      return res.status(400).json({
        success: false,
        message: 'Product not available'
      });
    }

    // Use atomic update: try to increment existing cart item quantity
    const incResult = await User.updateOne(
      { _id: req.user.id, 'cart.product': productId },
      { $inc: { 'cart.$.quantity': quantity } }
    );

    if (incResult.modifiedCount === 0) {
      // No existing item; push new one
      await User.updateOne(
        { _id: req.user.id },
        { $push: { cart: { product: productId, quantity } } }
      );
    }

    // Re-fetch populated cart to compute totals and return consistent shape
    const updatedUser = await User.findById(req.user.id)
      .populate({ path: 'cart.product', options: { lean: true } })
      .lean();

    let subtotal = 0;
    let totalItems = 0;

    const cartItems = updatedUser.cart.map((item) => {
      const itemTotal = (item.product.price || 0) * item.quantity;
      subtotal += itemTotal;
      totalItems += item.quantity;
      return {
        _id: item._id,
        product: item.product,
        quantity: item.quantity,
        itemTotal
      };
    });

    res.status(200).json({
      success: true,
      message: 'Product added to cart',
      data: {
        items: cartItems,
        subtotal,
        totalItems,
        shipping: subtotal > 50 ? 0 : 10,
        total: subtotal + (subtotal > 50 ? 0 : 10)
      }
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Update cart item quantity (atomic)
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const qty = parseInt(req.body?.quantity, 10);
    const quantity = Number.isFinite(qty) && qty > 0 ? qty : null;

    if (!quantity) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const itemObjectId = new mongoose.Types.ObjectId(itemId);
    const updateRes = await User.updateOne(
      { _id: req.user.id },
      { $set: { 'cart.$[elem].quantity': quantity } },
      { arrayFilters: [{ 'elem._id': itemObjectId }] }
    );

    if (updateRes.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    const updatedUser = await User.findById(req.user.id)
      .populate({ path: 'cart.product', options: { lean: true } })
      .lean();

    let subtotal = 0;
    let totalItems = 0;

    const cartItems = updatedUser.cart.map((item) => {
      const itemTotal = (item.product.price || 0) * item.quantity;
      subtotal += itemTotal;
      totalItems += item.quantity;
      return {
        _id: item._id,
        product: item.product,
        quantity: item.quantity,
        itemTotal
      };
    });

    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: {
        items: cartItems,
        subtotal,
        totalItems,
        shipping: subtotal > 50 ? 0 : 10,
        total: subtotal + (subtotal > 50 ? 0 : 10)
      }
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Remove item from cart (atomic)
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const itemObjectId = new mongoose.Types.ObjectId(itemId);

    const pullRes = await User.updateOne(
      { _id: req.user.id },
      { $pull: { cart: { _id: itemObjectId } } }
    );

    if (pullRes.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    const updatedUser = await User.findById(req.user.id)
      .populate({ path: 'cart.product', options: { lean: true } })
      .lean();

    let subtotal = 0;
    let totalItems = 0;

    const cartItems = updatedUser.cart.map((item) => {
      const itemTotal = (item.product.price || 0) * item.quantity;
      subtotal += itemTotal;
      totalItems += item.quantity;
      return {
        _id: item._id,
        product: item.product,
        quantity: item.quantity,
        itemTotal
      };
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: {
        items: cartItems,
        subtotal,
        totalItems,
        shipping: subtotal > 50 ? 0 : 10,
        total: subtotal + (subtotal > 50 ? 0 : 10)
      }
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Clear cart (atomic)
const clearCart = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user.id },
      { $set: { cart: [] } }
    );

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: {
        items: [],
        subtotal: 0,
        totalItems: 0,
        shipping: 0,
        total: 0
      }
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
