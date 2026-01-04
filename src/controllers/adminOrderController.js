const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const {
  sendOrderStatusUpdateEmail,
  sendShippingNotificationEmail,
  sendOrderCancellationEmail,
  sendDeliveryConfirmationEmail
} = require('../utils/orderEmails');

// @desc    Get all orders with filtering and pagination
// @route   GET /api/admin/orders
// @access  Private (Admin)
const getAllOrders = async (req, res) => {
  try {
    console.log('Admin orders endpoint called');
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = startDate;
      }
      if (dateTo) {
        // Set to end of the day
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    console.log('Fetching orders with filter:', filter);

    // Handle search - search by order ID, customer name, or email
    let orders;
    let totalOrders;
    let searchFilter = { ...filter };

    if (search && search.trim()) {
      // Remove # prefix if present (users often search with #ORDER_ID format)
      const searchTerm = search.trim().replace(/^#/, '');
      const searchRegex = new RegExp(searchTerm, 'i');
      
      // First, try to find by exact order ID
      if (mongoose.Types.ObjectId.isValid(searchTerm)) {
        searchFilter._id = searchTerm;
      } else {
        // Search by user name or email - first find matching users
        const matchingUsers = await User.find({
          $or: [
            { name: searchRegex },
            { email: searchRegex }
          ]
        }).select('_id').lean();

        const userIds = matchingUsers.map(u => u._id);

        // For order ID search, we need to get all orders and filter by last 8 chars
        // Since MongoDB ObjectId doesn't support regex well
        if (searchTerm.length >= 3) {
          // Get all orders matching current filters, then filter by ID string
          const allFilteredOrders = await Order.find(filter).select('_id').lean();
          const searchUpper = searchTerm.toUpperCase();
          const searchLower = searchTerm.toLowerCase();
          const matchingOrderIds = allFilteredOrders
            .filter(o => {
              const idStr = o._id.toString();
              const last8 = idStr.slice(-8).toUpperCase();
              // Match against last 8 chars (displayed format) or full ID
              return last8.includes(searchUpper) || 
                     idStr.toLowerCase().includes(searchLower);
            })
            .map(o => o._id);
          
          // Build search filter with user matches and order ID matches
          if (userIds.length > 0 || matchingOrderIds.length > 0) {
            searchFilter = {
              ...filter,
              $or: [
                ...(userIds.length > 0 ? [{ user: { $in: userIds } }] : []),
                ...(matchingOrderIds.length > 0 ? [{ _id: { $in: matchingOrderIds } }] : [])
              ]
            };
          } else {
            // No matches, return empty
            searchFilter = { ...filter, _id: null };
          }
        } else if (userIds.length > 0) {
          searchFilter = { ...filter, user: { $in: userIds } };
        } else {
          // No matches found
          searchFilter = { ...filter, _id: null };
        }
      }
    }

    orders = await Order.find(searchFilter)
      .populate('user', 'name email')
      .populate('items.product', 'name images')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    totalOrders = await Order.countDocuments(searchFilter);

    console.log('Orders found:', orders.length);

    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    // Get summary statistics for ALL orders (not filtered)
    const allOrders = await Order.find({}).lean();
    const statusCounts = {};
    const paymentCounts = {};
    let totalRevenue = 0;

    allOrders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      paymentCounts[order.paymentStatus] = (paymentCounts[order.paymentStatus] || 0) + 1;
      totalRevenue += order.total || 0;
    });

    console.log('Sending response');

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalOrders,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        },
        summary: {
          statusCounts,
          paymentCounts,
          totalRevenue,
          totalAllOrders: allOrders.length
        }
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get order by ID with full details
// @route   GET /api/admin/orders/:id
// @access  Private (Admin)
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    const order = await Order.findById(id)
      .populate('user', 'name email phone registrationDate')
      .populate('items.product', 'name images category price inStock');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update order status
