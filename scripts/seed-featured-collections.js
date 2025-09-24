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

// Featured Collections seed data
const featuredCollectionsData = {
  title: 'Featured Collections',
  enabled: true,
  collections: [
    {
      id: 1,
      title: 'Electronics & Gadgets',
      subtitle: 'Latest Technology',
      description: 'Discover cutting-edge electronics and smart gadgets that make life easier and more enjoyable.',
      image: 'IMAGE_11.png',
      buttonText: 'Shop Electronics',
      buttonLink: '/collections/electronics',
      gradient: 'from-blue-500 to-purple-600'
    },
    {
      id: 2,
      title: 'Fashion & Style',
      subtitle: 'Trendy Apparel',
      description: 'Stay ahead of fashion trends with our curated collection of stylish clothing and accessories.',
      image: 'IMAGE_11.png',
      buttonText: 'Explore Fashion',
      buttonLink: '/collections/fashion',
      gradient: 'from-pink-500 to-red-600'
    },
    {
      id: 3,
      title: 'Home & Living',
      subtitle: 'Comfort & Style',
      description: 'Transform your living space with our beautiful home decor and furniture collection.',
      image: 'IMAGE_11.png',
      buttonText: 'Shop Home',
      buttonLink: '/collections/home',
      gradient: 'from-green-500 to-teal-600'
    },
    {
      id: 4,
      title: 'Sports & Fitness',
      subtitle: 'Active Lifestyle',
      description: 'Gear up for your fitness journey with our premium sports and workout equipment.',
      image: 'IMAGE_11.png',
      buttonText: 'Get Active',
      buttonLink: '/collections/sports',
      gradient: 'from-orange-500 to-yellow-600'
    }
  ]
};

// Seed function
const seedFeaturedCollections = async () => {
  try {
    console.log('🌱 Starting Featured Collections seeding...');

    // Check if homepage config exists
    let homepageConfig = await SiteConfig.findOne({ key: 'homepage' });
    
    if (homepageConfig) {
      // Update existing homepage config
      if (!homepageConfig.config.featuredCollections) {
        homepageConfig.config.featuredCollections = featuredCollectionsData;
        await homepageConfig.save();
        console.log('✅ Added Featured Collections to existing homepage config');
      } else {
        // Merge with existing featured collections, preserving any custom data
        const existingCollections = homepageConfig.config.featuredCollections;
        homepageConfig.config.featuredCollections = {
          ...featuredCollectionsData,
          ...existingCollections,
          collections: existingCollections.collections && existingCollections.collections.length > 0 
            ? existingCollections.collections 
            : featuredCollectionsData.collections
        };
        await homepageConfig.save();
        console.log('✅ Updated existing Featured Collections in homepage config');
      }
    } else {
      // Create new homepage config with featured collections
      const newHomepageConfig = new SiteConfig({
        key: 'homepage',
        config: {
          featuredCollections: featuredCollectionsData,
          hotDealsSection: {
            title: 'Hot Deals',
            subtitle: 'Check out our latest offers and save big!',
            enabled: true,
            productIds: []
          },
          featuresSection: {
            title: 'Why Choose Us',
            subtitle: 'Discover what makes us special',
            enabled: true,
            features: []
          },
          testimonialSection: {
            title: 'What Our Customers Say',
            enabled: true,
            navigationLabels: { previous: 'Previous', next: 'Next' },
            testimonials: []
          }
        },
        version: 1,
        isActive: true
      });
      
      await newHomepageConfig.save();
      console.log('✅ Created new homepage config with Featured Collections');
    }

    console.log('🎉 Featured Collections seeding completed successfully!');
    
    // Display the seeded data
    const updatedConfig = await SiteConfig.findOne({ key: 'homepage' });
    console.log('\n📋 Current Featured Collections data:');
    console.log(JSON.stringify(updatedConfig.config.featuredCollections, null, 2));
    
  } catch (error) {
    console.error('❌ Error seeding Featured Collections:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await seedFeaturedCollections();
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

module.exports = { seedFeaturedCollections, featuredCollectionsData };
