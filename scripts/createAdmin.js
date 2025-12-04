const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config({ path: './config.env' });

const createAdmin = async () => {
  try {
    const DB = process.env.DATABASE;
    await mongoose.connect(DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('DB connection successful!');

    const adminEmail = 'admin@ecommerce.com';
    const adminPassword = 'AdminPassword123!';

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin user already exists.');
      // Update role just in case
      existingAdmin.role = 'admin';
      await existingAdmin.save({ validateBeforeSave: false });
      console.log('Admin role verified.');
    } else {
      const newAdmin = await User.create({
        name: 'Admin User',
        email: adminEmail,
        password: adminPassword,
        passwordConfirm: adminPassword,
        role: 'admin'
      });
      console.log('Admin user created successfully!');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
};

createAdmin();