// @route   PATCH /api/admin/orders/:id/status
// @access  Private (Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, shippingInfo, adminId = 'admin' } = req.body;

    console.log('Update order status called:', { id, status, notes });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const order = await Order.findById(id).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const oldStatus = order.status;

    // If status is the same, no need to update
    if (oldStatus === status) {
      return res.json({
        success: true,
        data: order,
        message: 'Status is already ' + status
      });
    }

    // Validate status transition (but be more lenient for admin)
    const validTransitions = {
      'pending': ['processing', 'shipped', 'cancelled'],
      'processing': ['shipped', 'delivered', 'cancelled'],
      'shipped': ['delivered', 'cancelled'],
      'delivered': ['cancelled'], // Allow cancel even after delivery for refund cases
      'cancelled': [] // Final state - no further changes
    };

    if (!validTransitions[oldStatus].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from "${oldStatus}" to "${status}". Valid transitions from "${oldStatus}" are: ${validTransitions[oldStatus].join(', ') || 'none'}`
      });
    }

    console.log('Status transition valid:', oldStatus, '->', status);

    // Handle inventory management based on status change
    if (status === 'processing' && oldStatus === 'pending') {
      // Reserve inventory when processing starts
      for (const item of order.items) {
        try {
          const productId = item.product?._id || item.product;
          if (productId) {
            const product = await Product.findById(productId);
            if (product && product.trackInventory) {
              await product.reserveInventory(item.quantity);
            }
          }
        } catch (inventoryError) {
          console.error('Inventory reservation error:', inventoryError);
          // Don't fail the status update for inventory errors
        }
      }
      order.inventoryReserved = true;
    }

    if ((status === 'shipped' && oldStatus === 'processing') || (status === 'shipped' && oldStatus === 'pending')) {
      // Update stock when shipped
      for (const item of order.items) {
        try {
          const productId = item.product?._id || item.product;
          if (productId) {
            const product = await Product.findById(productId);
            if (product && product.trackInventory) {
              await product.updateStock(item.quantity);
            }
          }
        } catch (inventoryError) {
          console.error('Stock update error:', inventoryError);
        }
      }
      order.inventoryUpdated = true;

      // Set shipping info
      if (shippingInfo) {
        order.shippingInfo = {
          ...order.shippingInfo,
          ...shippingInfo,
          shippedAt: new Date()
        };
      } else if (!order.shippingInfo?.shippedAt) {
        // Set shipped date if not already set
        if (!order.shippingInfo) order.shippingInfo = {};
        order.shippingInfo.shippedAt = new Date();
      }
    }

    if (status === 'cancelled') {
      // Release reserved inventory
      if (order.inventoryReserved && !order.inventoryUpdated) {
        for (const item of order.items) {
          try {
            const productId = item.product?._id || item.product;
            if (productId) {
              const product = await Product.findById(productId);
              if (product && product.trackInventory) {
                await product.releaseInventory(item.quantity);
              }
            }
          } catch (inventoryError) {
            console.error('Inventory release error:', inventoryError);
          }
        }
      }

      // Set cancellation info
      order.cancellation = {
        reason: notes || 'Cancelled by admin',
        cancelledAt: new Date(),
        cancelledBy: adminId,
        refundStatus: order.paymentStatus === 'paid' ? 'pending' : 'not_applicable'
      };
    }

    if (status === 'delivered') {
      // Set delivery info
      if (!order.shippingInfo) order.shippingInfo = {};
      order.shippingInfo.actualDelivery = new Date();
    }

    order.status = status;

    // Add timeline entry
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      action: 'Status Updated',
      details: notes || `Status changed from ${oldStatus} to ${status}`,
      performedAt: new Date(),
      performedBy: adminId,
      oldValue: oldStatus,
      newValue: status,
      notificationSent: false
    });

    // Add notes if provided
    if (notes) {
      if (!order.orderNotes) order.orderNotes = [];
      order.orderNotes.push({
        note: notes,
        addedAt: new Date(),
        addedBy: adminId,
        type: 'internal',
        isVisible: false
      });
    }

    await order.save();
    console.log('Order saved successfully');

    // Send email notification to customer
    // Always send email if user has email (don't depend on notification preferences which might not be set)
    if (order.user?.email) {
      try {
        let emailSent = false;
        console.log('Sending status update email to:', order.user.email);

        switch (status) {
          case 'shipped':
            await sendShippingNotificationEmail(order.user, order);
            emailSent = true;
            break;
          case 'delivered':
            await sendDeliveryConfirmationEmail(order.user, order);
            emailSent = true;
            break;
          case 'cancelled':
            await sendOrderCancellationEmail(order.user, order, notes);
            emailSent = true;
            break;
          default:
            await sendOrderStatusUpdateEmail(order.user, order, oldStatus, status);
            emailSent = true;
        }

        if (emailSent) {
          // Update timeline to mark notification as sent
          order.timeline[order.timeline.length - 1].notificationSent = true;
          await order.save();
          console.log('Email sent successfully');
        }
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the status update if email fails
      }
    } else {
      console.log('No user email found, skipping notification');
    }

    res.json({
      success: true,
      data: order,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update payment status
// @route   PATCH /api/admin/orders/:id/payment
// @access  Private (Admin)
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, notes, refundAmount } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    const validPaymentStatuses = ['unpaid', 'paid', 'refunded'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status value'
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const oldPaymentStatus = order.paymentStatus;
    order.paymentStatus = paymentStatus;

    // If refunding, update refund info
    if (paymentStatus === 'refunded') {
      order.refundInfo = {
        amount: refundAmount || order.total,
        processedAt: new Date(),
        refundMethod: 'manual'
      };
      order.refundedAt = new Date();
      order.refundAmount = refundAmount || order.total;
    }

    // Add timeline entry
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      action: 'Payment Status Updated',
      details: notes || `Payment status changed from ${oldPaymentStatus} to ${paymentStatus}`,
      performedAt: new Date(),
      performedBy: 'Admin',
      oldValue: oldPaymentStatus,
      newValue: paymentStatus
    });

    await order.save();

    res.json({
      success: true,
      data: order,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Add order notes
// @route   POST /api/admin/orders/:id/notes
// @access  Private (Admin)
const addOrderNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, type = 'internal' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    if (!note || note.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.orderNotes) order.orderNotes = [];
    order.orderNotes.push({
      note: note.trim(),
      addedAt: new Date(),
      type
    });

    // Add timeline entry
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      action: 'Note Added',
      details: `${type} note added: ${note.substring(0, 50)}${note.length > 50 ? '...' : ''}`,
      performedAt: new Date()
    });

    await order.save();

    res.json({
      success: true,
      data: order,
      message: 'Note added successfully'
    });
  } catch (error) {
    console.error('Add order notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Bulk update order status
// @route   POST /api/admin/orders/bulk/status
// @access  Private (Admin)
const bulkUpdateStatus = async (req, res) => {
  try {
    const { orderIds, status, notes } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required'
      });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    // Validate all order IDs
    const invalidIds = orderIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid order IDs: ${invalidIds.join(', ')}`
      });
    }

    const orders = await Order.find({ _id: { $in: orderIds } });
    if (orders.length !== orderIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Some orders not found'
      });
    }

    // Update all orders
    const updatePromises = orders.map(async (order) => {
      const oldStatus = order.status;
      order.status = status;

      // Add timeline entry
      if (!order.timeline) order.timeline = [];
      order.timeline.push({
        action: 'Bulk Status Update',
        details: notes || `Status changed from ${oldStatus} to ${status}`,
        performedAt: new Date(),
        performedBy: 'Admin', // Required field - fixed bug
        oldValue: oldStatus,
        newValue: status
      });

      return order.save();
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      data: { updatedCount: orders.length },
      message: `${orders.length} orders updated successfully`
    });
  } catch (error) {
    console.error('Bulk update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get order analytics overview
// @route   GET /api/admin/orders/analytics/overview
// @access  Private (Admin)
const getOrderAnalytics = async (req, res) => {
  try {
    console.log('Analytics endpoint called');
    const { period = '30d' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Simplified analytics using basic queries
    const allOrders = await Order.find({}).lean();
    const periodOrders = await Order.find({ createdAt: { $gte: startDate } }).lean();

    // Calculate totals
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate period stats
    const periodOrderCount = periodOrders.length;
    const periodRevenue = periodOrders.reduce((sum, order) => sum + order.total, 0);
    const periodAverageOrderValue = periodOrderCount > 0 ? periodRevenue / periodOrderCount : 0;

    // Status distribution
    const statusDistribution = {};
    const paymentDistribution = {};

    periodOrders.forEach(order => {
      statusDistribution[order.status] = (statusDistribution[order.status] || 0) + 1;
      paymentDistribution[order.paymentStatus] = (paymentDistribution[order.paymentStatus] || 0) + 1;
    });

    // Simple daily trends (last 7 days)
    const dailyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayOrders = periodOrders.filter(order =>
        new Date(order.createdAt) >= dayStart && new Date(order.createdAt) < dayEnd
      );

      dailyTrends.push({
        date: dayStart.toISOString().split('T')[0],
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, order) => sum + order.total, 0)
      });
    }

    console.log('Analytics calculated successfully');

    res.json({
      success: true,
      data: {
        totals: { totalOrders, totalRevenue, averageOrderValue },
        period: {
          periodOrders: periodOrderCount,
          periodRevenue,
          periodAverageOrderValue
        },
        statusDistribution,
        paymentDistribution,
        dailyTrends
      }
    });
  } catch (error) {
    console.error('Get order analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update order items (add/remove/modify)
// @route   PATCH /api/admin/orders/:id/items
// @access  Private (Admin)
const updateOrderItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, adminId = 'admin' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Only allow modification for pending or processing orders
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify items for orders that are shipped or delivered'
      });
    }

    const oldItems = [...order.items];
    const oldTotal = order.total;

    // Update items
    order.items = items;

    // Recalculate totals
    let subtotal = 0;
    for (const item of order.items) {
      subtotal += item.itemTotal;
    }

    const shipping = subtotal > 50 ? 0 : 10; // Free shipping over ₹50
    const total = subtotal + shipping;

    order.subtotal = subtotal;
    order.shipping = shipping;
    order.total = total;

    // Add modification tracking
    if (!order.modifications) order.modifications = [];
    order.modifications.push({
      type: 'items_updated',
      description: `Order items modified. Total changed from ₹${oldTotal.toFixed(2)} to ₹${total.toFixed(2)}`,
      performedAt: new Date(),
      performedBy: adminId,
      oldValue: oldItems,
      newValue: items
    });

    // Add timeline entry
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      action: 'Items Modified',
      details: `Order items updated. New total: ₹${total.toFixed(2)}`,
      performedAt: new Date(),
      performedBy: adminId,
      oldValue: `₹${oldTotal.toFixed(2)}`,
      newValue: `₹${total.toFixed(2)}`
    });

    await order.save();

    res.json({
      success: true,
      data: order,
      message: 'Order items updated successfully'
    });
  } catch (error) {
    console.error('Update order items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update shipping information
// @route   PATCH /api/admin/orders/:id/shipping
// @access  Private (Admin)
const updateShippingInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { shippingInfo, adminId = 'admin' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    const order = await Order.findById(id).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const oldShippingInfo = order.shippingInfo || {};

    // Update shipping info
    order.shippingInfo = {
      ...oldShippingInfo,
      ...shippingInfo
    };

    // Add timeline entry
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      action: 'Shipping Info Updated',
      details: `Shipping information updated`,
      performedAt: new Date(),
      performedBy: adminId,
      oldValue: JSON.stringify(oldShippingInfo),
      newValue: JSON.stringify(order.shippingInfo)
    });

    await order.save();

    // Send shipping notification if tracking number was added and order is shipped
    if (shippingInfo.trackingNumber && order.status === 'shipped' && order.user?.email) {
      try {
        await sendShippingNotificationEmail(order.user, order);
      } catch (emailError) {
        console.error('Shipping notification email failed:', emailError);
      }
    }

    res.json({
      success: true,
      data: order,
      message: 'Shipping information updated successfully'
    });
  } catch (error) {
    console.error('Update shipping info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create reorder from existing order
// @route   POST /api/admin/orders/:id/reorder
// @access  Private (Admin)
const createReorder = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, adminId = 'admin' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    const originalOrder = await Order.findById(id);
    if (!originalOrder) {
      return res.status(404).json({
        success: false,
        message: 'Original order not found'
      });
    }

    // Create new order based on original
    const newOrder = new Order({
      user: userId || originalOrder.user,
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
        performedBy: adminId
      }]
    });

    await newOrder.save();

    res.json({
      success: true,
      data: newOrder,
      message: 'Reorder created successfully'
    });
  } catch (error) {
    console.error('Create reorder error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Process refund for an order
// @route   POST /api/admin/orders/:id/refund
// @access  Private (Admin)
const processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason, refundMethod = 'original_payment', adminId = 'Admin' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    const order = await Order.findById(id).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate order can be refunded
    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Only paid orders can be refunded'
      });
    }

    if (order.paymentStatus === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been refunded'
      });
    }

    // Calculate refund amount (full or partial)
    const refundAmount = amount || order.total;
    if (refundAmount > order.total) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed order total'
      });
    }

    // Generate dummy refund reference
    const refundReference = 'REF_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();

    // Update order with refund info
    order.paymentStatus = 'refunded';
    order.refundInfo = {
      amount: refundAmount,
      reason: reason || 'Refund processed by admin',
      processedAt: new Date(),
      refundMethod,
      refundReference
    };

    // Add timeline entry
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      action: 'Refund Processed',
      details: `Refund of ₹${refundAmount.toFixed(2)} processed. Reference: ${refundReference}`,
      performedAt: new Date(),
      performedBy: adminId,
      oldValue: 'paid',
      newValue: 'refunded'
    });

    // If order is cancelled, update cancellation refund status
    if (order.status === 'cancelled' && order.cancellation) {
      order.cancellation.refundStatus = 'processed';
    }

    await order.save();

    // Send refund notification email
    if (order.user?.email) {
      try {
        const { sendEmail } = require('../utils/email');
        await sendEmail({
          email: order.user.email,
          subject: `Refund Processed - Order #${order._id.toString().slice(-8)}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #28a745;">Refund Processed</h2>
              <p>Hi ${order.user.name},</p>
              <p>Your refund has been successfully processed.</p>
              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Refund Details</h3>
                <p><strong>Order #:</strong> ${order._id.toString().slice(-8)}</p>
                <p><strong>Refund Amount:</strong> ₹${refundAmount.toFixed(2)}</p>
                <p><strong>Refund Reference:</strong> ${refundReference}</p>
                <p><strong>Refund Method:</strong> ${refundMethod.replace('_', ' ')}</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              </div>
              <p>The refund will be credited to your original payment method within 5-10 business days.</p>
              <p>If you have any questions, please contact our support team.</p>
            </div>
          `,
          message: `Refund processed for Order #${order._id.toString().slice(-8)}`
        });
      } catch (emailError) {
        console.error('Refund notification email failed:', emailError);
      }
    }

    res.json({
      success: true,
      data: {
        order,
        refund: {
          amount: refundAmount,
          reference: refundReference,
          method: refundMethod,
          processedAt: order.refundInfo.processedAt
        }
      },
      message: 'Refund processed successfully'
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get refund statistics
// @route   GET /api/admin/orders/refunds/stats
// @access  Private (Admin)
const getRefundStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    const now = new Date();
    let startDate;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const refundedOrders = await Order.find({
      paymentStatus: 'refunded',
      'refundInfo.processedAt': { $gte: startDate }
    }).lean();

    const totalRefunds = refundedOrders.length;
    const totalRefundAmount = refundedOrders.reduce(
      (sum, order) => sum + (order.refundInfo?.amount || 0),
      0
    );

    // Group by reason
    const reasonCounts = {};
    refundedOrders.forEach(order => {
      const reason = order.refundInfo?.reason || 'Not specified';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalRefunds,
        totalRefundAmount,
        averageRefund: totalRefunds > 0 ? totalRefundAmount / totalRefunds : 0,
        reasonCounts,
        period
      }
    });
  } catch (error) {
    console.error('Get refund stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  addOrderNotes,
  bulkUpdateStatus,
  getOrderAnalytics,
  updateOrderItems,
  updateShippingInfo,
  createReorder,
  processRefund,
  getRefundStats
};
