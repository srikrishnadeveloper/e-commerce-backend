const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });

const User = require('../src/models/User');
const Order = require('../src/models/Order');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:28000/ecommerce';
const TEST_EMAIL = 'srik27600@gmail.com';

async function deleteTestUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find and delete user
    const user = await User.findOne({ email: TEST_EMAIL });
    
    if (user) {
      // Delete user's orders first
      const deletedOrders = await Order.deleteMany({ user: user._id });
      console.log(`Deleted ${deletedOrders.deletedCount} orders for user`);
      
      // Delete the user
      await User.deleteOne({ email: TEST_EMAIL });
      console.log(`✅ Deleted user: ${TEST_EMAIL}`);
    } else {
      console.log(`User ${TEST_EMAIL} not found`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteTestUser();
