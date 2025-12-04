const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const mongoose = require('mongoose');

// @desc    Validate and apply coupon
// @route   POST /api/coupons/apply
// @access  Private
const applyCoupon = async (req, res) => {
  try {
    const { code, cartTotal, cartItems } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    if (!cartTotal || cartTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart total is required'
      });
    }

    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    // Check validity
    const now = new Date();
    if (now < coupon.validFrom) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is not yet active'
      });
    }

    if (now > coupon.validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Coupon has expired'
      });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'Coupon usage limit reached'
      });
    }

    // Check user usage
    const userUsageCheck = coupon.canUserUse(req.user.id);
    if (!userUsageCheck.canUse) {
      return res.status(400).json({
        success: false,
        message: userUsageCheck.reason
      });
    }

    // Check first purchase only
    if (coupon.isFirstPurchaseOnly) {
      const existingOrder = await Order.findOne({ user: req.user.id });
      if (existingOrder) {
        return res.status(400).json({
          success: false,
          message: 'This coupon is valid for first purchase only'
        });
      }
    }

    // Calculate discount
    const discountResult = coupon.calculateDiscount(cartTotal, cartItems);

    if (discountResult.error) {
      return res.status(400).json({
        success: false,
        message: discountResult.error
      });
    }

    res.status(200).json({
      success: true,
      data: {
        code: coupon.code,
        description: coupon.description,
        discount: discountResult.discount,
        discountType: discountResult.discountType,
        discountValue: discountResult.discountValue,
        freeShipping: discountResult.freeShipping,
        newTotal: Math.max(0, cartTotal - discountResult.discount)
      }
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Remove coupon
// @route   POST /api/coupons/remove
// @access  Private
const removeCoupon = async (req, res) => {
  try {
    // Just return success - frontend handles removing from state
    res.status(200).json({
      success: true,
      message: 'Coupon removed successfully'
    });
  } catch (error) {
    console.error('Remove coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get all active coupons (public preview)
// @route   GET /api/coupons/active
// @access  Public
const getActiveCoupons = async (req, res) => {
  try {
    const now = new Date();
    
    const coupons = await Coupon.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $or: [
        { usageLimit: null },
        { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
      ]
    })
    .select('code description discountType discountValue minimumPurchase maximumDiscount validUntil freeShipping')
    .sort({ discountValue: -1 })
    .limit(10);

    res.status(200).json({
      success: true,
      data: coupons
    });
  } catch (error) {
    console.error('Get active coupons error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// ============ ADMIN ROUTES ============

// @desc    Create coupon
// @route   POST /api/coupons
// @access  Admin
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minimumPurchase,
      maximumDiscount,
      validFrom,
      validUntil,
      usageLimit,
      usageLimitPerUser,
      applicableProducts,
      applicableCategories,
      excludedProducts,
      isFirstPurchaseOnly,
      freeShipping
    } = req.body;

    // Validate required fields
    if (!code || !discountType || discountValue === undefined || !validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Code, discount type, discount value, and expiry date are required'
      });
    }

    // Check if code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minimumPurchase: minimumPurchase || 0,
      maximumDiscount,
      validFrom: validFrom || new Date(),
      validUntil,
      usageLimit,
      usageLimitPerUser: usageLimitPerUser || 1,
      applicableProducts,
      applicableCategories,
      excludedProducts,
      isFirstPurchaseOnly: isFirstPurchaseOnly || false,
      freeShipping: freeShipping || false
    });

    res.status(201).json({
      success: true,
      data: coupon,
      message: 'Coupon created successfully'
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Admin
const getAllCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const filter = {};
    const now = new Date();

    if (status === 'active') {
      filter.isActive = true;
      filter.validUntil = { $gte: now };
    } else if (status === 'expired') {
      filter.validUntil = { $lt: now };
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const coupons = await Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCoupons = await Coupon.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        coupons,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCoupons / parseInt(limit)),
          totalCoupons
        }
      }
    });
  } catch (error) {
    console.error('Get all coupons error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get single coupon
// @route   GET /api/coupons/:id
// @access  Admin
const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon ID'
      });
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      data: coupon
    });
  } catch (error) {
    console.error('Get coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Admin
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon ID'
      });
    }

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      { ...req.body, code: req.body.code?.toUpperCase() },
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      data: coupon,
      message: 'Coupon updated successfully'
    });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Admin
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon ID'
      });
    }

    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Toggle coupon status
// @route   PATCH /api/coupons/:id/toggle
// @access  Admin
const toggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      data: coupon,
      message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Toggle coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Record coupon usage (called after order creation)
// @route   POST /api/coupons/record-usage
// @access  Private (internal)
const recordCouponUsage = async (couponCode, userId, orderId, discountAmount) => {
  try {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon) return;

    coupon.usageCount += 1;
    coupon.usedBy.push({
      user: userId,
      usedAt: new Date(),
      orderId,
      discountAmount
    });

    await coupon.save();
  } catch (error) {
    console.error('Record coupon usage error:', error);
  }
};

module.exports = {
  applyCoupon,
  removeCoupon,
  getActiveCoupons,
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  recordCouponUsage
};
