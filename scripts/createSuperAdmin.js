const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../config.env') });

const Admin = require('../src/models/Admin');

// Super Admin credentials
const superAdmin = {
  username: 'superadmin',
  password: 'Admin@12345',  // Strong default password
  name: 'Super Administrator',
  email: 'admin@ecmous.com',
  priority: 1,
  isActive: true
};

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.DATABASE || 'mongodb://localhost:28000/ecommerce';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if super admin already exists
    const existingAdmin = await Admin.findOne({ priority: 1 });

    if (existingAdmin) {
      console.log('⚠️  Super admin already exists:');
      console.log('   Username:', existingAdmin.username);
      console.log('   Priority:', existingAdmin.priority);
      console.log('   Created:', existingAdmin.createdAt);
      process.exit(0);
    }

    // Create super admin
    const admin = await Admin.create(superAdmin);

    console.log('✅ Super admin created successfully!');
    console.log('');
    console.log('='.repeat(50));
    console.log('SUPER ADMIN CREDENTIALS (Priority 1)');
    console.log('='.repeat(50));
    console.log('Username:', superAdmin.username);
    console.log('Password:', superAdmin.password);
    console.log('Priority:', admin.priority);
    console.log('='.repeat(50));
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('');
    console.log('This admin can:');
    console.log('  ✓ Create additional admin accounts');
    console.log('  ✓ View all admins');
    console.log('  ✓ Deactivate other admins');
    console.log('  ✓ Perform all admin operations');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();
