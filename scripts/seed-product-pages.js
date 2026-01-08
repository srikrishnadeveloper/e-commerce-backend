const mongoose = require('mongoose');
const SiteConfig = require('../src/models/SiteConfig');
require('dotenv').config({ path: './config.env' });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE || 'mongodb://localhost:27017/ecommerce');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedProductPages = async () => {
  try {
    console.log('🚀 Starting productPages configuration seeding...');

    const productPagesConfig = {
      key: 'productPages',
      config: {
        listing: {
          title: 'Latest Electronics',
          description: 'Discover cutting-edge technology and premium electronics at unbeatable prices'
        }
      },
      version: 1,
      isActive: true
    };

    // Check if productPages config already exists
    const existing = await SiteConfig.findOne({ key: 'productPages' });

    if (existing) {
      console.log('📝 Updating existing productPages configuration...');
      await SiteConfig.findOneAndUpdate(
        { key: 'productPages' },
        { $set: { config: productPagesConfig.config } },
        { new: true }
      );
      console.log('✅ ProductPages configuration updated successfully');
    } else {
      console.log('📝 Creating new productPages configuration...');
      await SiteConfig.create(productPagesConfig);
      console.log('✅ ProductPages configuration created successfully');
    }

    console.log('\n📊 Current productPages configuration:');
    const config = await SiteConfig.findOne({ key: 'productPages' });
    console.log(JSON.stringify(config.config, null, 2));

  } catch (error) {
    console.error('❌ Error seeding productPages config:', error);
  }
};

const main = async () => {
  await connectDB();
  await seedProductPages();
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
};

main();
