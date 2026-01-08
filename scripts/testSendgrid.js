/**
 * Test SendGrid email sending
 * Run: node scripts/testSendgrid.js
 */

require('dotenv').config({ path: './config.env' });
const sgMail = require('@sendgrid/mail');

// Set API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

console.log('===========================================');
console.log('   SendGrid Email Test');
console.log('===========================================\n');

const testEmail = async () => {
  const testAddress = 'srik27600@gmail.com'; // Test recipient
  
  console.log('Configuration:');
  console.log(`- API Key: ${process.env.SENDGRID_API_KEY ? '✓ Set (' + process.env.SENDGRID_API_KEY.substring(0, 10) + '...)' : '✗ Missing'}`);
  console.log(`- From Email: ${process.env.EMAIL_FROM || 'srikrishnawebdeveloper@gmail.com'}`);
  console.log(`- Test Recipient: ${testAddress}`);
  console.log('');

  const msg = {
    to: testAddress,
    from: {
      email: process.env.EMAIL_FROM || 'srikrishnawebdeveloper@gmail.com',
      name: process.env.EMAIL_FROM_NAME || 'E-Commerce Store'
    },
    subject: '🎉 SendGrid Test - E-Commerce Platform',
    text: 'This is a test email from your E-Commerce platform. SendGrid is working correctly!',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">🎉 SendGrid Test</h1>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #333; margin: 0 0 20px 0;">Email Configuration Successful!</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Congratulations! Your SendGrid email integration is working perfectly.
          </p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">Test Details:</h3>
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Timestamp:</td>
                <td style="padding: 8px 0; color: #333; text-align: right;">${new Date().toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Provider:</td>
                <td style="padding: 8px 0; color: #333; text-align: right;">SendGrid</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Status:</td>
                <td style="padding: 8px 0; color: #22c55e; text-align: right; font-weight: 600;">✓ Delivered</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            All email features are now active:
          </p>
          <ul style="color: #666; font-size: 14px; line-height: 1.8;">
            <li>Order confirmation emails</li>
            <li>Shipping notification emails</li>
            <li>Password reset emails</li>
            <li>OTP verification emails</li>
            <li>Bulk marketing emails</li>
          </ul>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #999;">
          This is an automated test from your E-Commerce platform.
        </div>
      </div>
    `
  };

  try {
    console.log('Sending test email...\n');
    const response = await sgMail.send(msg);
    
    console.log('✅ EMAIL SENT SUCCESSFULLY!\n');
    console.log('Response:');
    console.log(`- Status Code: ${response[0].statusCode}`);
    console.log(`- Message ID: ${response[0].headers['x-message-id']}`);
    console.log('');
    console.log(`Check inbox: ${testAddress}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ EMAIL FAILED!\n');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Details:', JSON.stringify(error.response.body, null, 2));
    }
    process.exit(1);
  }
};

testEmail();
