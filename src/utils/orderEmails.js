const { sendEmail } = require('./email');

// Order confirmation email
const sendOrderConfirmationEmail = async (user, order) => {
  const subject = `Order Confirmation - Order #${order._id.toString().slice(-8)}`;

  // Calculate estimated delivery date (5-7 business days)
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 300;">E-Commerce Store</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Order Confirmation</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 30px 20px;">
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px; font-weight: 400;">Thank you for your order!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            Hi ${user.name},<br>
            We've received your order and are processing it now. You'll receive a shipping confirmation email with tracking information once your order is on its way.
          </p>

          <!-- Order Summary Box -->
          <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px; font-weight: 500;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Order Number:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500; text-align: right;">#${order._id.toString().slice(-8)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Order Date:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500; text-align: right;">${new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Order Total:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 600; font-size: 16px; text-align: right;">$${order.total.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Status:</td>
                <td style="padding: 8px 0; text-align: right;">
                  <span style="background: #28a745; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; text-transform: uppercase;">
                    ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Estimated Delivery:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500; text-align: right;">${estimatedDelivery.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
            </table>
          </div>

          <!-- Items Ordered -->
          <h3 style="color: #333; margin: 30px 0 20px 0; font-size: 18px; font-weight: 500;">Items Ordered</h3>
          <div style="border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden;">
            ${order.items.map((item, index) => `
              <div style="padding: 20px; ${index < order.items.length - 1 ? 'border-bottom: 1px solid #e9ecef;' : ''} background: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                <div style="display: flex; align-items: center;">
                  <div style="flex: 1;">
                    <h4 style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: 500;">${item.name}</h4>
                    <p style="margin: 0; color: #666; font-size: 14px;">
                      Quantity: ${item.quantity} × $${item.price.toFixed(2)}
                    </p>
                  </div>
                  <div style="text-align: right;">
                    <p style="margin: 0; color: #333; font-weight: 600; font-size: 16px;">$${item.itemTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Order Total Breakdown -->
          <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Subtotal:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500; text-align: right;">$${order.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Shipping:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500; text-align: right;">
                  ${order.shipping === 0 ? '<span style="color: #28a745;">FREE</span>' : '$' + order.shipping.toFixed(2)}
                </td>
              </tr>
              <tr style="border-top: 2px solid #333;">
                <td style="padding: 15px 0 8px 0; color: #333; font-size: 16px; font-weight: 600;">Total:</td>
                <td style="padding: 15px 0 8px 0; color: #333; font-weight: 700; font-size: 18px; text-align: right;">$${order.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${order.shippingAddress ? `
          <!-- Shipping Address -->
          <div style="margin: 30px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px; font-weight: 500;">Shipping Address</h3>
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px;">
              <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.6;">
                <strong>${order.shippingAddress.fullName}</strong><br>
                ${order.shippingAddress.addressLine1}<br>
                ${order.shippingAddress.addressLine2 ? order.shippingAddress.addressLine2 + '<br>' : ''}
                ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}<br>
                ${order.shippingAddress.country}<br>
                <strong>Phone:</strong> ${order.shippingAddress.phone}
              </p>
            </div>
          </div>
          ` : ''}

          <!-- Next Steps -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
            <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 500;">What's Next?</h3>
            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; opacity: 0.9;">
              We're preparing your order for shipment. You'll receive an email with tracking information once your order is on its way.
            </p>
            <div style="margin: 20px 0;">
              <a href="#" style="background: rgba(255,255,255,0.2); color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: 500; display: inline-block; margin: 0 10px;">
                Track Your Order
              </a>
              <a href="#" style="background: rgba(255,255,255,0.2); color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: 500; display: inline-block; margin: 0 10px;">
                Contact Support
              </a>
            </div>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
            Thank you for choosing E-Commerce Store! If you have any questions about your order, please don't hesitate to contact our customer support team.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="margin: 0; color: #666; font-size: 12px;">
            © 2024 E-Commerce Store. All rights reserved.<br>
            This email was sent to ${user.email}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return await sendEmail({
    email: user.email,
    subject,
    html,
    message: `Thank you for your order! Order #${order._id.toString().slice(-8)} has been confirmed.`
  });
};

