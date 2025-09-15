const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');

// Helper to create ObjectId from JS Date (uses timestamp inside _id)
const objectIdFromDate = (date) => {
  const secondsHex = Math.floor(date.getTime() / 1000).toString(16).padStart(8, '0');
  return new mongoose.Types.ObjectId(secondsHex + '0000000000000000');
};

// GET /api/users/stats/overview
const getStatsOverview = async (req, res) => {
  try {
    const now = new Date();
    const days14Ago = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oidFrom = objectIdFromDate(days14Ago);

    const [totals, signupTrend, emailDomainStats, wishlistAgg, cartAgg, avgWishlist, avgCart] = await Promise.all([
      // Totals
      (async () => {
        const [users, withWishlist, withCart] = await Promise.all([
          User.countDocuments({}),
          User.countDocuments({ 'wishlist.0': { $exists: true } }),
          User.countDocuments({ 'cart.0': { $exists: true } }),
        ]);
        return { users, withWishlist, withCart };
      })(),

      // Signups by day for last 14 days (using _id timestamp)
      User.aggregate([
        { $match: { _id: { $gte: oidFrom } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$_id' } } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),

      // Top email domains
      User.aggregate([
        { $project: { domain: { $toLower: { $arrayElemAt: [ { $split: ['$email', '@'] }, 1 ] } } } },
        { $group: { _id: '$domain', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      // Top wishlist products
      User.aggregate([
        { $unwind: '$wishlist' },
        { $group: { _id: '$wishlist', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, productId: '$_id', name: '$product.name', count: 1 } }
      ]),

      // Top cart products (by quantity)
      User.aggregate([
        { $unwind: '$cart' },
        { $group: { _id: '$cart.product', qty: { $sum: { $ifNull: ['$cart.quantity', 1] } }, users: { $sum: 1 } } },
        { $sort: { qty: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, productId: '$_id', name: '$product.name', qty: 1, users: 1 } }
      ]),

      // Average wishlist size per user
      User.aggregate([
        { $project: { size: { $size: { $ifNull: ['$wishlist', []] } } } },
        { $group: { _id: null, avgSize: { $avg: '$size' } } }
      ]),

      // Average cart items (sum of quantities) per user
      User.aggregate([
        { $project: { qty: { $sum: { $map: { input: { $ifNull: ['$cart', []] }, as: 'c', in: { $ifNull: ['$$c.quantity', 1] } } } } } },
        { $group: { _id: null, avgQty: { $avg: '$qty' } } }
      ]),
    ]);

    // Build last 14 days array with 0-fill
    const seriesMap = new Map(signupTrend.map(d => [d._id, d.count]));
    const last14 = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0,10);
      last14.push({ date: key, count: seriesMap.get(key) || 0 });
    }

    res.json({
      success: true,
      data: {
        totals,
        signups: { last14Days: last14 },
        emailDomains: emailDomainStats.map(d => ({ domain: d._id || 'unknown', count: d.count })),
        wishlist: {
          topProducts: wishlistAgg,
          averageItems: (avgWishlist[0]?.avgSize || 0)
        },
        cart: {
          topProducts: cartAgg,
          averageItems: (avgCart[0]?.avgQty || 0)
        }
      }
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = { getStatsOverview };
