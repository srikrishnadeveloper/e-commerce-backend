const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { connectDB } = require('../src/config/database');
const SiteConfig = require('../src/models/SiteConfig');

const seedSiteConfig = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to MongoDB for site config seeding');

    // Read the site configuration JSON file
    const siteConfigPath = path.join(__dirname, '../../frontend/src/data/siteConfig.json');
    
    if (!fs.existsSync(siteConfigPath)) {
      console.error('Site configuration file not found:', siteConfigPath);
      process.exit(1);
    }

    const siteConfigData = JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'));
    console.log('Loaded site configuration data');

    // Clear existing site config data
    await SiteConfig.deleteMany({});
    console.log('Cleared existing site configuration data');

    // Extract main sections from the site config
    const configSections = [
      {
        key: 'branding',
        config: siteConfigData.branding || {},
        version: 1
      },
      {
        key: 'navigation',
        config: siteConfigData.navigation || {},
        version: 1
      },
      {
        key: 'homepage',
        config: {
          hero: siteConfigData.hero || {},
          announcements: siteConfigData.announcements || {},
          features: siteConfigData.features || {},
          testimonials: siteConfigData.testimonials || {},
          newsletter: siteConfigData.newsletter || {}
        },
        version: 1
      },
      {
        key: 'footer',
        config: siteConfigData.footer || {},
        version: 1
      },
      {
        key: 'seo',
        config: siteConfigData.seo || {},
        version: 1
      },
      {
        key: 'main',
        config: siteConfigData, // Store the entire config as main
        version: 1
      }
    ];

    // Insert site configurations
    for (const section of configSections) {
      if (Object.keys(section.config).length > 0) {
        const savedConfig = await SiteConfig.create(section);
        console.log(`✅ Created site config section: ${savedConfig.key}`);
      }
    }

    console.log(`\n🎉 Site configuration seeding completed successfully!`);
    console.log(`📊 Created ${configSections.filter(s => Object.keys(s.config).length > 0).length} configuration sections`);
    
    // Verify the data
    const count = await SiteConfig.countDocuments();
    console.log(`🔍 Verification: ${count} site configuration documents in database\n`);

  } catch (error) {
    console.error('❌ Error seeding site configuration:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the seeding script
if (require.main === module) {
  seedSiteConfig();
}

module.exports = seedSiteConfig;
