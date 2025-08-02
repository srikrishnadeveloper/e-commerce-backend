const mongoose = require('mongoose');
const SiteConfig = require('../src/models/SiteConfig');
const fs = require('fs');
const path = require('path');

// Load the site configuration JSON file
const siteConfigPath = path.join(__dirname, '../../frontend/src/data/siteConfig.json');
const siteConfigData = JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'));

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clean up existing configurations
const clearExistingConfigs = async () => {
  try {
    await SiteConfig.deleteMany({});
    console.log('🧹 Cleared existing site configurations');
  } catch (error) {
    console.error('❌ Error clearing existing configs:', error);
  }
};

// Seed site configurations
const seedSiteConfigs = async () => {
  try {
    console.log('🚀 Starting site configuration seeding...');

    // Define the configuration keys and their data
    const configs = [
      {
        key: 'branding',
        config: siteConfigData.branding
      },
      {
        key: 'navigation',
        config: siteConfigData.navigation
      },
      {
        key: 'homepage',
        config: siteConfigData.homePage
      },
      {
        key: 'footer',
        config: siteConfigData.footer
      },
      {
        key: 'pages',
        config: siteConfigData.pages
      },
      {
        key: 'productPages',
        config: siteConfigData.productPages
      },
      {
        key: 'company',
        config: siteConfigData.company
      },
      {
        key: 'cart',
        config: siteConfigData.cart
      },
      {
        key: 'checkout',
        config: siteConfigData.checkout
      },
      {
        key: 'errors',
        config: siteConfigData.errors
      },
      {
        key: 'loading',
        config: siteConfigData.loading
      },
      {
        key: 'accessibility',
        config: siteConfigData.accessibility
      },
      {
        key: 'seo',
        config: siteConfigData.seo
      },
      {
        key: 'announcementBar',
        config: siteConfigData.announcementBar
      },
      {
        key: 'hero',
        config: siteConfigData.hero
      }
    ];

    // Insert all configurations
    const results = await SiteConfig.insertMany(configs);
    
    console.log(`✅ Successfully seeded ${results.length} site configurations:`);
    results.forEach(config => {
      console.log(`   - ${config.key} (v${config.version})`);
    });

    console.log('\n🎉 Site configuration seeding completed successfully!');
    console.log('\n📊 Configuration Summary:');
    console.log(`   - Total configurations: ${results.length}`);
    console.log(`   - Database: ${mongoose.connection.name}`);
    console.log(`   - Collection: siteconfigs`);
    
    // Display some sample data
    const brandingConfig = await SiteConfig.findOne({ key: 'branding' });
    if (brandingConfig) {
      console.log('\n📝 Sample Configuration (Branding):');
      console.log(`   - Company: ${brandingConfig.config.name}`);
      console.log(`   - Tagline: ${brandingConfig.config.tagline}`);
      console.log(`   - Logo: ${brandingConfig.config.logo.light}`);
    }

  } catch (error) {
    console.error('❌ Error seeding site configurations:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await clearExistingConfigs();
    await seedSiteConfigs();
    
    console.log('\n✨ All done! Your site configuration is ready.');
    console.log('\n🔗 API Endpoints:');
    console.log('   - GET /api/siteconfig (all configs)');
    console.log('   - GET /api/siteconfig/branding (specific config)');
    console.log('   - POST /api/siteconfig (create/update)');
    console.log('   - DELETE /api/siteconfig/branding (delete)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedSiteConfigs };
