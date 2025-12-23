const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// Helper function to convert data to CSV
const convertToCSV = (data, columns) => {
  if (!data || data.length === 0) return '';
  
  // Header row
  const header = columns.map(col => col.label || col.key).join(',');
  
  // Data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = col.key.split('.').reduce((obj, key) => obj?.[key], item);
      
      // Handle special cases
      if (value === undefined || value === null) value = '';
      if (typeof value === 'object') value = JSON.stringify(value);
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      if (value instanceof Date) value = value.toISOString();
      
      return value;
    }).join(',');
  });
  
  return [header, ...rows].join('\n');
};

// @desc    Export orders to CSV
// @route   GET /api/export/orders
// @access  Admin
exports.exportOrders = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      status,
      format = 'csv'
    } = req.query;

    // Build query
    const query = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    if (status) {
      query.status = status;
    }

    // Fetch orders with populated data
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Transform data for export
    const exportData = orders.map(order => ({
      orderNumber: order.orderNumber,
      customerName: order.user?.name || order.shippingAddress?.fullName || 'Guest',
      customerEmail: order.user?.email || order.guestEmail || '',
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      itemCount: order.items?.length || 0,
      items: order.items?.map(i => `${i.name || i.product?.name} x${i.quantity}`).join('; ') || '',
      shippingCity: order.shippingAddress?.city || '',
      shippingState: order.shippingAddress?.state || '',
      createdAt: order.createdAt
    }));

    const columns = [
      { key: 'orderNumber', label: 'Order Number' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'customerEmail', label: 'Customer Email' },
      { key: 'status', label: 'Status' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'total', label: 'Total' },
      { key: 'itemCount', label: 'Item Count' },
      { key: 'items', label: 'Items' },
      { key: 'shippingCity', label: 'City' },
      { key: 'shippingState', label: 'State' },
      { key: 'createdAt', label: 'Created At' }
    ];

    if (format === 'json') {
      res.status(200).json({
        status: 'success',
        count: exportData.length,
        data: exportData
      });
    } else {
      const csv = convertToCSV(exportData, columns);
      const filename = `orders_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    }
  } catch (error) {
    console.error('Export orders error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Export customers to CSV
// @route   GET /api/export/customers
// @access  Admin
exports.exportCustomers = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    // Build query - exclude admins (note: date filters removed as User model doesn't have timestamps)
    const query = { role: { $ne: 'admin' } };

    // Fetch users
    const users = await User.find(query)
      .select('name email phone')
      .lean();

    // Get order stats for each customer
    const customerIds = users.map(u => u._id);
    const orderStats = await Order.aggregate([
      { $match: { user: { $in: customerIds }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$user',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' }
        }
      }
    ]);

    const orderStatsMap = {};
    orderStats.forEach(stat => {
      orderStatsMap[stat._id.toString()] = stat;
    });

    // Transform data for export
    const exportData = users.map(user => {
      const stats = orderStatsMap[user._id.toString()] || {};
      return {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        totalOrders: stats.totalOrders || 0,
        totalSpent: (stats.totalSpent || 0).toFixed(2)
      };
    });

    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'totalOrders', label: 'Total Orders' },
      { key: 'totalSpent', label: 'Total Spent' }
    ];

    if (format === 'json') {
      res.status(200).json({
        status: 'success',
        count: exportData.length,
        data: exportData
      });
    } else {
      const csv = convertToCSV(exportData, columns);
      const filename = `customers_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    }
  } catch (error) {
    console.error('Export customers error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Export products to CSV
// @route   GET /api/export/products
// @access  Admin
exports.exportProducts = async (req, res) => {
  try {
    const { category, inStock, format = 'csv' } = req.query;

    // Build query
    const query = {};
    
    if (category) query.category = category;
    if (inStock !== undefined) query.inStock = inStock === 'true';

    // Fetch products
    const products = await Product.find(query)
      .populate('categoryId', 'name')
      .lean();

    // Transform data for export - simplified with only useful fields
    const exportData = products.map(product => ({
      name: product.name,
      category: product.category || product.categoryId?.name || '',
      price: product.price,
      inStock: product.inStock ? 'Yes' : 'No',
      stockQuantity: product.stockQuantity || 0,
      rating: product.rating || 0,
      reviews: product.reviews || 0
    }));

    const columns = [
      { key: 'name', label: 'Product Name' },
      { key: 'category', label: 'Category' },
      { key: 'price', label: 'Price' },
      { key: 'inStock', label: 'In Stock' },
      { key: 'stockQuantity', label: 'Stock Qty' },
      { key: 'rating', label: 'Rating' },
      { key: 'reviews', label: 'Reviews' }
    ];

    if (format === 'json') {
      res.status(200).json({
        status: 'success',
        count: exportData.length,
        data: exportData
      });
    } else {
      const csv = convertToCSV(exportData, columns);
      const filename = `products_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    }
  } catch (error) {
    console.error('Export products error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Export sales report to CSV
// @route   GET /api/export/sales
// @access  Admin
exports.exportSalesReport = async (req, res) => {
  try {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      format = 'csv'
    } = req.query;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Use daily grouping
    const dateFormat = '%Y-%m-%d';

    const salesPipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: '$createdAt' }
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ];

    const salesData = await Order.aggregate(salesPipeline);

    // Transform data for export
    const exportData = salesData.map(item => ({
      date: item._id,
      orders: item.totalOrders,
      revenue: item.totalRevenue.toFixed(2),
      avgOrderValue: item.averageOrderValue.toFixed(2)
    }));

    // Add summary row
    const totalOrders = exportData.reduce((sum, row) => sum + row.orders, 0);
    const totalRevenue = exportData.reduce((sum, row) => sum + parseFloat(row.revenue), 0);
    
    const summary = {
      date: 'TOTAL',
      orders: totalOrders,
      revenue: totalRevenue.toFixed(2),
      avgOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'
    };
    
    exportData.push(summary);

    const columns = [
      { key: 'date', label: 'Date' },
      { key: 'orders', label: 'Orders' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'avgOrderValue', label: 'Avg Order Value' }
    ];

    if (format === 'json') {
      res.status(200).json({
        status: 'success',
        count: exportData.length,
        period: { startDate: start, endDate: end },
        data: exportData
      });
    } else {
      const csv = convertToCSV(exportData, columns);
      const filename = `sales_report_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    }
  } catch (error) {
    console.error('Export sales report error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// @desc    Get available export types
// @route   GET /api/export/types
// @access  Admin
exports.getExportTypes = async (req, res) => {
  try {
    const exportTypes = [
      {
        id: 'orders',
        name: 'Orders',
        description: 'Export all orders with customer and shipping details',
        endpoint: '/api/export/orders',
        filters: ['startDate', 'endDate', 'status']
      },
      {
        id: 'customers',
        name: 'Customers',
        description: 'Export customer list with order statistics',
        endpoint: '/api/export/customers',
        filters: []
      },
      {
        id: 'products',
        name: 'Products',
        description: 'Export product catalog with inventory details',
        endpoint: '/api/export/products',
        filters: ['inStock']
      },
      {
        id: 'sales',
        name: 'Sales Report',
        description: 'Export sales analytics by time period',
        endpoint: '/api/export/sales',
        filters: ['startDate', 'endDate']
      }
    ];

    res.status(200).json({
      status: 'success',
      data: exportTypes
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
