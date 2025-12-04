const User = require('../models/User');
const Order = require('../models/Order');
const { sendEmail } = require('../utils/email');

// Email templates
const emailTemplates = {
  promotional: {
    name: 'Promotional',
    description: 'General promotional emails for sales and offers',
    subject: '🎉 Special Offer Just for You!',
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">{{title}}</h1>
        <div style="padding: 20px; background: #f5f5f5; border-radius: 8px;">
          {{content}}
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          Best regards,<br>The E-Commerce Team
        </p>
      </div>
    `
  },
  newsletter: {
    name: 'Newsletter',
    description: 'Regular newsletter updates',
    subject: '📰 Your Weekly Newsletter',
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">{{title}}</h1>
        <div style="padding: 20px;">
          {{content}}
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #888; font-size: 12px;">
          You're receiving this email because you subscribed to our newsletter.
        </p>
      </div>
    `
  },
  announcement: {
    name: 'Announcement',
    description: 'Important announcements and updates',
    subject: '📢 Important Announcement',
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">{{title}}</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
          {{content}}
        </div>
      </div>
    `
  },
  orderUpdate: {
    name: 'Order Update',
    description: 'Order-related notifications',
    subject: '📦 Order Update',
    template: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">{{title}}</h1>
        <div style="padding: 20px; background: #f0fdf4; border-left: 4px solid #22c55e;">
          {{content}}
        </div>
      </div>
    `
  },
  custom: {
    name: 'Custom',
    description: 'Fully custom email content',
    subject: '{{subject}}',
    template: `{{content}}`
  }
};

