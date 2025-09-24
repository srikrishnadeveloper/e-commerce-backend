const mongoose = require('mongoose');
const SiteConfig = require('../src/models/SiteConfig');

// Complete footer and company configuration
const completeConfig = {
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
      facebook: { url: 'https://facebook.com/techcart', enabled: true },
      twitter: { url: 'https://twitter.com/techcart', enabled: true },
      instagram: { url: 'https://instagram.com/techcart', enabled: true },
      tiktok: { url: 'https://tiktok.com/@techcart', enabled: true },
      pinterest: { url: 'https://pinterest.com/techcart', enabled: true }
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
  branding: {
    logo: {
      light: '/images/logo.svg',
      alt: 'TechCart Logo'
    }
  }
};

async function fixFooterConfig() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE || 'mongodb://localhost:28000/ecommerce');
    console.log('✅ Connected to MongoDB');

    // Check existing configs
    const existingConfigs = await SiteConfig.find({});
    console.log(`📋 Found ${existingConfigs.length} existing configs:`);
    existingConfigs.forEach(config => {
      console.log(`  - Key: ${config.key}, Active: ${config.isActive}`);
    });

    // Find or create the 'all' config
    let allConfig = await SiteConfig.findOne({ key: 'all' });
    
    if (!allConfig) {
      console.log('❌ No "all" config found. Creating new one...');
      allConfig = new SiteConfig({
        key: 'all',
        config: completeConfig,
        version: 1,
        isActive: true
      });
    } else {
      console.log('✅ Found existing "all" config. Updating...');
      // Merge with existing config to preserve other sections
      allConfig.config = {
        ...allConfig.config,
        footer: completeConfig.footer,
        company: completeConfig.company,
        branding: completeConfig.branding
      };
      allConfig.version = (allConfig.version || 1) + 1;
      allConfig.isActive = true;
    }

    // Save the config
    await allConfig.save();
    console.log('✅ "all" config saved successfully!');
    
    // Verify the save
    const verification = await SiteConfig.findOne({ key: 'all', isActive: true });
    if (verification) {
      console.log('✅ Verification successful!');
      console.log('  - Has footer:', !!verification.config.footer);

      console.log('  - Has branding:', !!verification.config.branding);
      console.log('  - Footer sections:', verification.config.footer?.sections?.length || 0);
      console.log('  - Social media platforms:', Object.keys(verification.config.footer?.socialMedia || {}));
    } else {
      console.log('❌ Verification failed!');
    }

  } catch (error) {
    console.error('❌ Error fixing footer config:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the fix
fixFooterConfig();
