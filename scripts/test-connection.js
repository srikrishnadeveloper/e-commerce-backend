const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB connection...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE || 'mongodb://localhost:28000/ecommerce');
    console.log('✅ Connected to MongoDB successfully!');
    
    // Test database access
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));
    
    // Check for siteconfigs collection
    const SiteConfig = require('../src/models/SiteConfig');
    const configs = await SiteConfig.find({});
    console.log(`📊 Found ${configs.length} site configurations`);
    
    if (configs.length > 0) {
      configs.forEach(config => {
        console.log(`  - Key: ${config.key}, Active: ${config.isActive}, Version: ${config.version}`);
        if (config.key === 'all') {
          console.log('    Has footer:', !!config.config?.footer);
          console.log('    Has company:', !!config.config?.company);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testConnection();
