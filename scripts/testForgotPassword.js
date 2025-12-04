const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const User = require('../src/models/User');

async function testForgotPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE);
    console.log('✅ Connected to MongoDB');

    // Find all users
    const users = await User.find({}, 'name email createdAt').limit(10);
    console.log('\n📋 Users in database:');
    if (users.length === 0) {
      console.log('   No users found. Creating a test user...');
      
      // Create a test user
      const testUser = await User.create({
        name: 'Test User',
        email: 'srikrishnawebdeveloper@gmail.com',
        password: 'test1234',
        passwordConfirm: 'test1234'
      });
      console.log(`   ✅ Created test user: ${testUser.email}`);
    } else {
      users.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.name} - ${user.email}`);
      });
    }

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testForgotPassword();
