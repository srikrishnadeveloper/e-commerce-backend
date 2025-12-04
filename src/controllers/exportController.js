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
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      tax: order.tax,
      shippingCost: order.shippingCost,
      discount: order.discount || 0,
      total: order.total,
      itemCount: order.items?.length || 0,
      items: order.items?.map(i => `${i.name || i.product?.name} x${i.quantity}`).join('; ') || '',
      shippingCity: order.shippingAddress?.city || '',
      shippingState: order.shippingAddress?.state || '',
      shippingCountry: order.shippingAddress?.country || '',
      trackingNumber: order.shippingInfo?.trackingNumber || '',
      carrier: order.shippingInfo?.carrier || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    const columns = [
      { key: 'orderNumber', label: 'Order Number' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'customerEmail', label: 'Customer Email' },
      { key: 'status', label: 'Status' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'subtotal', label: 'Subtotal' },
      { key: 'tax', label: 'Tax' },
      { key: 'shippingCost', label: 'Shipping' },
      { key: 'discount', label: 'Discount' },
      { key: 'total', label: 'Total' },
      { key: 'itemCount', label: 'Item Count' },
      { key: 'items', label: 'Items' },
      { key: 'shippingCity', label: 'City' },
      { key: 'shippingState', label: 'State' },
      { key: 'shippingCountry', label: 'Country' },
      { key: 'trackingNumber', label: 'Tracking Number' },
      { key: 'carrier', label: 'Carrier' },
      { key: 'createdAt', label: 'Created At' },
      { key: 'updatedAt', label: 'Updated At' }
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
    const { startDate, endDate, format = 'csv' } = req.query;

    // Build query
    const query = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Fetch users
    const users = await User.find(query)
      .select('-password -passwordConfirm -passwordResetToken -passwordResetExpires')
      .lean();

    // Get order stats for each customer
    const customerIds = users.map(u => u._id);
    const orderStats = await Order.aggregate([
      { $match: { user: { $in: customerIds }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$user',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          lastOrderDate: { $max: '$createdAt' }
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
        name: user.name,
        email: user.email,
        totalOrders: stats.totalOrders || 0,
        totalSpent: stats.totalSpent || 0,
        lastOrderDate: stats.lastOrderDate || '',
        addressCount: user.addresses?.length || 0,
        wishlistCount: user.wishlist?.length || 0,
        cartItemCount: user.cart?.length || 0,
        createdAt: user.createdAt
      };
    });

    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'totalOrders', label: 'Total Orders' },
      { key: 'totalSpent', label: 'Total Spent' },
      { key: 'lastOrderDate', label: 'Last Order Date' },
      { key: 'addressCount', label: 'Addresses' },
      { key: 'wishlistCount', label: 'Wishlist Items' },
      { key: 'cartItemCount', label: 'Cart Items' },
      { key: 'createdAt', label: 'Registered At' }
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

    // Transform data for export
    const exportData = products.map(product => ({
      name: product.name,
      category: product.category || product.categoryId?.name || '',
      price: product.price,
      originalPrice: product.originalPrice || '',
      inStock: product.inStock ? 'Yes' : 'No',
      stockQuantity: product.stockQuantity || 0,
      reservedQuantity: product.reservedQuantity || 0,
      availableQuantity: (product.stockQuantity || 0) - (product.reservedQuantity || 0),
      rating: product.rating || 0,
      reviews: product.reviews || 0,
      bestseller: product.bestseller ? 'Yes' : 'No',
      featured: product.featured ? 'Yes' : 'No',
      hasVariants: product.hasVariants ? 'Yes' : 'No',
      variantCount: product.variants?.length || 0,
      colors: product.colors?.map(c => c.name).join('; ') || '',
      sizes: product.sizes?.join('; ') || '',
      tags: product.tags?.join('; ') || '',
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    const columns = [
      { key: 'name', label: 'Product Name' },
      { key: 'category', label: 'Category' },
      { key: 'price', label: 'Price' },
      { key: 'originalPrice', label: 'Original Price' },
      { key: 'inStock', label: 'In Stock' },
      { key: 'stockQuantity', label: 'Stock Qty' },
      { key: 'reservedQuantity', label: 'Reserved Qty' },
      { key: 'availableQuantity', label: 'Available Qty' },
      { key: 'rating', label: 'Rating' },
      { key: 'reviews', label: 'Reviews' },
      { key: 'bestseller', label: 'Bestseller' },
      { key: 'featured', label: 'Featured' },
      { key: 'hasVariants', label: 'Has Variants' },
      { key: 'variantCount', label: 'Variant Count' },
      { key: 'colors', label: 'Colors' },
      { key: 'sizes', label: 'Sizes' },
      { key: 'tags', label: 'Tags' },
      { key: 'createdAt', label: 'Created At' },
      { key: 'updatedAt', label: 'Updated At' }
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
      groupBy = 'daily',
      format = 'csv'
    } = req.query;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Determine grouping
    let dateFormat;
    switch (groupBy) {
      case 'hourly':
        dateFormat = '%Y-%m-%d %H:00';
        break;
      case 'daily':
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateFormat = '%Y-W%V';
        break;
      case 'monthly':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

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
          totalTax: { $sum: '$tax' },
          totalShipping: { $sum: '$shippingCost' },
          averageOrderValue: { $avg: '$total' },
          paidOrders: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ];

    const salesData = await Order.aggregate(salesPipeline);

    // Transform data for export
    const exportData = salesData.map(item => ({
      period: item._id,
      totalOrders: item.totalOrders,
      totalRevenue: item.totalRevenue.toFixed(2),
      totalTax: item.totalTax.toFixed(2),
      totalShipping: item.totalShipping.toFixed(2),
      averageOrderValue: item.averageOrderValue.toFixed(2),
      paidOrders: item.paidOrders,
      pendingOrders: item.pendingOrders
    }));

    // Add summary row
    const summary = {
      period: 'TOTAL',
      totalOrders: exportData.reduce((sum, row) => sum + row.totalOrders, 0),
      totalRevenue: exportData.reduce((sum, row) => sum + parseFloat(row.totalRevenue), 0).toFixed(2),
      totalTax: exportData.reduce((sum, row) => sum + parseFloat(row.totalTax), 0).toFixed(2),
      totalShipping: exportData.reduce((sum, row) => sum + parseFloat(row.totalShipping), 0).toFixed(2),
      averageOrderValue: (exportData.reduce((sum, row) => sum + parseFloat(row.totalRevenue), 0) / 
        exportData.reduce((sum, row) => sum + row.totalOrders, 0) || 0).toFixed(2),
      paidOrders: exportData.reduce((sum, row) => sum + row.paidOrders, 0),
      pendingOrders: exportData.reduce((sum, row) => sum + row.pendingOrders, 0)
    };
    
    exportData.push(summary);

    const columns = [
      { key: 'period', label: 'Period' },
      { key: 'totalOrders', label: 'Total Orders' },
      { key: 'totalRevenue', label: 'Total Revenue' },
      { key: 'totalTax', label: 'Total Tax' },
      { key: 'totalShipping', label: 'Total Shipping' },
      { key: 'averageOrderValue', label: 'Avg Order Value' },
      { key: 'paidOrders', label: 'Paid Orders' },
      { key: 'pendingOrders', label: 'Pending Orders' }
    ];

    if (format === 'json') {
      res.status(200).json({
        status: 'success',
        count: exportData.length,
        period: { startDate: start, endDate: end },
        groupBy,
        data: exportData
      });
    } else {
      const csv = convertToCSV(exportData, columns);
      const filename = `sales_report_${groupBy}_${new Date().toISOString().split('T')[0]}.csv`;
      
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
        filters: ['startDate', 'endDate']
      },
      {
        id: 'products',
        name: 'Products',
        description: 'Export product catalog with inventory details',
        endpoint: '/api/export/products',
        filters: ['category', 'inStock']
      },
      {
        id: 'sales',
        name: 'Sales Report',
        description: 'Export sales analytics by time period',
        endpoint: '/api/export/sales',
        filters: ['startDate', 'endDate', 'groupBy']
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
