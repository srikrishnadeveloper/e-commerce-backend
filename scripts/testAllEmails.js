/**
 * Comprehensive SendGrid Email Test Suite
 * Tests all email types in the system
 * Run: node scripts/testAllEmails.js
 */

require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const { sendEmail } = require('../src/utils/email');
const { 
  sendOrderConfirmationEmail,
  sendShippingNotificationEmail,
  sendDeliveryConfirmationEmail,
  sendOrderCancellationEmail 
} = require('../src/utils/orderEmails');

console.log('===========================================');
console.log('   Comprehensive SendGrid Email Test');
console.log('===========================================\n');

const testRecipient = 'srik27600@gmail.com';

// Create a mock ObjectId for testing
const createMockObjectId = () => {
  return {
    toString: () => '507f1f77bcf86cd799439011',
    slice: (start) => '507f1f77bcf86cd799439011'.slice(start)
  };
};

const runTests = async () => {
  // Connect to MongoDB for site config
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
    console.log('Connected to MongoDB for testing\n');
  } catch (err) {
    console.log('MongoDB connection skipped (using defaults)\n');
  }
  
  const results = [];
  
  // Test User
  const mockUser = {
    name: 'Test User',
    email: testRecipient
  };
  
  // Test 1: Basic Email
  console.log('📧 Test 1: Basic Email...');
  try {
    const result = await sendEmail({
      email: testRecipient,
      subject: 'Test 1: Basic Email',
      message: 'This is a basic text email test.',
      html: '<h1>Basic Email Test</h1><p>This is a basic HTML email test.</p>'
    });
    results.push({ test: 'Basic Email', status: result.success ? '✅ PASS' : '❌ FAIL', details: result });
    console.log(`   ${result.success ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (error) {
    results.push({ test: 'Basic Email', status: '❌ FAIL', details: error.message });
    console.log(`   ❌ FAIL: ${error.message}\n`);
  }

  // Test 2: OTP Style Email
  console.log('📧 Test 2: OTP Style Email...');
  try {
    const otp = Math.floor(100000 + Math.random() * 900000);
    const result = await sendEmail({
      email: testRecipient,
      subject: 'Test 2: Your OTP Code',
      message: `Your OTP code is: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Your OTP Verification Code</h2>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #333; border-radius: 8px;">
            ${otp}
          </div>
          <p style="color: #666; margin-top: 20px;">This code expires in 5 minutes.</p>
        </div>
      `
    });
    results.push({ test: 'OTP Email', status: result.success ? '✅ PASS' : '❌ FAIL', details: result });
    console.log(`   ${result.success ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (error) {
    results.push({ test: 'OTP Email', status: '❌ FAIL', details: error.message });
    console.log(`   ❌ FAIL: ${error.message}\n`);
  }

  // Test 3: Password Reset Style Email
  console.log('📧 Test 3: Password Reset Email...');
  try {
    const resetToken = 'test-reset-token-12345';
    const resetUrl = `https://example.com/reset-password/${resetToken}`;
    const result = await sendEmail({
      email: testRecipient,
      subject: 'Test 3: Password Reset Request',
      message: `Click here to reset your password: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Click the button below:</p>
          <a href="${resetUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    });
    results.push({ test: 'Password Reset Email', status: result.success ? '✅ PASS' : '❌ FAIL', details: result });
    console.log(`   ${result.success ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (error) {
    results.push({ test: 'Password Reset Email', status: '❌ FAIL', details: error.message });
    console.log(`   ❌ FAIL: ${error.message}\n`);
  }

  // Test 4: Order Confirmation Email
  console.log('📧 Test 4: Order Confirmation Email...');
  try {
    const mockOrder = {
      _id: createMockObjectId(),
      status: 'pending',
      items: [
        {
          product: { name: 'Test Product 1' },
          name: 'Test Product 1',
          quantity: 2,
          price: 29.99,
          itemTotal: 59.98,
          size: 'M',
          color: 'Blue'
        },
        {
          product: { name: 'Test Product 2' },
          name: 'Test Product 2',
          quantity: 1,
          price: 49.99,
          itemTotal: 49.99,
          size: 'L',
          color: 'Red'
        }
      ],
      shippingAddress: {
        fullName: 'Test User',
        addressLine1: '123 Test Street',
        addressLine2: 'Apt 4B',
        city: 'Test City',
        state: 'TS',
        postalCode: '12345',
        country: 'USA',
        phone: '+1 555-123-4567'
      },
      subtotal: 109.97,
      shipping: 5.99,
      tax: 8.80,
      total: 124.76,
      paymentMethod: 'Credit Card',
      createdAt: new Date()
    };

    const result = await sendOrderConfirmationEmail(mockUser, mockOrder);
    results.push({ test: 'Order Confirmation', status: result?.success ? '✅ PASS' : '❌ FAIL', details: result });
    console.log(`   ${result?.success ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (error) {
    results.push({ test: 'Order Confirmation', status: '❌ FAIL', details: error.message });
    console.log(`   ❌ FAIL: ${error.message}\n`);
  }

  // Test 5: Shipping Notification Email
  console.log('📧 Test 5: Shipping Notification Email...');
  try {
    const mockOrder = {
      _id: createMockObjectId(),
      items: [
        { name: 'Test Product 1', quantity: 2, price: 29.99 }
      ],
      shippingAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA'
      },
      shippingInfo: {
        trackingNumber: 'TRACK123456789',
        carrier: 'FedEx',
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      total: 64.97
    };

    const result = await sendShippingNotificationEmail(mockUser, mockOrder);
    results.push({ test: 'Shipping Notification', status: result?.success ? '✅ PASS' : '❌ FAIL', details: result });
    console.log(`   ${result?.success ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (error) {
    results.push({ test: 'Shipping Notification', status: '❌ FAIL', details: error.message });
    console.log(`   ❌ FAIL: ${error.message}\n`);
  }

  // Test 6: Delivery Confirmation Email
  console.log('📧 Test 6: Delivery Confirmation Email...');
  try {
    const mockOrder = {
      _id: createMockObjectId(),
      items: [
        { name: 'Test Product 1', quantity: 2, price: 29.99 }
      ],
      shippingInfo: {
        actualDelivery: new Date()
      },
      total: 64.97
    };

    const result = await sendDeliveryConfirmationEmail(mockUser, mockOrder);
    results.push({ test: 'Delivery Confirmation', status: result?.success ? '✅ PASS' : '❌ FAIL', details: result });
    console.log(`   ${result?.success ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (error) {
    results.push({ test: 'Delivery Confirmation', status: '❌ FAIL', details: error.message });
    console.log(`   ❌ FAIL: ${error.message}\n`);
  }

  // Test 7: Order Cancellation Email
  console.log('📧 Test 7: Order Cancellation Email...');
  try {
    const mockOrder = {
      _id: createMockObjectId(),
      items: [
        { name: 'Test Product 1', quantity: 2, price: 29.99 }
      ],
      total: 64.97
    };
    const reason = 'Customer requested cancellation';

    const result = await sendOrderCancellationEmail(mockUser, mockOrder, reason);
    results.push({ test: 'Order Cancellation', status: result?.success ? '✅ PASS' : '❌ FAIL', details: result });
    console.log(`   ${result?.success ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (error) {
    results.push({ test: 'Order Cancellation', status: '❌ FAIL', details: error.message });
    console.log(`   ❌ FAIL: ${error.message}\n`);
  }

  // Summary
  console.log('===========================================');
  console.log('   TEST SUMMARY');
  console.log('===========================================\n');
  
  const passed = results.filter(r => r.status.includes('PASS')).length;
  const failed = results.filter(r => r.status.includes('FAIL')).length;
  
  results.forEach(r => {
    console.log(`${r.status} ${r.test}`);
  });
  
  console.log('\n-------------------------------------------');
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('-------------------------------------------\n');
  
  // Disconnect MongoDB
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! SendGrid is fully operational.\n');
    console.log(`Check inbox: ${testRecipient}`);
    console.log('You should have received 7 test emails.\n');
  } else {
    console.log('⚠️  Some tests failed. Check the details above.\n');
    process.exit(1);
  }
};

runTests().catch(console.error);
