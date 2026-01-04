const mongoose = require('mongoose');
const SiteConfig = require('../src/models/SiteConfig');

// Enhanced footer configuration with social media links
const enhancedFooterConfig = {
  footer: {
    copyright: '© 2024 TechCart. All Rights Reserved.',
    getDirectionText: 'Get Direction',
    getDirectionLink: 'https://www.google.com/maps',
    newsletter: {
      title: 'Join Our Newsletter',
      description: 'Get exclusive deals and updates straight to your inbox.',
      placeholder: 'Enter your email',
      buttonText: 'Subscribe'
    },
    socialMedia: {
      facebook: {
        url: '#',
        enabled: true
      },
      youtube: {
        url: '#',
        enabled: true
      },
      instagram: {
        url: '#',
        enabled: true
      },
      telegram: {
        url: '#',
        enabled: true
      },
      temp_remove: {
        url: '#',
        enabled: true
      }
    },
    sections: [
      {
        title: 'Company',
        links: [
          { name: 'About Us', link: '/about' },
          { name: 'Careers', link: '/careers' },
          { name: 'Press', link: '/press' },
          { name: 'Blog', link: '/blog' }
        ]
      },
      {
        title: 'Support',
        links: [
          { name: 'Contact Us', link: '/contact' },
          { name: 'FAQ', link: '/faq' },
          { name: 'Shipping & Returns', link: '/shipping-returns' },
          { name: 'Size Guide', link: '/size-guide' }
        ]
      }
    ]
  },
  company: {
    address: {
      street: '123 Tech Street',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105'
    },
    contact: {
      email: 'info@techcart.com',
      phone: '(555) 123-4567'
    }
  }
};

async function enhanceFooterConfig() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('✅ Connected to MongoDB');

    // Find the main site config
    let siteConfig = await SiteConfig.findOne({ key: 'all', isActive: true });
    
    if (!siteConfig) {
      console.log('❌ No site config found with key "all". Creating new one...');
      siteConfig = new SiteConfig({
        key: 'all',
        config: enhancedFooterConfig,
        version: 1,
        isActive: true
      });
    } else {
      console.log('✅ Found existing site config. Enhancing footer...');
      // Merge the enhanced footer config with existing config
      siteConfig.config = {
        ...siteConfig.config,
        ...enhancedFooterConfig
      };
      siteConfig.version = (siteConfig.version || 1) + 1;
    }

    // Save the enhanced config
    await siteConfig.save();
    console.log('✅ Footer configuration enhanced successfully!');
    
    // Display the updated footer config
    console.log('\n📋 Enhanced Footer Configuration:');
    console.log(JSON.stringify(siteConfig.config.footer, null, 2));
    console.log('\n📋 Company Information:');
    console.log(JSON.stringify(siteConfig.config.company, null, 2));

  } catch (error) {
    console.error('❌ Error enhancing footer config:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the enhancement
enhanceFooterConfig();

