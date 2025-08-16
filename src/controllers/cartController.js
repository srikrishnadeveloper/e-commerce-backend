const User = require('../models/User');
const Product = require('../models/Product');

// Get user cart
const getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('cart.product');
    
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
    const { quantity = 1 } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.inStock) {
      return res.status(400).json({
        success: false,
        message: 'Product not available'
      });
    }

    const user = await User.findById(req.user.id);
    const existingItem = user.cart.find(item => 
      item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
    } else {
      user.cart.push({
        product: productId,
        quantity: parseInt(quantity)
      });
    }

    await user.save();
    const updatedUser = await User.findById(req.user.id).populate('cart.product');
    
    let subtotal = 0;
    let totalItems = 0;
    
    const cartItems = updatedUser.cart.map(item => {
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
      message: 'Product added to cart',
      data: {
        items: cartItems,
        subtotal: subtotal,
        totalItems: totalItems,
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

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const user = await User.findById(req.user.id);
    const cartItem = user.cart.id(itemId);

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    cartItem.quantity = parseInt(quantity);
    await user.save();

    const updatedUser = await User.findById(req.user.id).populate('cart.product');
    
    let subtotal = 0;
    let totalItems = 0;
    
    const cartItems = updatedUser.cart.map(item => {
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
      message: 'Cart item updated',
      data: {
        items: cartItems,
        subtotal: subtotal,
        totalItems: totalItems,
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

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    const user = await User.findById(req.user.id);
    const cartItem = user.cart.id(itemId);

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    cartItem.remove();
    await user.save();

    const updatedUser = await User.findById(req.user.id).populate('cart.product');
    
    let subtotal = 0;
    let totalItems = 0;
    
    const cartItems = updatedUser.cart.map(item => {
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
      message: 'Item removed from cart',
      data: {
        items: cartItems,
        subtotal: subtotal,
        totalItems: totalItems,
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

// Clear cart
const clearCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.cart = [];
    await user.save();

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
