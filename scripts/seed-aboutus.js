const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from config.env
dotenv.config({ path: path.join(__dirname, '../config.env') });

const SiteConfig = require('../src/models/SiteConfig');

const aboutUsData = {
  heroTitle: 'About Us',
  storyTitle: 'Our Story',
  storyParagraphs: [
    'Welcome to Ecmous, your premier destination for quality tech products and accessories. Founded in 2020, we started with a simple mission: to make technology accessible and affordable for everyone.',
    'What began as a small online store has grown into a trusted brand serving thousands of customers worldwide. We believe in the power of technology to transform lives and enhance everyday experiences.',
    'Our team is passionate about curating the best products, providing exceptional customer service, and building lasting relationships with our community.'
  ],
  storyImage: '/images/about-story.jpg',
  missionTitle: 'Our Mission',
  missionText: 'Our mission is to provide high-quality tech products at competitive prices while delivering an exceptional shopping experience. We are committed to innovation, customer satisfaction, and building a sustainable future for technology retail.',
  valuesTitle: 'Our Values',
  values: [
    {
      icon: 'quality',
      title: 'Quality First',
      description: 'We carefully select every product to ensure it meets our high standards of quality and reliability.'
    },
    {
      icon: 'customer',
      title: 'Customer Focused',
      description: 'Your satisfaction is our priority. We go above and beyond to provide excellent service and support.'
    },
    {
      icon: 'innovation',
      title: 'Innovation Driven',
      description: 'We stay ahead of trends to bring you the latest and most innovative tech products on the market.'
    }
  ],
  statsEnabled: true,
  stats: [
    {
      value: '10,000+',
      label: 'Happy Customers'
    },
    {
      value: '500+',
      label: 'Products Available'
    },
    {
      value: '50+',
      label: 'Cities Served'
    },
    {
      value: '4.8/5',
      label: 'Customer Rating'
    }
  ],
  ctaTitle: 'Ready to Start Shopping?',
  ctaText: 'Discover our wide range of quality tech products and accessories. Shop with confidence knowing you\'re getting the best value.',
  ctaButtonText: 'Browse Products',
  ctaButtonLink: '/shop'
};

async function seedAboutUs() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.DATABASE || 'mongodb://localhost:28000/ecommerce';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if aboutUs config already exists
    let aboutUsConfig = await SiteConfig.findOne({ key: 'aboutUs' });

    if (aboutUsConfig) {
      // Update existing
      aboutUsConfig.config = aboutUsData;
      await aboutUsConfig.save();
      console.log('✅ About Us config updated in SiteConfig');
    } else {
      // Create new
      aboutUsConfig = new SiteConfig({
        key: 'aboutUs',
        config: aboutUsData,
        isActive: true
      });
      await aboutUsConfig.save();
      console.log('✅ About Us config created in SiteConfig');
    }

    console.log('✅ About Us data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding About Us:', error);
    process.exit(1);
  }
}

seedAboutUs();
