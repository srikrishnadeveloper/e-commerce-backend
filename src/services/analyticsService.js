const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const {
  AnalyticsEvent,
  DailyAnalytics,
  ProductAnalytics,
  CustomerAnalytics,
  GeographicAnalytics,
  InventoryAnalytics
} = require('../models/Analytics');

class AnalyticsService {
  // Track analytics events
  static async trackEvent(eventType, data = {}) {
    try {
      const event = new AnalyticsEvent({
        eventType,
        userId: data.userId,
        orderId: data.orderId,
        productId: data.productId,
        metadata: data.metadata || {},
        value: data.value || 0,
        timestamp: data.timestamp || new Date()
      });
      
      await event.save();
      return event;
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      throw error;
    }
  }

  // Get real-time dashboard metrics
  static async getDashboardMetrics(timeframe = '30d') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      // Calculate start date based on timeframe
      switch (timeframe) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Parallel execution of all metrics
      const [
        revenueMetrics,
        orderMetrics,
        customerMetrics,
        productMetrics,
        conversionMetrics,
        geographicMetrics
      ] = await Promise.all([
        this.getRevenueMetrics(startDate, endDate),
        this.getOrderMetrics(startDate, endDate),
        this.getCustomerMetrics(startDate, endDate),
        this.getProductMetrics(startDate, endDate),
        this.getConversionMetrics(startDate, endDate),
        this.getGeographicMetrics(startDate, endDate)
      ]);