// Get email templates
exports.getTemplates = async (req, res) => {
  try {
    const templates = Object.entries(emailTemplates).map(([key, value]) => ({
      id: key,
      name: value.name,
      description: value.description,
      defaultSubject: value.subject
    }));

    res.status(200).json({
      status: 'success',
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get recipient groups/segments
exports.getRecipientGroups = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    
    // Get recent active users (made order in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrders = await Order.distinct('user', { createdAt: { $gte: thirtyDaysAgo } });
    
    // Get users with pending orders
    const pendingOrderUsers = await Order.distinct('user', { status: 'pending' });
    
    // Get users who made purchases above $100
    const highValueOrders = await Order.aggregate([
      { $match: { totalAmount: { $gte: 100 } } },
      { $group: { _id: '$user' } }
    ]);
    
    const groups = [
      {
        id: 'all',
        name: 'All Customers',
        description: 'All registered users',
        count: totalUsers
      },
      {
        id: 'recent_active',
        name: 'Recently Active',
        description: 'Customers who ordered in the last 30 days',
        count: recentOrders.length
      },
      {
        id: 'pending_orders',
        name: 'Pending Orders',
        description: 'Customers with pending orders',
        count: pendingOrderUsers.length
      },
      {
        id: 'high_value',
        name: 'High-Value Customers',
        description: 'Customers with orders above $100',
        count: highValueOrders.length
      }
    ];

    res.status(200).json({
      status: 'success',
      data: groups
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Preview email with template
exports.previewEmail = async (req, res) => {
  try {
    const { templateId, title, subject, content } = req.body;
    
    const templateKey = templateId || 'custom';
    const template = emailTemplates[templateKey] || emailTemplates.custom;
    
    let html = template.template.replace(/{{content}}/g, content || 'Email content goes here...');
    html = html
      .replace(/{{title}}/g, title || 'Email Title')
      .replace(/{{subject}}/g, subject || template.subject);

    res.status(200).json({
      status: 'success',
      data: {
        subject: subject || template.subject.replace(/{{title}}/g, title || 'Email'),
        html
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Send bulk emails
exports.sendBulkEmail = async (req, res) => {
  try {
    const { 
      templateId, 
      recipientGroup, 
      customEmails, 
      subject, 
      title, 
      content,
      scheduledAt 
    } = req.body;

    // Validate required fields
    if (!content) {
      return res.status(400).json({
        status: 'error',
        message: 'Email content is required'
      });
    }

    // Get template (default to custom when omitted)
    const templateKey = templateId || 'custom';
    const template = emailTemplates[templateKey] || emailTemplates.custom;
    
    // Build final subject
    const finalSubject = subject || template.subject.replace(/{{title}}/g, title || 'Update');
    
    // Build HTML content
    let html = template.template.replace(/{{content}}/g, content);
    html = html
      .replace(/{{title}}/g, title || '')
      .replace(/{{subject}}/g, finalSubject);

    // Get recipients
    let recipients = [];
    
    if (customEmails && customEmails.length > 0) {
      // Custom email list provided
      recipients = customEmails.filter(email => 
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      );
    } else {
      // Get recipients based on group
      let userQuery = {};
      
      switch (recipientGroup) {
        case 'all':
          // All users
          break;
          
        case 'recent_active': {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const recentUsers = await Order.distinct('user', { createdAt: { $gte: thirtyDaysAgo } });
          userQuery._id = { $in: recentUsers };
          break;
        }
        
        case 'pending_orders': {
          const pendingUsers = await Order.distinct('user', { status: 'pending' });
          userQuery._id = { $in: pendingUsers };
          break;
        }
        
        case 'high_value': {
          const hvOrders = await Order.aggregate([
            { $match: { totalAmount: { $gte: 100 } } },
            { $group: { _id: '$user' } }
          ]);
          userQuery._id = { $in: hvOrders.map(o => o._id) };
          break;
        }
        
        default:
          return res.status(400).json({
            status: 'error',
            message: 'Invalid recipient group'
          });
      }

      const users = await User.find(userQuery).select('email name');
      recipients = users.map(u => ({ email: u.email, name: u.name }));
    }

    if (recipients.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No recipients found for the selected criteria'
      });
    }

    // Track results
    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    // Send emails (with rate limiting to avoid overwhelming SMTP)
    const batchSize = 10;
    const delayBetweenBatches = 1000; // 1 second

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (recipient) => {
        try {
          const recipientEmail = typeof recipient === 'string' ? recipient : recipient.email;
          const recipientName = typeof recipient === 'string' ? '' : recipient.name;
          
          // Personalize HTML if name is available
          let personalizedHtml = html;
          if (recipientName) {
            personalizedHtml = html.replace(/{{name}}/g, recipientName);
          }
          
          const result = await sendEmail({
            email: recipientEmail,
            subject: finalSubject,
            html: personalizedHtml,
            message: content // Plain text fallback
          });
          
          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push({
              email: recipientEmail,
              error: result.error
            });
          }
        } catch (error) {
          results.failed++;
          const email = typeof recipient === 'string' ? recipient : recipient.email;
          results.errors.push({
            email,
            error: error.message
          });
        }
      });
      
      await Promise.all(emailPromises);
      
      // Delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    // Log the email campaign
    console.log(`Bulk email sent: ${results.sent}/${results.total} successful`);

    res.status(200).json({
      status: 'success',
      message: `Email campaign completed`,
      data: {
        total: results.total,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors.slice(0, 10) // Only return first 10 errors
      }
    });
  } catch (error) {
    console.error('Bulk email error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get email campaign history (for future implementation with logging)
exports.getCampaignHistory = async (req, res) => {
  try {
    // This would return logged campaigns if we had a campaign model
    // For now, return empty array
    res.status(200).json({
      status: 'success',
      data: [],
      message: 'Campaign history feature coming soon'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Test email connection
exports.testEmailConnection = async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'Test email address is required'
      });
    }

    const result = await sendEmail({
      email: testEmail,
      subject: '✅ Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #22c55e;">Email Configuration Working!</h1>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
      message: 'Email configuration test - This is a test email to verify your email configuration is working correctly.'
    });

    if (result.success) {
      res.status(200).json({
        status: 'success',
        message: 'Test email sent successfully',
        data: { messageId: result.messageId }
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to send test email',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
