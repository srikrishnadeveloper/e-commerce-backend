const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const mongoose = require('mongoose');

// @desc    Get all reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'recent', rating } = req.query;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const filter = { product: productId, status: 'approved' };
    if (rating) filter.rating = parseInt(rating);

    let sortOptions = {};
    switch (sort) {
      case 'helpful':
        sortOptions = { 'helpful.count': -1 };
        break;
      case 'highest':
        sortOptions = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortOptions = { rating: 1, createdAt: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find(filter)
      .populate('user', 'name')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalReviews = await Review.countDocuments(filter);

    // Calculate rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), status: 'approved' } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingDistribution.forEach(r => {
      distribution[r._id] = r.count;
    });

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalReviews / parseInt(limit)),
          totalReviews,
          hasNext: parseInt(page) * parseInt(limit) < totalReviews
        },
        ratingDistribution: distribution
      }
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment, orderId, images } = req.body;

    if (!productId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, rating, and comment are required'
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user.id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Check if it's a verified purchase
    let isVerifiedPurchase = false;
    let verifiedOrderId = null;

    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        user: req.user.id,
        status: 'delivered',
        'items.product': productId
      });
      if (order) {
        isVerifiedPurchase = true;
        verifiedOrderId = order._id;
      }
    } else {
      // Check if user has any delivered order with this product
      const order = await Order.findOne({
        user: req.user.id,
        status: 'delivered',
        'items.product': productId
      });
      if (order) {
        isVerifiedPurchase = true;
        verifiedOrderId = order._id;
      }
    }

    const review = await Review.create({
      product: productId,
      user: req.user.id,
      rating,
      title,
      comment,
      images: images || [],
      isVerifiedPurchase,
      orderId: verifiedOrderId
    });

    await review.populate('user', 'name');

    res.status(201).json({
      success: true,
      data: review,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    console.error('Create review error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment, images } = req.body;

    const review = await Review.findOne({ _id: id, user: req.user.id });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or not authorized'
      });
    }

    if (rating) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (comment) review.comment = comment;
    if (images) review.images = images;

    await review.save();
    await review.populate('user', 'name');

    res.status(200).json({
      success: true,
      data: review,
      message: 'Review updated successfully'
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findOneAndDelete({ _id: id, user: req.user.id });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or not authorized'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
const markHelpful = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user already marked as helpful
    if (review.helpful.users.includes(req.user.id)) {
      // Remove helpful
      review.helpful.users = review.helpful.users.filter(
        userId => userId.toString() !== req.user.id.toString()
      );
      review.helpful.count = Math.max(0, review.helpful.count - 1);
    } else {
      // Add helpful
      review.helpful.users.push(req.user.id);
      review.helpful.count += 1;
    }

    await review.save();

    res.status(200).json({
      success: true,
      data: {
        helpfulCount: review.helpful.count,
        isHelpful: review.helpful.users.includes(req.user.id)
      }
    });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Report a review
// @route   POST /api/reviews/:id/report
// @access  Private
const reportReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.reported = {
      isReported: true,
      reason: reason || 'Inappropriate content',
      reportedBy: req.user.id,
      reportedAt: new Date()
    };

    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review reported successfully'
    });
  } catch (error) {
    console.error('Report review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get user's reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.id })
      .populate('product', 'name images price')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Check if user can review a product
// @route   GET /api/reviews/can-review/:productId
// @access  Private
const canReviewProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if user already reviewed
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user.id
    });

    if (existingReview) {
      return res.status(200).json({
        success: true,
        data: {
          canReview: false,
          reason: 'already_reviewed',
          existingReview
        }
      });
    }

    // Check if user has purchased and received the product
    const deliveredOrder = await Order.findOne({
      user: req.user.id,
      status: 'delivered',
      'items.product': productId
    });

    res.status(200).json({
      success: true,
      data: {
        canReview: true,
        isVerifiedPurchase: !!deliveredOrder,
        orderId: deliveredOrder?._id
      }
    });
  } catch (error) {
    console.error('Can review product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  reportReview,
  getMyReviews,
  canReviewProduct
};