      return {
        timeframe,
        period: { startDate, endDate },
        revenue: revenueMetrics,
        orders: orderMetrics,
        customers: customerMetrics,
        products: productMetrics,
        conversion: conversionMetrics,
        geographic: geographicMetrics,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  // Revenue analytics
  static async getRevenueMetrics(startDate, endDate, originalRevenue = false) {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: 'cancelled' },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: originalRevenue ? { $sum: '$items.itemTotal' } : '$total' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: originalRevenue ? { $avg: '$items.itemTotal' } : '$total' },
          totalShipping: { $sum: '$shipping' },
          totalRefunds: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'refunded'] },
                originalRevenue ? { $sum: '$items.itemTotal' } : '$total',
                0
              ]
            }
          }
        }
      }
    ];

    const [result] = await Order.aggregate(pipeline);
    
    // Get previous period for comparison
    const periodLength = endDate - startDate;
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(startDate);
    
    const [prevResult] = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: prevStartDate, $lte: prevEndDate },
          status: { $ne: 'cancelled' },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const current = result || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0, totalShipping: 0, totalRefunds: 0 };
    const previous = prevResult || { totalRevenue: 0, totalOrders: 0 };

    return {
      totalRevenue: current.totalRevenue,
      totalOrders: current.totalOrders,
      averageOrderValue: current.averageOrderValue || 0,
      totalShipping: current.totalShipping,
      totalRefunds: current.totalRefunds,
      revenueGrowth: previous.totalRevenue > 0 
        ? ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100 
        : 0,
      orderGrowth: previous.totalOrders > 0 
        ? ((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 100 
        : 0
    };
  }

  // Order analytics
  static async getOrderMetrics(startDate, endDate) {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$total' }
        }
      }
    ];

    const statusResults = await Order.aggregate(pipeline);
    
    // Get fulfillment times
    const fulfillmentPipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'delivered',
          'shippingInfo.actualDelivery': { $exists: true }
        }
      },
      {
        $project: {
          fulfillmentTime: {
            $divide: [
              { $subtract: ['$shippingInfo.actualDelivery', '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          averageFulfillmentTime: { $avg: '$fulfillmentTime' },
          minFulfillmentTime: { $min: '$fulfillmentTime' },
          maxFulfillmentTime: { $max: '$fulfillmentTime' }
        }
      }
    ];

    const [fulfillmentResult] = await Order.aggregate(fulfillmentPipeline);

    const statusCounts = {};
    let totalOrders = 0;
    statusResults.forEach(result => {
      statusCounts[result._id] = result.count;
      totalOrders += result.count;
    });

    return {
      totalOrders,
      statusDistribution: statusCounts,
      fulfillmentMetrics: fulfillmentResult || {
        averageFulfillmentTime: 0,
        minFulfillmentTime: 0,
        maxFulfillmentTime: 0
      }
    };
  }

  // Customer analytics
  static async getCustomerMetrics(startDate, endDate) {
    // New customers in period
    const newCustomers = await User.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Returning customers (customers who made orders in this period but registered before)
    const returningCustomersPipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $match: {
          'userInfo.createdAt': { $lt: startDate }
        }
      },
      {
        $group: {
          _id: '$user'
        }
      },
      {
        $count: 'returningCustomers'
      }
    ];

    const [returningResult] = await Order.aggregate(returningCustomersPipeline);
    const returningCustomers = returningResult?.returningCustomers || 0;

    // Customer lifetime value calculation
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
        $project: {
          totalSpent: 1,
          orderCount: 1,
          customerLifespan: {
            $divide: [
              { $subtract: ['$lastOrder', '$firstOrder'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          averageLifetimeValue: { $avg: '$totalSpent' },
          averageOrdersPerCustomer: { $avg: '$orderCount' },
          averageCustomerLifespan: { $avg: '$customerLifespan' }
        }
      }
    ];

    const [clvResult] = await Order.aggregate(clvPipeline);

    return {
      newCustomers,
      returningCustomers,
      totalActiveCustomers: newCustomers + returningCustomers,
      customerLifetimeValue: clvResult?.averageLifetimeValue || 0,
      averageOrdersPerCustomer: clvResult?.averageOrdersPerCustomer || 0,
      averageCustomerLifespan: clvResult?.averageCustomerLifespan || 0
    };
  }

  // Product analytics
  static async getProductMetrics(startDate, endDate) {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
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
          orderCount: { $sum: 1 }
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
        $sort: { totalQuantity: -1 }
      },
      {
        $limit: 10
      }
    ];

    const topProducts = await Order.aggregate(pipeline);

    // Get total products sold
    const totalProductsSold = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$items.quantity' }
        }
      }
    ]);

    return {
      totalProductsSold: totalProductsSold[0]?.totalQuantity || 0,
      topSellingProducts: topProducts.map(product => ({
        productId: product._id,
        name: product.productInfo.name,
        quantitySold: product.totalQuantity,
        revenue: product.totalRevenue,
        orderCount: product.orderCount
      }))
    };
  }

  // Conversion metrics
  static async getConversionMetrics(startDate, endDate) {
    // This would typically require session tracking
    // For now, we'll calculate based on available data
    
    const totalUsers = await User.countDocuments({
      createdAt: { $lte: endDate }
    });

    const usersWithOrders = await Order.distinct('user', {
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const conversionRate = totalUsers > 0 ? (usersWithOrders.length / totalUsers) * 100 : 0;

    return {
      totalUsers,
      convertedUsers: usersWithOrders.length,
      conversionRate
    };
  }

  // Geographic analytics
  static async getGeographicMetrics(startDate, endDate) {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            country: '$shippingAddress.country',
            state: '$shippingAddress.state'
          },
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: 10
      }
    ];

    const geographicData = await Order.aggregate(pipeline);

    return {
      topRegions: geographicData.map(region => ({
        country: region._id.country,
        state: region._id.state,
        orderCount: region.orderCount,
        totalRevenue: region.totalRevenue,
        averageOrderValue: region.averageOrderValue
      }))
    };
  }

  // Update customer analytics
  static async updateCustomerAnalytics(userId) {
    try {
      const customerOrders = await Order.find({
        user: userId,
        status: { $ne: 'cancelled' }
      }).sort({ createdAt: 1 });

      if (customerOrders.length === 0) return;

      const totalSpent = customerOrders.reduce((sum, order) => sum + order.total, 0);
      const averageOrderValue = totalSpent / customerOrders.length;
      const firstOrderDate = customerOrders[0].createdAt;
      const lastOrderDate = customerOrders[customerOrders.length - 1].createdAt;
      const daysSinceLastOrder = Math.floor((new Date() - lastOrderDate) / (1000 * 60 * 60 * 24));
      
      // Calculate order frequency (orders per month)
      const customerLifespanMonths = Math.max(1, (lastOrderDate - firstOrderDate) / (1000 * 60 * 60 * 24 * 30));
      const orderFrequency = customerOrders.length / customerLifespanMonths;

      // Determine customer segments
      const segments = [];
      if (customerOrders.length === 1) segments.push('new');
      if (customerOrders.length >= 5) segments.push('frequent_buyer');
      if (totalSpent >= 1000) segments.push('high_value');
      if (totalSpent >= 2000) segments.push('vip');
      if (daysSinceLastOrder > 90) segments.push('at_risk');
      if (daysSinceLastOrder > 180) segments.push('churned');

      await CustomerAnalytics.findOneAndUpdate(
        { userId },
        {
          metrics: {
            totalOrders: customerOrders.length,
            totalSpent,
            averageOrderValue,
            lifetimeValue: totalSpent, // Simplified CLV calculation
            firstOrderDate,
            lastOrderDate,
            daysSinceLastOrder,
            orderFrequency
          },
          segments,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Error updating customer analytics:', error);
      throw error;
    }
  }
}

module.exports = AnalyticsService;
