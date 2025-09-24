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

// Testimonials Section seed data
const testimonialsData = {
  title: 'What Our Customers Say',
  enabled: true,
  navigationLabels: {
    previous: 'Previous',
    next: 'Next'
  },
  testimonials: [
    {
      name: 'Sarah Johnson',
      role: 'Verified Customer',
      rating: 5,
      text: 'Amazing quality products and lightning-fast delivery! I\'ve been shopping here for months and they never disappoint. Highly recommend to everyone!'
    },
    {
      name: 'Michael Chen',
      role: 'Premium Member',
      rating: 5,
      text: 'Outstanding customer service and top-notch products. The team goes above and beyond to ensure customer satisfaction. Five stars!'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Loyal Customer',
      rating: 5,
      text: 'Best online shopping experience I\'ve ever had. Great prices, excellent quality, and super fast shipping. Will definitely shop here again!'
    },
    {
      name: 'David Thompson',
      role: 'Tech Enthusiast',
      rating: 5,
      text: 'Incredible selection of products and unbeatable prices. The website is easy to navigate and the checkout process is seamless.'
    }
  ]
};

// Seed function
const seedTestimonialsSection = async () => {
  try {
    console.log('🌱 Starting Testimonials Section seeding...');

    // Check if homepage config exists
    let homepageConfig = await SiteConfig.findOne({ key: 'homepage' });
    
    if (homepageConfig) {
      // Update existing homepage config
      if (!homepageConfig.config.testimonialSection) {
        homepageConfig.config.testimonialSection = testimonialsData;
        await homepageConfig.save();
        console.log('✅ Added Testimonials Section to existing homepage config');
      } else {
        // Merge with existing testimonials section, preserving any custom data
        const existingTestimonials = homepageConfig.config.testimonialSection;
        homepageConfig.config.testimonialSection = {
          ...testimonialsData,
          ...existingTestimonials,
          testimonials: existingTestimonials.testimonials && existingTestimonials.testimonials.length > 0 
            ? existingTestimonials.testimonials 
            : testimonialsData.testimonials
        };
        await homepageConfig.save();
        console.log('✅ Updated existing Testimonials Section in homepage config');
      }
    } else {
      // Create new homepage config with testimonials section
      const newHomepageConfig = new SiteConfig({
        key: 'homepage',
        config: {
          testimonialSection: testimonialsData,
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
          featuredCollections: {
            title: 'Featured Collections',
            collections: []
          }
        },
        version: 1,
        isActive: true
      });
      
      await newHomepageConfig.save();
      console.log('✅ Created new homepage config with Testimonials Section');
    }

    console.log('🎉 Testimonials Section seeding completed successfully!');
    
    // Display the seeded data
    const updatedConfig = await SiteConfig.findOne({ key: 'homepage' });
    console.log('\n📋 Current Testimonials Section data:');
    console.log(JSON.stringify(updatedConfig.config.testimonialSection, null, 2));
    
  } catch (error) {
    console.error('❌ Error seeding Testimonials Section:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await seedTestimonialsSection();
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

module.exports = { seedTestimonialsSection, testimonialsData };
