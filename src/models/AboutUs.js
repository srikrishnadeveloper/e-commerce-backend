const mongoose = require('mongoose');

const valueSchema = new mongoose.Schema({
  icon: { type: String, default: 'quality' }, // quality, customer, innovation
  title: { type: String, required: true },
  description: { type: String, required: true }
});

const statSchema = new mongoose.Schema({
  value: { type: String, required: true },
  label: { type: String, required: true }
});

const aboutUsSchema = new mongoose.Schema({
  // Hero Section
  heroTitle: { type: String, default: 'About Us' },
  
  // Our Story Section
  storyTitle: { type: String, default: 'Our Story' },
  storyParagraphs: [{ type: String }],
  storyImage: { type: String, default: '' },
  
  // Mission Section
  missionTitle: { type: String, default: 'Our Mission' },
  missionText: { type: String, default: '' },
  
  // Values Section
  valuesTitle: { type: String, default: 'Our Values' },
  values: [valueSchema],
  
  // Stats Section
  statsEnabled: { type: Boolean, default: true },
  stats: [statSchema],
  
  // CTA Section
  ctaTitle: { type: String, default: 'Ready to Start Shopping?' },
  ctaText: { type: String, default: '' },
  ctaButtonText: { type: String, default: 'Browse Products' },
  ctaButtonLink: { type: String, default: '/shop' },
  
  // Meta
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Ensure only one AboutUs document exists
aboutUsSchema.statics.getAboutUs = async function() {
  let aboutUs = await this.findOne();
  if (!aboutUs) {
    // Create default AboutUs content
    aboutUs = await this.create({
      heroTitle: 'About Us',
      storyTitle: 'Our Story',
      storyParagraphs: [
        'Founded in 2020, TechCart began with a simple mission: to make premium technology accessible to everyone. What started as a small online store has grown into a trusted destination for tech enthusiasts and everyday consumers alike.',
        'Our journey has been driven by our passion for innovation and our commitment to customer satisfaction. We believe that everyone deserves access to the latest technology without breaking the bank.',
        'Today, we serve thousands of customers across the country, offering a carefully curated selection of electronics, accessories, and smart home devices. Every product in our store is handpicked for quality, performance, and value.'
      ],
      storyImage: '',
      missionTitle: 'Our Mission',
      missionText: 'To empower our customers with cutting-edge technology and exceptional service, making digital innovation accessible to all. We strive to be more than just a store – we aim to be your trusted technology partner, guiding you through the ever-evolving world of tech.',
      valuesTitle: 'Our Values',
      values: [
        { icon: 'quality', title: 'Quality First', description: 'We never compromise on quality. Every product undergoes rigorous testing before making it to our shelves.' },
        { icon: 'customer', title: 'Customer First', description: 'Your satisfaction is our priority. We go above and beyond to ensure an exceptional shopping experience.' },
        { icon: 'innovation', title: 'Innovation', description: 'We stay ahead of the curve, constantly updating our catalog with the latest and greatest in technology.' }
      ],
      statsEnabled: true,
      stats: [
        { value: '10K+', label: 'Happy Customers' },
        { value: '500+', label: 'Products' },
        { value: '50+', label: 'Brands' },
        { value: '24/7', label: 'Support' }
      ],
      ctaTitle: 'Ready to Start Shopping?',
      ctaText: 'Explore our wide range of products and discover why thousands of customers trust TechCart for all their technology needs.',
      ctaButtonText: 'Browse Products',
      ctaButtonLink: '/shop'
    });
  }
  return aboutUs;
};

module.exports = mongoose.model('AboutUs', aboutUsSchema);
