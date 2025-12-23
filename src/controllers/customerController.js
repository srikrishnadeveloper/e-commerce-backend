const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Helper function to calculate customer metrics
const calculateCustomerMetrics = async (userId) => {
  const orders = await Order.find({ user: userId });
  const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
  const orderCount = orders.length;
  const averageOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
  
  return {
    orderCount,
    totalSpent,
    averageOrderValue
  };
};

// @desc    Get all customers with filtering and pagination
// @route   GET /api/admin/customers
// @access  Private (Admin)
const getCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      hasWishlist,
      hasCart,
      hasOrders,
      registeredAfter,
      registeredBefore
    } = req.query;

    // Build filter query
    const filter = {};

    // Search by name or email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by wishlist presence
    if (hasWishlist === 'true') {
      filter['wishlist.0'] = { $exists: true };
    } else if (hasWishlist === 'false') {
      filter.wishlist = { $size: 0 };
    }

    // Filter by cart presence
    if (hasCart === 'true') {
      filter['cart.0'] = { $exists: true };
    } else if (hasCart === 'false') {
      filter.cart = { $size: 0 };
    }

    // Filter by registration date
    if (registeredAfter || registeredBefore) {
      filter._id = {};
      if (registeredAfter) {
        const afterDate = new Date(registeredAfter);
        const afterObjectId = new mongoose.Types.ObjectId(Math.floor(afterDate.getTime() / 1000).toString(16) + '0000000000000000');
        filter._id.$gte = afterObjectId;
      }
      if (registeredBefore) {
        const beforeDate = new Date(registeredBefore);
        const beforeObjectId = new mongoose.Types.ObjectId(Math.floor(beforeDate.getTime() / 1000).toString(16) + '0000000000000000');
        filter._id.$lte = beforeObjectId;
      }
    }

    // Build sort object for database fields
    const sort = {};
    const isCalculatedField = ['totalSpent', 'orderCount', 'averageOrderValue'].includes(sortBy);
    
    if (!isCalculatedField) {
      if (sortBy === 'createdAt') {
        sort._id = sortOrder === 'asc' ? 1 : -1;
      } else {
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      }
    } else {
      // Default sort by _id for calculated fields (we'll sort after calculation)
      sort._id = -1;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get customers with basic info
    // For calculated field sorting, we need to fetch more data and sort afterwards
    const fetchLimit = isCalculatedField ? 1000 : parseInt(limit); // Fetch more for sorting
    const fetchSkip = isCalculatedField ? 0 : skip;

    const customers = await User.find(filter)
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort(sort)
      .skip(fetchSkip)
      .limit(fetchLimit);

    // Get total count for pagination
    const totalCustomers = await User.countDocuments(filter);

    // Calculate additional metrics for each customer
    let customersWithMetrics = await Promise.all(
      customers.map(async (customer) => {
        const metrics = await calculateCustomerMetrics(customer._id);
        return {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          registrationDate: customer._id.getTimestamp(),
          wishlistCount: customer.wishlist?.length || 0,
          cartCount: customer.cart?.length || 0,
          ...metrics
        };
      })
    );

    // Sort by calculated field if needed
    if (isCalculatedField) {
      customersWithMetrics.sort((a, b) => {
        const aVal = a[sortBy] || 0;
        const bVal = b[sortBy] || 0;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
      // Apply pagination after sorting
      customersWithMetrics = customersWithMetrics.slice(skip, skip + parseInt(limit));
    }

    // Calculate filter statistics
    const [totalWithWishlist, totalWithCart] = await Promise.all([
      User.countDocuments({ 'wishlist.0': { $exists: true } }),
      User.countDocuments({ 'cart.0': { $exists: true } })
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCustomers / parseInt(limit));
    const currentPage = parseInt(page);

    res.json({
      success: true,
      data: {
        customers: customersWithMetrics,
        pagination: {
          currentPage,
          totalPages,
          totalCustomers,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
          limit: parseInt(limit)
        },
        filters: {
          totalWithWishlist,
          totalWithCart
        }
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get customer by ID with detailed information
// @route   GET /api/admin/customers/:id
// @access  Private (Admin)
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    // Get customer basic info
    const customer = await User.findById(id)
      .select('-password -passwordResetToken -passwordResetExpires');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get customer metrics
    const metrics = await calculateCustomerMetrics(id);

    // Get populated wishlist
    const customerWithWishlist = await User.findById(id)
      .populate('wishlist', 'name price images category')
      .select('wishlist');

    // Get populated cart
    const customerWithCart = await User.findById(id)
      .populate('cart.product', 'name price images category')
      .select('cart');

    // Get recent orders (last 10)
    const recentOrders = await Order.find({ user: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('items.product', 'name images');

    // Calculate activity metrics
    const activityMetrics = {
      lastLogin: customer._id.getTimestamp(), // Using registration as placeholder
      totalSessions: Math.floor(Math.random() * 100) + 1, // Placeholder
      averageSessionDuration: '12m 30s' // Placeholder
    };

    res.json({
      success: true,
      data: {
        customer: {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          registrationDate: customer._id.getTimestamp(),
          lastActive: customer._id.getTimestamp(), // Placeholder
          wishlistCount: customer.wishlist.length,
          cartCount: customer.cart.length,
          ...metrics
        },
        wishlist: customerWithWishlist.wishlist,
        cart: customerWithCart.cart,
        recentOrders,
        activityMetrics
      }
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get customer wishlist with pagination
// @route   GET /api/admin/customers/:id/wishlist
// @access  Private (Admin)
const getCustomerWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    const customer = await User.findById(id).select('wishlist');
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Calculate pagination for wishlist
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const wishlistIds = customer.wishlist.slice(skip, skip + parseInt(limit));

    // Get populated wishlist items
    const wishlistItems = await Product.find({ _id: { $in: wishlistIds } });

    const totalItems = customer.wishlist.length;
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    res.json({
      success: true,
      data: {
        wishlist: wishlistItems,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get customer wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get customer order history with pagination
// @route   GET /api/admin/customers/:id/orders
// @access  Private (Admin)
const getCustomerOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      dateFrom,
      dateTo
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    // Build filter for orders
    const filter = { user: id };

    if (status) {
      filter.status = status;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('items.product', 'name images');

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

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
        }
      }
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get customer analytics overview
// @route   GET /api/admin/customers/analytics/overview
// @access  Private (Admin)
const getCustomerAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Create ObjectIds for date filtering
    const thisMonthOid = new mongoose.Types.ObjectId(Math.floor(thisMonth.getTime() / 1000).toString(16) + '0000000000000000');
    const thisWeekOid = new mongoose.Types.ObjectId(Math.floor(thisWeek.getTime() / 1000).toString(16) + '0000000000000000');
    const last30DaysOid = new mongoose.Types.ObjectId(Math.floor(last30Days.getTime() / 1000).toString(16) + '0000000000000000');

    // Get basic totals
    const [totalCustomers, newThisMonth, activeThisWeek] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ _id: { $gte: thisMonthOid } }),
      User.countDocuments({ _id: { $gte: thisWeekOid } }) // Using registration as activity placeholder
    ]);

    // Get registration trend for last 30 days
    const registrationTrend = await User.aggregate([
      { $match: { _id: { $gte: last30DaysOid } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$_id' } } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get top customers by spending (requires orders)
    const topCustomersBySpending = await Order.aggregate([
      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      {
        $project: {
          name: '$customer.name',
          email: '$customer.email',
          totalSpent: 1,
          orderCount: 1
        }
      }
    ]);

    // Customer segments (simplified)
    const [withOrders, withWishlist, withCart] = await Promise.all([
      User.countDocuments({ _id: { $in: await Order.distinct('user') } }),
      User.countDocuments({ 'wishlist.0': { $exists: true } }),
      User.countDocuments({ 'cart.0': { $exists: true } })
    ]);

    // Wishlist analytics
    const wishlistAnalytics = await User.aggregate([
      { $match: { 'wishlist.0': { $exists: true } } },
      {
        $project: {
          wishlistSize: { $size: '$wishlist' },
          wishlist: 1
        }
      },
      {
        $group: {
          _id: null,
          averageWishlistSize: { $avg: '$wishlistSize' },
          allWishlistItems: { $push: '$wishlist' }
        }
      }
    ]);

    const avgWishlistSize = wishlistAnalytics[0]?.averageWishlistSize || 0;

    res.json({
      success: true,
      data: {
        totals: {
          customers: totalCustomers,
          newThisMonth,
          activeThisWeek
        },
        registrationTrend,
        topCustomersBySpending,
        customerSegments: {
          withOrders,
          withWishlist,
          withCart,
          newCustomers: newThisMonth
        },
        wishlistAnalytics: {
          averageWishlistSize: Math.round(avgWishlistSize * 10) / 10
        }
      }
    });
  } catch (error) {
    console.error('Get customer analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get customer statistics
// @route   GET /api/admin/customers/stats
// @access  Private (Admin)
const getCustomerStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Create ObjectIds for date filtering
    const todayOid = new mongoose.Types.ObjectId(Math.floor(today.getTime() / 1000).toString(16) + '0000000000000000');
    const thisWeekOid = new mongoose.Types.ObjectId(Math.floor(thisWeek.getTime() / 1000).toString(16) + '0000000000000000');
    const thisMonthOid = new mongoose.Types.ObjectId(Math.floor(thisMonth.getTime() / 1000).toString(16) + '0000000000000000');

    // Get overview statistics
    const [
      totalCustomers,
      newToday,
      newThisWeek,
      newThisMonth,
      withWishlist,
      withCart,
      withOrders
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ _id: { $gte: todayOid } }),
      User.countDocuments({ _id: { $gte: thisWeekOid } }),
      User.countDocuments({ _id: { $gte: thisMonthOid } }),
      User.countDocuments({ 'wishlist.0': { $exists: true } }),
      User.countDocuments({ 'cart.0': { $exists: true } }),
      User.countDocuments({ _id: { $in: await Order.distinct('user') } })
    ]);

    // Get revenue statistics
    const revenueStats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const revenue = revenueStats[0] || { totalRevenue: 0, averageOrderValue: 0, totalOrders: 0 };

    // Get top spenders
    const topSpenders = await Order.aggregate([
      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      {
        $project: {
          name: '$customer.name',
          email: '$customer.email',
          totalSpent: 1,
          orderCount: 1
        }
      }
    ]);

    // Calculate repeat customers (customers with more than 1 order)
    const repeatCustomers = await Order.aggregate([
      {
        $group: {
          _id: '$user',
          orderCount: { $sum: 1 }
        }
      },
      { $match: { orderCount: { $gt: 1 } } },
      { $count: 'repeatCustomers' }
    ]);

    const repeatCustomerCount = repeatCustomers[0]?.repeatCustomers || 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalCustomers,
          newToday,
          newThisWeek,
          newThisMonth
        },
        engagement: {
          withWishlist,
          withCart,
          withOrders,
          repeatCustomers: repeatCustomerCount
        },
        revenue: {
          totalRevenue: revenue.totalRevenue,
          averageOrderValue: Math.round(revenue.averageOrderValue * 100) / 100,
          totalOrders: revenue.totalOrders,
          topSpenders
        }
      }
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Search customers with suggestions
// @route   GET /api/admin/customers/search/suggestions
// @access  Private (Admin)
const getCustomerSuggestions = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }

    const suggestions = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
    .select('name email')
    .limit(parseInt(limit));

    res.json({
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    console.error('Get customer suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Export customers data
// @route   GET /api/admin/customers/export
// @access  Private (Admin)
const exportCustomers = async (req, res) => {
  try {
    const { format = 'json', fields } = req.query;

    // Build projection based on requested fields
    let projection = '-password -passwordResetToken -passwordResetExpires';
    if (fields) {
      const requestedFields = fields.split(',');
      projection = requestedFields.join(' ');
    }

    const customers = await User.find({}).select(projection);

    // Add calculated fields
    const customersWithMetrics = await Promise.all(
      customers.map(async (customer) => {
        const metrics = await calculateCustomerMetrics(customer._id);
        return {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          registrationDate: customer._id.getTimestamp(),
          wishlistCount: customer.wishlist?.length || 0,
          cartCount: customer.cart?.length || 0,
          ...metrics
        };
      })
    );

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(customersWithMetrics);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
      return res.send(csv);
    }

    res.json({
      success: true,
      data: { customers: customersWithMetrics }
    });
  } catch (error) {
    console.error('Export customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to convert data to CSV
const convertToCSV = (data) => {
  if (!data.length) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');

  const csvRows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
};

module.exports = {
  getCustomers,
  getCustomerById,
  getCustomerWishlist,
  getCustomerOrders,
  getCustomerAnalytics,
  getCustomerStats,
  getCustomerSuggestions,
  exportCustomers
};
