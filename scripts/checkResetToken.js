const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const User = require('../src/models/User');

async function checkResetToken() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE);
    console.log('✅ Connected to MongoDB');

    // Find user with reset token
    const user = await User.findOne({ email: 'srikrishnawebdeveloper@gmail.com' })
      .select('+passwordResetToken +passwordResetExpires');
    
    if (user) {
      console.log('\n📋 User reset token info:');
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Reset Token Hash: ${user.passwordResetToken ? user.passwordResetToken.substring(0, 20) + '...' : 'None'}`);
      console.log(`   Token Expires: ${user.passwordResetExpires ? user.passwordResetExpires : 'N/A'}`);
      console.log(`   Token Valid: ${user.passwordResetExpires && user.passwordResetExpires > Date.now() ? '✅ Yes' : '❌ No/Expired'}`);
    } else {
      console.log('❌ User not found');
    }

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkResetToken();
