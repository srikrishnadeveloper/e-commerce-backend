const mongoose = require('mongoose');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const User = require('../src/models/User');

const API_URL = 'http://localhost:5001/api/auth';

async function makeRequest(endpoint, method, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 500, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 COMPREHENSIVE FORGOT PASSWORD FLOW TESTS\n');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  // Connect to MongoDB
  await mongoose.connect(process.env.DATABASE);
  console.log('✅ Connected to MongoDB\n');

  // Test 1: Forgot password with non-existent email
  console.log('TEST 1: Forgot password with non-existent email');
  const test1 = await makeRequest('/forgotPassword', 'POST', { email: 'nonexistent@test.com' });
  if (test1.status === 404 && test1.data.success === false) {
    console.log('   ✅ PASSED - Returns 404 for non-existent email');
    passed++;
  } else {
    console.log('   ❌ FAILED - Expected 404, got:', test1.status);
    failed++;
  }

  // Test 2: Forgot password with missing email
  console.log('\nTEST 2: Forgot password with missing email');
  const test2 = await makeRequest('/forgotPassword', 'POST', {});
  if (test2.status === 404 || test2.status === 400) {
    console.log('   ✅ PASSED - Returns error for missing email');
    passed++;
  } else {
    console.log('   ❌ FAILED - Expected error, got:', test2.status);
    failed++;
  }

  // Test 3: Forgot password with valid email
  console.log('\nTEST 3: Forgot password with valid email');
  const test3 = await makeRequest('/forgotPassword', 'POST', { email: 'srikrishnawebdeveloper@gmail.com' });
  if (test3.status === 200 && test3.data.success === true) {
    console.log('   ✅ PASSED - Email sent successfully');
    console.log('   📧 Message:', test3.data.message);
    passed++;
  } else {
    console.log('   ❌ FAILED - Expected 200, got:', test3.status, test3.data);
    failed++;
  }

  // Test 4: Verify token is stored in database
  console.log('\nTEST 4: Verify reset token stored in database');
  const user = await User.findOne({ email: 'srikrishnawebdeveloper@gmail.com' })
    .select('+passwordResetToken +passwordResetExpires');
  if (user && user.passwordResetToken && user.passwordResetExpires > Date.now()) {
    console.log('   ✅ PASSED - Reset token stored and valid');
    console.log('   ⏰ Expires:', new Date(user.passwordResetExpires).toLocaleString());
    passed++;
  } else {
    console.log('   ❌ FAILED - Token not found or expired');
    failed++;
  }

  // Test 5: Reset password with invalid token
  console.log('\nTEST 5: Reset password with invalid token');
  const test5 = await makeRequest('/resetPassword/invalidtoken123', 'PATCH', {
    password: 'testtest123',
    passwordConfirm: 'testtest123'
  });
  if (test5.status === 400 && test5.data.success === false) {
    console.log('   ✅ PASSED - Returns 400 for invalid token');
    passed++;
  } else {
    console.log('   ❌ FAILED - Expected 400, got:', test5.status);
    failed++;
  }

  // Test 6: Reset password with expired token
  console.log('\nTEST 6: Reset password with expired token');
  // Create an expired token
  const expiredToken = crypto.randomBytes(32).toString('hex');
  await User.findOneAndUpdate(
    { email: 'srikrishnawebdeveloper@gmail.com' },
    {
      passwordResetToken: crypto.createHash('sha256').update(expiredToken).digest('hex'),
      passwordResetExpires: Date.now() - 1000 // Expired 1 second ago
    }
  );
  const test6 = await makeRequest(`/resetPassword/${expiredToken}`, 'PATCH', {
    password: 'testtest123',
    passwordConfirm: 'testtest123'
  });
  if (test6.status === 400 && test6.data.message.includes('expired')) {
    console.log('   ✅ PASSED - Returns 400 for expired token');
    passed++;
  } else {
    console.log('   ❌ FAILED - Expected expired token error, got:', test6.status, test6.data);
    failed++;
  }

  // Test 7: Reset password with valid token
  console.log('\nTEST 7: Reset password with valid token');
  const validToken = crypto.randomBytes(32).toString('hex');
  await User.findOneAndUpdate(
    { email: 'srikrishnawebdeveloper@gmail.com' },
    {
      passwordResetToken: crypto.createHash('sha256').update(validToken).digest('hex'),
      passwordResetExpires: Date.now() + 10 * 60 * 1000 // Valid for 10 minutes
    }
  );
  const newPassword = 'securenewpass123';
  const test7 = await makeRequest(`/resetPassword/${validToken}`, 'PATCH', {
    password: newPassword,
    passwordConfirm: newPassword
  });
  if (test7.status === 200 && test7.data.success === true && test7.data.token) {
    console.log('   ✅ PASSED - Password reset successful');
    console.log('   🔑 JWT Token received');
    passed++;
  } else {
    console.log('   ❌ FAILED - Expected success, got:', test7.status, test7.data);
    failed++;
  }

  // Test 8: Verify token is cleared after use
  console.log('\nTEST 8: Verify reset token cleared after successful reset');
  const userAfterReset = await User.findOne({ email: 'srikrishnawebdeveloper@gmail.com' })
    .select('+passwordResetToken +passwordResetExpires');
  if (!userAfterReset.passwordResetToken && !userAfterReset.passwordResetExpires) {
    console.log('   ✅ PASSED - Token cleared from database');
    passed++;
  } else {
    console.log('   ❌ FAILED - Token still exists in database');
    failed++;
  }

  // Test 9: Login with new password
  console.log('\nTEST 9: Login with new password');
  const test9 = await makeRequest('/login', 'POST', {
    email: 'srikrishnawebdeveloper@gmail.com',
    password: newPassword
  });
  if (test9.status === 200 && test9.data.success === true) {
    console.log('   ✅ PASSED - Login successful with new password');
    passed++;
  } else {
    console.log('   ❌ FAILED - Login failed:', test9.status, test9.data);
    failed++;
  }

  // Test 10: Login with old password should fail
  console.log('\nTEST 10: Login with old password should fail');
  const test10 = await makeRequest('/login', 'POST', {
    email: 'srikrishnawebdeveloper@gmail.com',
    password: 'newpassword123' // Previous password
  });
  if (test10.status === 401 && test10.data.success === false) {
    console.log('   ✅ PASSED - Old password rejected');
    passed++;
  } else {
    console.log('   ❌ FAILED - Old password still works:', test10.status);
    failed++;
  }

  // Test 11: Reset password with mismatched passwords
  console.log('\nTEST 11: Reset password with mismatched passwords');
  const mismatchToken = crypto.randomBytes(32).toString('hex');
  await User.findOneAndUpdate(
    { email: 'srikrishnawebdeveloper@gmail.com' },
    {
      passwordResetToken: crypto.createHash('sha256').update(mismatchToken).digest('hex'),
      passwordResetExpires: Date.now() + 10 * 60 * 1000
    }
  );
  const test11 = await makeRequest(`/resetPassword/${mismatchToken}`, 'PATCH', {
    password: 'password123',
    passwordConfirm: 'differentpassword'
  });
  if (test11.status === 400 || test11.status === 500) {
    console.log('   ✅ PASSED - Mismatched passwords rejected');
    passed++;
  } else {
    console.log('   ❌ FAILED - Expected error for mismatched passwords');
    failed++;
  }

  // Test 12: Reset password with short password
  console.log('\nTEST 12: Reset password with short password');
  const shortToken = crypto.randomBytes(32).toString('hex');
  await User.findOneAndUpdate(
    { email: 'srikrishnawebdeveloper@gmail.com' },
    {
      passwordResetToken: crypto.createHash('sha256').update(shortToken).digest('hex'),
      passwordResetExpires: Date.now() + 10 * 60 * 1000
    }
  );
  const test12 = await makeRequest(`/resetPassword/${shortToken}`, 'PATCH', {
    password: 'short',
    passwordConfirm: 'short'
  });
  if (test12.status === 400 || test12.status === 500) {
    console.log('   ✅ PASSED - Short password rejected');
    passed++;
  } else {
    console.log('   ❌ FAILED - Expected error for short password');
    failed++;
  }

  // Cleanup - Reset user password to a known value
  console.log('\n' + '='.repeat(60));
  console.log('🔄 Resetting user password to default...');
  const cleanupToken = crypto.randomBytes(32).toString('hex');
  await User.findOneAndUpdate(
    { email: 'srikrishnawebdeveloper@gmail.com' },
    {
      passwordResetToken: crypto.createHash('sha256').update(cleanupToken).digest('hex'),
      passwordResetExpires: Date.now() + 10 * 60 * 1000
    }
  );
  await makeRequest(`/resetPassword/${cleanupToken}`, 'PATCH', {
    password: 'test1234',
    passwordConfirm: 'test1234'
  });
  console.log('✅ Password reset to: test1234');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  // Close connection
  await mongoose.connection.close();
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
