const Order = require('../models/Order');
const { sendEmail } = require('../utils/email');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const PAYMENT_CURRENCY = process.env.PAYMENT_CURRENCY || 'INR';

// Create Razorpay client when keys are present
const razorpayClient = (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
  : null;

/**
 * Dummy Payment System
 * Simulates payment processing without real payment gateway
 * Replace with Razorpay/Stripe when ready for production
 */

// Simulated payment methods
const PAYMENT_METHODS = {
  CARD: 'card',
  UPI: 'upi',
  NET_BANKING: 'net_banking',
  WALLET: 'wallet',
  COD: 'cod'
};

const toSubUnit = (amount) => {
  // Razorpay expects the smallest currency unit (paise for INR)
  const numericAmount = Number(amount) || 0;
  return Math.max(1, Math.round(numericAmount * 100));
};

const ensureRazorpayConfigured = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const placeholders = ['rzp_test_key', 'razorpay_test_secret'];

  if (!razorpayClient) {
    throw new Error('Razorpay keys are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  if (placeholders.includes(keyId) || placeholders.includes(keySecret)) {
    throw new Error('Razorpay keys are placeholders. Update config.env with your actual test key/secret.');
  }
};

// Generate dummy payment ID
const generatePaymentId = () => {
  return 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Generate dummy transaction ID
const generateTransactionId = () => {
  return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// @desc    Initialize payment for an order
// @route   POST /api/payments/initiate
// @access  Private
const initiatePayment = async (req, res) => {
  try {
    const { orderId, paymentMethod = PAYMENT_METHODS.CARD } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }

    // Generate dummy payment session
    const paymentSession = {
      paymentId: generatePaymentId(),
      orderId: order._id,
      amount: order.total,
      currency: 'INR',
      paymentMethod,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };

    // Store payment info in order
    order.paymentInfo = {
      paymentId: paymentSession.paymentId,
      method: paymentMethod,
      status: 'initiated',
      initiatedAt: new Date()
    };
    await order.save();

    res.status(200).json({
      success: true,
      data: {
        paymentSession,
        // For dummy system, provide test card details
        testDetails: {
          card: {
            number: '4111 1111 1111 1111',
            expiry: '12/25',
            cvv: '123',
            name: 'Test User'
          },
          upi: 'test@upi',
          note: 'This is a dummy payment system. Use any details to simulate payment.'
        }
      }
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Process payment (simulate success/failure)
// @route   POST /api/payments/process
// @access  Private
const processPayment = async (req, res) => {
  try {
    const { orderId, paymentId, paymentDetails } = req.body;

    if (!orderId || !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and Payment ID are required'
      });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user.id }).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate payment success (90% success rate for testing)
    // Use simulateFailure: true in paymentDetails to force failure
    const shouldFail = paymentDetails?.simulateFailure || Math.random() < 0.1;

    if (shouldFail) {
      order.paymentInfo = {
        ...order.paymentInfo,
        status: 'failed',
        failedAt: new Date(),
        failureReason: 'Payment declined by bank'
      };
      await order.save();

      return res.status(400).json({
        success: false,
        message: 'Payment failed. Please try again.',
        data: {
          paymentId,
          status: 'failed',
          reason: 'Payment declined by bank'
        }
      });
    }

    // Payment successful
    const transactionId = generateTransactionId();
    
    order.paymentStatus = 'paid';
    order.status = 'processing'; // Auto-move to processing after payment
    order.paymentInfo = {
      paymentId,
      transactionId,
      method: order.paymentInfo?.method || 'card',
      status: 'completed',
      paidAt: new Date(),
      amount: order.total
    };

    // Add timeline entry
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      action: 'Payment Received',
      details: `Payment of $${order.total.toFixed(2)} received via ${order.paymentInfo.method}`,
      performedAt: new Date(),
      performedBy: 'System'
    });

    await order.save();

    // Send payment confirmation email
    if (order.user?.email) {
      try {
        await sendEmail({
          email: order.user.email,
          subject: `Payment Confirmed - Order #${order._id.toString().slice(-8)}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #28a745;">Payment Successful!</h2>
              <p>Hi ${order.user.name},</p>
              <p>Your payment has been successfully processed.</p>
              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Payment Details</h3>
                <p><strong>Order #:</strong> ${order._id.toString().slice(-8)}</p>
                <p><strong>Transaction ID:</strong> ${transactionId}</p>
                <p><strong>Amount:</strong> $${order.total.toFixed(2)}</p>
                <p><strong>Payment Method:</strong> ${order.paymentInfo.method}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p>Your order is now being processed and will be shipped soon.</p>
              <p>Thank you for your purchase!</p>
            </div>
          `,
          message: `Payment confirmed for Order #${order._id.toString().slice(-8)}`
        });
      } catch (emailError) {
        console.error('Payment confirmation email failed:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment successful',
      data: {
        paymentId,
        transactionId,
        status: 'completed',
        amount: order.total,
        paidAt: order.paymentInfo.paidAt,
        order: {
          _id: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus
        }
      }
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get payment status
// @route   GET /api/payments/:orderId/status
// @access  Private
const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        paymentStatus: order.paymentStatus,
        paymentInfo: order.paymentInfo || null,
        total: order.total
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Process COD order (Cash on Delivery)
// @route   POST /api/payments/cod
// @access  Private
const processCOD = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user.id }).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // COD orders remain unpaid until delivery
    order.paymentInfo = {
      paymentId: generatePaymentId(),
      method: 'cod',
      status: 'pending_cod',
      initiatedAt: new Date()
    };
    order.status = 'processing';

    // Add timeline entry
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      action: 'COD Order Confirmed',
      details: 'Order confirmed for Cash on Delivery',
      performedAt: new Date(),
      performedBy: 'System'
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'COD order confirmed',
      data: {
        orderId: order._id,
        status: order.status,
        paymentMethod: 'cod',
        total: order.total,
        note: 'Please keep exact amount ready at the time of delivery'
      }
    });
  } catch (error) {
    console.error('Process COD error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Create Razorpay order for checkout
// @route   POST /api/payments/razorpay/order
// @access  Private
const createRazorpayOrder = async (req, res) => {
  try {
    ensureRazorpayConfigured();
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Order is already paid' });
    }

    const razorpayOrder = await razorpayClient.orders.create({
      amount: toSubUnit(order.total),
      currency: PAYMENT_CURRENCY,
      receipt: `order_${order._id}`,
      notes: {
        orderId: order._id.toString(),
        userId: req.user.id.toString()
      }
    });

    order.paymentInfo = {
      paymentId: razorpayOrder.id,
      method: 'razorpay',
      status: 'initiated',
      amount: order.total,
      initiatedAt: new Date()
    };
    await order.save();

    return res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    const rzpDescription = error?.error?.description || error?.message;
    console.error('Create Razorpay order error:', rzpDescription || error);
    const message = error.message === 'Razorpay keys are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
      ? 'Payment gateway is not configured'
      : rzpDescription || 'Failed to create Razorpay order';
    return res.status(500).json({ success: false, message });
  }
};

// @desc    Verify Razorpay payment signature and mark order paid
// @route   POST /api/payments/razorpay/verify
// @access  Private
const verifyRazorpayPayment = async (req, res) => {
  try {
    ensureRazorpayConfigured();
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'orderId, razorpayPaymentId, razorpayOrderId, and razorpaySignature are required'
      });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user.id }).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Validate signature
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      order.paymentInfo = {
        ...(order.paymentInfo || {}),
        paymentId: razorpayOrderId,
        method: 'razorpay',
        status: 'failed',
        failedAt: new Date(),
        failureReason: 'Signature mismatch'
      };
      await order.save();
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Mark order as paid
    order.paymentStatus = 'paid';
    order.status = 'processing';
    order.paymentInfo = {
      paymentId: razorpayPaymentId,
      transactionId: razorpayOrderId,
      method: 'razorpay',
      status: 'completed',
      paidAt: new Date(),
      amount: order.total
    };

    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      action: 'Payment Received',
      details: `Payment of ${order.total.toFixed(2)} ${PAYMENT_CURRENCY} received via Razorpay`,
      performedAt: new Date(),
      performedBy: 'System'
    });

    await order.save();

    // Send confirmation email (best-effort)
    if (order.user?.email) {
      try {
        await sendEmail({
          email: order.user.email,
          subject: `Payment Confirmed - Order #${order._id.toString().slice(-8)}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #28a745;">Payment Successful!</h2>
              <p>Hi ${order.user.name || 'there'},</p>
              <p>Your payment has been successfully processed.</p>
              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Payment Details</h3>
                <p><strong>Order #:</strong> ${order._id.toString().slice(-8)}</p>
                <p><strong>Transaction ID:</strong> ${razorpayPaymentId}</p>
                <p><strong>Amount:</strong> ${order.total.toFixed(2)} ${PAYMENT_CURRENCY}</p>
                <p><strong>Payment Method:</strong> Razorpay</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p>Your order is now being processed and will be shipped soon.</p>
              <p>Thank you for your purchase!</p>
            </div>
          `,
          message: `Payment confirmed for Order #${order._id.toString().slice(-8)}`
        });
      } catch (emailError) {
        console.error('Payment confirmation email failed:', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: razorpayPaymentId,
        transactionId: razorpayOrderId,
        status: 'completed',
        amount: order.total,
        paidAt: order.paymentInfo.paidAt,
        order: {
          _id: order._id,
          status: order.status,
          paymentStatus: order.paymentStatus
        }
      }
    });
  } catch (error) {
    const rzpDescription = error?.error?.description || error?.message;
    console.error('Verify Razorpay payment error:', rzpDescription || error);
    const message = error.message === 'Razorpay keys are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
      ? 'Payment gateway is not configured'
      : rzpDescription || 'Failed to verify payment';
    return res.status(500).json({ success: false, message });
  }
};

