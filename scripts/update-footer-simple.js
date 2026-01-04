// Simple script to update footer configuration
console.log('Starting footer configuration update...');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';

// Enhanced footer configuration
const footerUpdate = {
  $set: {
    'config.footer.socialMedia': {
      youtube: { url: 'https://youtube.com/@techcart', enabled: true },
      facebook: { url: 'https://facebook.com/techcart', enabled: true },
      instagram: { url: 'https://instagram.com/techcart', enabled: true },
      telegram: { url: 'https://t.me/techcart', enabled: true }
    },
    'config.company': {
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
  }
};

console.log('Footer configuration prepared:');
console.log(JSON.stringify(footerUpdate, null, 2));

// Instructions for manual update
console.log('\n=== MANUAL UPDATE INSTRUCTIONS ===');
console.log('Run this MongoDB command to update the footer configuration:');
console.log('\nmongosh ecommerce');
console.log('\ndb.siteconfigs.updateOne(');
console.log('  { key: "all" },');
console.log('  ' + JSON.stringify(footerUpdate, null, 2));
console.log(')');
console.log('\n=== END INSTRUCTIONS ===');
