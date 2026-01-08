const AnalyticsService = require('../services/analyticsService');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { AnalyticsEvent, DailyAnalytics } = require('../models/Analytics');

// @desc    Get real-time dashboard metrics
// @route   GET /api/analytics/dashboard
// @access  Admin
const getDashboardMetrics = async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const metrics = await AnalyticsService.getDashboardMetrics(timeframe);
    
    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get revenue analytics with time series data
// @route   GET /api/analytics/revenue
// @access  Admin
const getRevenueAnalytics = async (req, res) => {
  try {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      granularity = 'daily',
      originalRevenue = 'false'
    } = req.query;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const useOriginalRevenue = originalRevenue === 'true';

    // Time series revenue data
    let groupBy;
    switch (granularity) {
      case 'hourly':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      case 'daily':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'weekly':
        groupBy = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'monthly':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      default:
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    }

    const timeSeriesPipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
          averageOrderValue: { $avg: '$total' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
      }
    ];

    const timeSeriesData = await Order.aggregate(timeSeriesPipeline);

    // Revenue by payment method
    const paymentMethodPipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      }
    ];

    const paymentMethodData = await Order.aggregate(paymentMethodPipeline);

    // Revenue forecasting (simple linear regression)
    const forecast = await generateRevenueForecast(timeSeriesData, granularity);

    res.status(200).json({
      success: true,
      data: {
        timeSeries: timeSeriesData,
        paymentMethods: paymentMethodData,
        forecast,
        period: { startDate: start, endDate: end },
        granularity
      }
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get order analytics
// @route   GET /api/analytics/orders
// @access  Admin
const getOrderAnalytics = async (req, res) => {
  try {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = req.query;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Order status distribution over time
    const statusTimelinePipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ];

    const statusTimeline = await Order.aggregate(statusTimelinePipeline);

    // Average order processing time by status
    const processingTimePipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['delivered', 'shipped'] }
        }
      },
      {
        $project: {
          status: 1,
          processingTime: {
            $cond: {
              if: { $eq: ['$status', 'delivered'] },
              then: {
                $divide: [
                  { $subtract: ['$shippingInfo.actualDelivery', '$createdAt'] },
                  1000 * 60 * 60 * 24
                ]
              },
              else: {
                $divide: [
                  { $subtract: ['$shippingInfo.shippedAt', '$createdAt'] },
                  1000 * 60 * 60 * 24
                ]
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$status',
          averageProcessingTime: { $avg: '$processingTime' },
          minProcessingTime: { $min: '$processingTime' },
          maxProcessingTime: { $max: '$processingTime' }
        }
      }
    ];

    const processingTimes = await Order.aggregate(processingTimePipeline);

    // Order value distribution
    const orderValuePipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $bucket: {
          groupBy: '$total',
          boundaries: [0, 25, 50, 100, 200, 500, 1000, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            totalRevenue: { $sum: '$total' }
          }
        }
      }
    ];

    const orderValueDistribution = await Order.aggregate(orderValuePipeline);

    res.status(200).json({
      success: true,
      data: {
        statusTimeline,
        processingTimes,
        orderValueDistribution,
        period: { startDate: start, endDate: end }
      }
    });
  } catch (error) {
    console.error('Order analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get customer analytics
// @route   GET /api/analytics/customers
// @access  Admin
const getCustomerAnalytics = async (req, res) => {
  try {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = req.query;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Customer acquisition over time
    const acquisitionPipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          newCustomers: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ];

    const customerAcquisition = await User.aggregate(acquisitionPipeline);

    // Customer lifetime value segments
    const clvPipeline = [
      {
        $match: {
          status: { $ne: 'cancelled' },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$total' },
          orderCount: { $sum: 1 },
          firstOrder: { $min: '$createdAt' },
          lastOrder: { $max: '$createdAt' }
        }
      },
      {
        $bucket: {
          groupBy: '$totalSpent',
          boundaries: [0, 100, 250, 500, 1000, 2000, Infinity],
          default: 'Other',
          output: {
            customerCount: { $sum: 1 },
            averageOrderValue: { $avg: { $divide: ['$totalSpent', '$orderCount'] } },
            totalRevenue: { $sum: '$totalSpent' }
          }
        }
      }
    ];

    const clvSegments = await Order.aggregate(clvPipeline);

    // Customer retention analysis
    const retentionPipeline = [
      {
        $match: {
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$user',
          orders: { $push: '$createdAt' }
        }
      },
      {
        $project: {
          orderCount: { $size: '$orders' },
          isReturning: { $gt: [{ $size: '$orders' }, 1] }
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          returningCustomers: {
            $sum: { $cond: ['$isReturning', 1, 0] }
          }
        }
      }
    ];

    const [retentionData] = await Order.aggregate(retentionPipeline);

    const retentionRate = retentionData 
      ? (retentionData.returningCustomers / retentionData.totalCustomers) * 100 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        customerAcquisition,
        clvSegments,
        retentionRate,
        retentionData,
        period: { startDate: start, endDate: end }
      }
    });
  } catch (error) {
    console.error('Customer analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get product performance analytics
// @route   GET /api/analytics/products
// @access  Admin
const getProductAnalytics = async (req, res) => {
  try {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      limit = 20
    } = req.query;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Top performing products
    const topProductsPipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.itemTotal' },
          orderCount: { $sum: 1 },
          averagePrice: { $avg: '$items.price' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $unwind: '$productInfo'
      },
      {
        $project: {
          name: '$productInfo.name',
          category: '$productInfo.category',
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1,
          averagePrice: 1,
          profitMargin: {
            $multiply: [
              { $divide: [
                { $subtract: ['$averagePrice', { $ifNull: ['$productInfo.cost', 0] }] },
                '$averagePrice'
              ]},
              100
            ]
          }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ];

    const topProducts = await Order.aggregate(topProductsPipeline);

    // Category performance
    const categoryPipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $unwind: '$productInfo'
      },
      {
        $group: {
          _id: '$productInfo.category',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.itemTotal' },
          uniqueProducts: { $addToSet: '$items.product' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          totalQuantity: 1,
          totalRevenue: 1,
          uniqueProductCount: { $size: '$uniqueProducts' },
          orderCount: 1,
          averageOrderValue: { $divide: ['$totalRevenue', '$orderCount'] }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ];

    const categoryPerformance = await Order.aggregate(categoryPipeline);

    res.status(200).json({
      success: true,
      data: {
        topProducts,
        categoryPerformance,
        period: { startDate: start, endDate: end }
      }
    });
  } catch (error) {
    console.error('Product analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function for revenue forecasting
async function generateRevenueForecast(timeSeriesData, granularity) {
  if (timeSeriesData.length < 2) {
    return { forecast: [], confidence: 0 };
  }

  // Simple linear regression for forecasting
  const revenues = timeSeriesData.map(d => d.revenue);
  const n = revenues.length;
  const x = Array.from({ length: n }, (_, i) => i);
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = revenues.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * revenues[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Generate forecast for next periods
  const forecastPeriods = Math.min(7, Math.floor(n / 2)); // Forecast up to 7 periods or half the data length
  const forecast = [];
  
  for (let i = 0; i < forecastPeriods; i++) {
    const nextX = n + i;
    const forecastValue = slope * nextX + intercept;
    forecast.push({
      period: nextX,
      forecastRevenue: Math.max(0, forecastValue), // Ensure non-negative
      confidence: Math.max(0, 1 - (i * 0.1)) // Decreasing confidence over time
    });
  }
  
  return { forecast, trendSlope: slope };
}

module.exports = {
  getDashboardMetrics,
  getRevenueAnalytics,
  getOrderAnalytics,
  getCustomerAnalytics,
  getProductAnalytics
};