// @desc    Get available payment methods
// @route   GET /api/payments/methods
// @access  Public
const getPaymentMethods = async (req, res) => {
  try {
    const methods = [
      {
        id: 'razorpay',
        name: 'Razorpay',
        icon: 'bolt',
        description: 'Cards, UPI, NetBanking, Wallets (test mode)',
        enabled: true
      },
      {
        id: 'card',
        name: 'Credit/Debit Card',
        icon: 'credit-card',
        description: 'Visa, Mastercard, American Express',
        enabled: true
      },
      {
        id: 'upi',
        name: 'UPI',
        icon: 'smartphone',
        description: 'Google Pay, PhonePe, Paytm',
        enabled: true
      },
      {
        id: 'net_banking',
        name: 'Net Banking',
        icon: 'building',
        description: 'All major banks supported',
        enabled: true
      },
      {
        id: 'wallet',
        name: 'Wallet',
        icon: 'wallet',
        description: 'Paytm, Amazon Pay, Mobikwik',
        enabled: true
      },
      {
        id: 'cod',
        name: 'Cash on Delivery',
        icon: 'banknotes',
        description: 'Pay when you receive',
        enabled: true
      }
    ];

    res.status(200).json({
      success: true,
      data: methods
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = {
  initiatePayment,
  processPayment,
  getPaymentStatus,
  processCOD,
  getPaymentMethods,
  createRazorpayOrder,
  verifyRazorpayPayment
};
