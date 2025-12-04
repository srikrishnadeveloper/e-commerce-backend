const mongoose = require('mongoose');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const User = require('../src/models/User');

async function generateTestToken() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE);
    console.log('✅ Connected to MongoDB');

    // Find user
    const user = await User.findOne({ email: 'srikrishnawebdeveloper@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    // Generate new reset token (same method as in User model)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token and save to DB
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    await user.save({ validateBeforeSave: false });

    console.log('\n📋 Test Reset Token Generated:');
    console.log(`   User: ${user.name} (${user.email})`);
    console.log(`   \n   🔑 UNHASHED TOKEN (use this in URL):`);
    console.log(`   ${resetToken}`);
    console.log(`\n   📧 Reset URL:`);
    console.log(`   http://localhost:5177/reset-password/${resetToken}`);
    console.log(`\n   ⏰ Expires: ${new Date(user.passwordResetExpires).toLocaleString()}`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Done - Use the URL above to test password reset');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

generateTestToken();
