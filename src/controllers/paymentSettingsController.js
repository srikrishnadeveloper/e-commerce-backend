const PaymentSettings = require('../models/PaymentSettings');
const Order = require('../models/Order');
const { sendEmail } = require('../utils/email');

// @desc    Get payment settings (public - for frontend to know which mode)
// @route   GET /api/payment-settings/mode
// @access  Public
const getPaymentMode = async (req, res) => {
  try {
    const settings = await PaymentSettings.getSettings();
    
    res.status(200).json({
      success: true,
      data: {
        paymentMode: settings.paymentMode,
        upiSettings: settings.paymentMode === 'manual_upi' ? {
          qrCodeImage: settings.upiSettings.qrCodeImage,
          upiId: settings.upiSettings.upiId,
          merchantName: settings.upiSettings.merchantName,
          instructions: settings.upiSettings.instructions
        } : null
      }
    });
  } catch (error) {
    console.error('Get payment mode error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get full payment settings (admin only)
// @route   GET /api/payment-settings
// @access  Private/Admin
const getPaymentSettings = async (req, res) => {
  try {
    const settings = await PaymentSettings.getSettings();
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Update payment settings
// @route   PUT /api/payment-settings
// @access  Private/Admin
const updatePaymentSettings = async (req, res) => {
  try {
    const { paymentMode, upiSettings } = req.body;
    
    let settings = await PaymentSettings.getSettings();
    
    if (paymentMode) {
      settings.paymentMode = paymentMode;
    }
    
    if (upiSettings) {
      settings.upiSettings = {
        ...settings.upiSettings,
        ...upiSettings
      };
    }
    
    // Use req.admin (from protectAdmin middleware) instead of req.user
    settings.updatedBy = req.admin?._id || req.admin?.id || null;
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: 'Payment settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update payment settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Upload QR code image
// @route   POST /api/payment-settings/upload-qr
// @access  Private/Admin
const uploadQRCode = async (req, res) => {
  try {
    const { qrCodeImage } = req.body; // Base64 or URL
    
    if (!qrCodeImage) {
      return res.status(400).json({
        success: false,
        message: 'QR code image is required'
      });
    }
    
    let settings = await PaymentSettings.getSettings();
    settings.upiSettings.qrCodeImage = qrCodeImage;
    // Use req.admin (from protectAdmin middleware) instead of req.user
    settings.updatedBy = req.admin?._id || req.admin?.id || null;
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: 'QR code uploaded successfully',
      data: {
        qrCodeImage: settings.upiSettings.qrCodeImage
      }
    });
  } catch (error) {
    console.error('Upload QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Submit UPI transaction ID (user submits after payment)
// @route   POST /api/payment-settings/submit-upi
// @access  Private
const submitUPITransaction = async (req, res) => {
  try {
    const { orderId, upiTransactionId } = req.body;
    
    if (!orderId || !upiTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and UPI Transaction ID are required'
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
    
    // Update order with UPI transaction details
    order.paymentInfo = {
      ...order.paymentInfo,
      method: 'manual_upi',
      status: 'pending_verification',
      upiTransactionId: upiTransactionId.trim(),
      upiSubmittedAt: new Date(),
      amount: order.total
    };
    
    // Add to timeline
    order.timeline.push({
      action: 'UPI Payment Submitted',
      details: `Transaction ID: ${upiTransactionId}`,
      performedAt: new Date(),
      performedBy: 'Customer'
    });
    
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'UPI transaction ID submitted successfully. Your payment is pending verification.',
      data: {
        orderId: order._id,
        upiTransactionId,
        status: 'pending_verification'
      }
    });
  } catch (error) {
    console.error('Submit UPI transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get orders pending UPI verification (admin)
// @route   GET /api/payment-settings/pending-verifications
// @access  Private/Admin
const getPendingVerifications = async (req, res) => {
  try {
    const orders = await Order.find({
      'paymentInfo.method': 'manual_upi',
      'paymentInfo.status': 'pending_verification'
    })
    .populate('user', 'name email')
    .sort({ 'paymentInfo.upiSubmittedAt': -1 });
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Verify UPI payment (admin action)
// @route   POST /api/payment-settings/verify-payment
// @access  Private/Admin
const verifyUPIPayment = async (req, res) => {
  try {
    const { orderId, verified, notes } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    const order = await Order.findById(orderId).populate('user', 'name email');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (order.paymentInfo.status !== 'pending_verification') {
      return res.status(400).json({
        success: false,
        message: 'This order is not pending verification'
      });
    }
    
    if (verified) {
      // Mark payment as completed
      order.paymentStatus = 'paid';
      order.status = 'processing';
      order.paymentInfo.status = 'completed';
      order.paymentInfo.verifiedAt = new Date();
      order.paymentInfo.verifiedBy = req.user.id;
      order.paymentInfo.verificationNotes = notes || 'Payment verified';
      order.paymentInfo.paidAt = new Date();
      
      // Add to timeline
      order.timeline.push({
        action: 'Payment Verified',
        details: `UPI payment verified. Transaction ID: ${order.paymentInfo.upiTransactionId}`,
        performedAt: new Date(),
        performedBy: 'Admin',
        notificationSent: true
      });
      
      await order.save();
      
      // Send confirmation email to customer
      try {
        const orderItems = order.items.map(item => 
          `<tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.itemTotal.toFixed(2)}</td>
          </tr>`
        ).join('');

        await sendEmail({
          to: order.user.email,
          subject: `Order Confirmed - #${order._id.toString().slice(-8).toUpperCase()}`,
          html: `
            <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">✓ Payment Verified!</h1>
                <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Your order has been confirmed</p>
              </div>
              
              <div style="padding: 30px;">
                <p style="font-size: 16px; color: #374151;">Hi ${order.user.name},</p>
                <p style="font-size: 16px; color: #374151;">Great news! Your UPI payment has been verified and your order is now being processed.</p>
                
                <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <h3 style="margin: 0 0 15px 0; color: #111827;">Order Details</h3>
                  <p style="margin: 5px 0; color: #6b7280;"><strong>Order ID:</strong> #${order._id.toString().slice(-8).toUpperCase()}</p>
                  <p style="margin: 5px 0; color: #6b7280;"><strong>Transaction ID:</strong> ${order.paymentInfo.upiTransactionId}</p>
                  <p style="margin: 5px 0; color: #6b7280;"><strong>Payment Method:</strong> UPI</p>
                  <p style="margin: 5px 0; color: #6b7280;"><strong>Amount Paid:</strong> ₹${order.total.toFixed(2)}</p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <thead>
                    <tr style="background: #f3f4f6;">
                      <th style="padding: 12px; text-align: left;">Item</th>
                      <th style="padding: 12px; text-align: center;">Qty</th>
                      <th style="padding: 12px; text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${orderItems}
                  </tbody>
                  <tfoot>
                    <tr style="background: #111827; color: white;">
                      <td colspan="2" style="padding: 12px; font-weight: bold;">Grand Total</td>
                      <td style="padding: 12px; text-align: right; font-weight: bold;">₹${order.total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
                
                <p style="font-size: 14px; color: #6b7280;">We'll send you another email when your order ships.</p>
              </div>
              
              <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Thank you for shopping with us!</p>
              </div>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }
      
      res.status(200).json({
        success: true,
        message: 'Payment verified successfully. Order confirmed and customer notified.',
        data: order
      });
    } else {
      // Mark payment as failed
      order.paymentInfo.status = 'failed';
      order.paymentInfo.failedAt = new Date();
      order.paymentInfo.failureReason = notes || 'Payment verification failed';
      order.paymentInfo.verifiedBy = req.user.id;
      
      // Add to timeline
      order.timeline.push({
        action: 'Payment Rejected',
        details: notes || 'Payment could not be verified',
        performedAt: new Date(),
        performedBy: 'Admin',
        notificationSent: true
      });
      
      await order.save();
      
      // Send rejection email to customer
      try {
        await sendEmail({
          to: order.user.email,
          subject: `Payment Verification Failed - Order #${order._id.toString().slice(-8).toUpperCase()}`,
          html: `
            <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
              <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Payment Verification Failed</h1>
              </div>
              
              <div style="padding: 30px;">
                <p style="font-size: 16px; color: #374151;">Hi ${order.user.name},</p>
                <p style="font-size: 16px; color: #374151;">Unfortunately, we couldn't verify your UPI payment for order #${order._id.toString().slice(-8).toUpperCase()}.</p>
                
                <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
                  <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${notes || 'Transaction ID could not be verified'}</p>
                </div>
                
                <p style="font-size: 16px; color: #374151;">Please try placing your order again with the correct transaction details, or contact our support team for assistance.</p>
              </div>
              
              <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Need help? Contact us at support@techcart.com</p>
              </div>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }
      
      res.status(200).json({
        success: true,
        message: 'Payment rejected. Customer has been notified.',
        data: order
      });
    }
  } catch (error) {
    console.error('Verify UPI payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = {
  getPaymentMode,
  getPaymentSettings,
  updatePaymentSettings,
  uploadQRCode,
  submitUPITransaction,
  getPendingVerifications,
  verifyUPIPayment
};