// Order status update email
const sendOrderStatusUpdateEmail = async (user, order, oldStatus, newStatus) => {
  const subject = `Order Update - Order #${order._id.toString().slice(-8)}`;
  
  let statusMessage = '';
  let nextSteps = '';
  
  switch (newStatus) {
    case 'processing':
      statusMessage = 'Your order is now being processed and prepared for shipment.';
      nextSteps = 'We\'ll notify you when your order ships.';
      break;
    case 'shipped':
      statusMessage = 'Great news! Your order has been shipped.';
      nextSteps = order.shippingInfo?.trackingNumber 
        ? `Track your package: ${order.shippingInfo.trackingNumber}` 
        : 'You\'ll receive tracking information soon.';
      break;
    case 'delivered':
      statusMessage = 'Your order has been delivered!';
      nextSteps = 'We hope you love your purchase. Please consider leaving a review.';
      break;
    case 'cancelled':
      statusMessage = 'Your order has been cancelled.';
      nextSteps = 'If you have any questions, please contact our support team.';
      break;
    default:
      statusMessage = `Your order status has been updated to ${newStatus}.`;
  }
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Order Status Update</h2>
      <p>Hi ${user.name},</p>
      <p>${statusMessage}</p>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Order #${order._id.toString().slice(-8)}</h3>
        <p><strong>Status:</strong> ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</p>
        <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
        ${order.shippingInfo?.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.shippingInfo.trackingNumber}</p>` : ''}
      </div>
      
      <p>${nextSteps}</p>
      <p>Thank you for shopping with us!</p>
    </div>
  `;
  
  return await sendEmail({
    email: user.email,
    subject,
    html,
    message: `Order #${order._id.toString().slice(-8)} status updated to ${newStatus}.`
  });
};

// Shipping notification email
const sendShippingNotificationEmail = async (user, order) => {
  const subject = `Your Order Has Shipped - Order #${order._id.toString().slice(-8)}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Your Order Has Shipped!</h2>
      <p>Hi ${user.name},</p>
      <p>Great news! Your order is on its way to you.</p>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Order #${order._id.toString().slice(-8)}</h3>
        <p><strong>Shipped Date:</strong> ${new Date(order.shippingInfo.shippedAt).toLocaleDateString()}</p>
        ${order.shippingInfo.carrier ? `<p><strong>Carrier:</strong> ${order.shippingInfo.carrier}</p>` : ''}
        ${order.shippingInfo.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.shippingInfo.trackingNumber}</p>` : ''}
        ${order.shippingInfo.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${new Date(order.shippingInfo.estimatedDelivery).toLocaleDateString()}</p>` : ''}
      </div>
      
      ${order.shippingInfo.trackingUrl ? `<p><a href="${order.shippingInfo.trackingUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Track Your Package</a></p>` : ''}
      
      <p>Your package will be delivered to:</p>
      <div style="background: #f0f0f0; padding: 15px; border-radius: 5px;">
        <p>${order.shippingAddress.fullName}<br>
        ${order.shippingAddress.addressLine1}<br>
        ${order.shippingAddress.addressLine2 ? order.shippingAddress.addressLine2 + '<br>' : ''}
        ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}</p>
      </div>
      
      <p>Thank you for your business!</p>
    </div>
  `;
  
  return await sendEmail({
    email: user.email,
    subject,
    html,
    message: `Your order #${order._id.toString().slice(-8)} has shipped!`
  });
};

// Order cancellation email
const sendOrderCancellationEmail = async (user, order, reason) => {
  const subject = `Order Cancelled - Order #${order._id.toString().slice(-8)}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Order Cancellation</h2>
      <p>Hi ${user.name},</p>
      <p>Your order has been cancelled as requested.</p>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Order #${order._id.toString().slice(-8)}</h3>
        <p><strong>Cancelled Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>
      
      <p>If you paid for this order, a refund will be processed within 3-5 business days.</p>
      <p>If you have any questions, please contact our support team.</p>
      <p>Thank you for your understanding.</p>
    </div>
  `;
  
  return await sendEmail({
    email: user.email,
    subject,
    html,
    message: `Order #${order._id.toString().slice(-8)} has been cancelled.`
  });
};

// Delivery confirmation email
const sendDeliveryConfirmationEmail = async (user, order) => {
  const subject = `Order Delivered - Order #${order._id.toString().slice(-8)}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Order Delivered!</h2>
      <p>Hi ${user.name},</p>
      <p>Great news! Your order has been successfully delivered.</p>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Order #${order._id.toString().slice(-8)}</h3>
        <p><strong>Delivered Date:</strong> ${new Date(order.shippingInfo.actualDelivery || new Date()).toLocaleDateString()}</p>
        <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
      </div>
      
      <p>We hope you love your purchase! Please consider leaving a review to help other customers.</p>
      <p><a href="#" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Leave a Review</a></p>
      
      <p>Thank you for choosing us!</p>
    </div>
  `;
  
  return await sendEmail({
    email: user.email,
    subject,
    html,
    message: `Your order #${order._id.toString().slice(-8)} has been delivered!`
  });
};

module.exports = {
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendShippingNotificationEmail,
  sendOrderCancellationEmail,
  sendDeliveryConfirmationEmail
};
