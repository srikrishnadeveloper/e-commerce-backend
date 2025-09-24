const mongoose = require('mongoose');
const SiteConfig = require('../src/models/SiteConfig');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecommerce', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Features Section seed data
const featuresData = {
  title: 'Why Choose Us',
  subtitle: 'Discover what makes us special',
  enabled: true,
  features: [
    {
      icon: '🚚',
      title: 'Fast & Free Shipping',
      description: 'Get your orders delivered swiftly with free shipping on select items.',
      image: 'IMAGE_11.png'
    },
    {
      icon: '🎧',
      title: '24/7 Customer Support',
      description: 'We are here to help you anytime, anywhere.',
      image: 'IMAGE_11.png'
    },
    {
      icon: '🔄',
      title: 'Easy Returns',
      description: 'Hassle-free returns within 30 days of purchase.',
      image: 'IMAGE_11.png'
    }
  ]
};

// Seed function
const seedFeaturesSection = async () => {
  try {
    console.log('🌱 Starting Features Section seeding...');

    // Check if homepage config exists
    let homepageConfig = await SiteConfig.findOne({ key: 'homepage' });
    
    if (homepageConfig) {
      // Update existing homepage config
      if (!homepageConfig.config.featuresSection) {
        homepageConfig.config.featuresSection = featuresData;
        await homepageConfig.save();
        console.log('✅ Added Features Section to existing homepage config');
      } else {
        // Merge with existing features section, preserving any custom data
        const existingFeatures = homepageConfig.config.featuresSection;
        homepageConfig.config.featuresSection = {
          ...featuresData,
          ...existingFeatures,
          features: existingFeatures.features && existingFeatures.features.length > 0 
            ? existingFeatures.features 
            : featuresData.features
        };
        await homepageConfig.save();
        console.log('✅ Updated existing Features Section in homepage config');
      }
    } else {
      // Create new homepage config with features section
      const newHomepageConfig = new SiteConfig({
        key: 'homepage',
        config: {
          featuresSection: featuresData,
          hotDealsSection: {
            title: 'Hot Deals',
            subtitle: 'Check out our latest offers and save big!',
            enabled: true,
            productIds: []
          },
          testimonialSection: {
            title: 'What Our Customers Say',
            navigationLabels: { previous: 'Previous', next: 'Next' },
            testimonials: []
          },
          featuredCollections: {
            title: 'Featured Collections',
            collections: []
          }
        },
        version: 1,
        isActive: true
      });
      
      await newHomepageConfig.save();
      console.log('✅ Created new homepage config with Features Section');
    }

    console.log('🎉 Features Section seeding completed successfully!');
    
    // Display the seeded data
    const updatedConfig = await SiteConfig.findOne({ key: 'homepage' });
    console.log('\n📋 Current Features Section data:');
    console.log(JSON.stringify(updatedConfig.config.featuresSection, null, 2));
    
  } catch (error) {
    console.error('❌ Error seeding Features Section:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await seedFeaturesSection();
  await mongoose.connection.close();
  console.log('🔌 Database connection closed');
  process.exit(0);
};

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

module.exports = { seedFeaturesSection, featuresData };
