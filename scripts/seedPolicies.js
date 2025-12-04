/**
 * Seed Policy Pages Configuration
 * Run: node scripts/seedPolicies.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });

const SiteConfig = require('../src/models/SiteConfig');

const policiesData = {
  'refund-policy': {
    pageTitle: 'Refund Policy',
    lastUpdated: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    introduction: 'We want you to be completely satisfied with your purchase. If you are not satisfied, we offer a comprehensive refund policy to ensure your peace of mind.',
    sections: [
      {
        title: '1. Eligibility for Refunds',
        content: 'Items must be returned within 30 days of the original purchase date. Products must be unused, in their original packaging, and in the same condition as when received. Proof of purchase (receipt or order confirmation) is required for all returns.'
      },
      {
        title: '2. Non-Refundable Items',
        content: 'The following items are not eligible for refunds: Gift cards, Downloadable software products, Items marked as "Final Sale" or "Non-Returnable", Personalized or custom-made products, Perishable goods.'
      },
      {
        title: '3. Refund Process',
        content: 'To initiate a refund, please contact our customer service team with your order number and reason for return. Once your return is approved, you will receive instructions on how to ship the item back. Refunds will be processed within 5-10 business days after we receive the returned item.'
      },
      {
        title: '4. Refund Methods',
        content: 'Refunds will be credited to the original payment method used for the purchase. Credit card refunds may take an additional 5-10 business days to appear on your statement, depending on your bank.'
      },
      {
        title: '5. Shipping Costs',
        content: 'Original shipping charges are non-refundable unless the return is due to our error (damaged, defective, or incorrect item). Customers are responsible for return shipping costs unless otherwise specified.'
      },
      {
        title: '6. Exchanges',
        content: 'If you wish to exchange an item for a different size, color, or product, please return the original item for a refund and place a new order for the desired item.'
      },
      {
        title: '7. Damaged or Defective Items',
        content: 'If you receive a damaged or defective item, please contact us within 48 hours of delivery. We will arrange for a replacement or full refund, including shipping costs.'
      }
    ],
    contactInfo: {
      email: 'support@ecommerce.com',
      phone: '(555) 123-4567'
    }
  },
  'terms-conditions': {
    pageTitle: 'Terms and Conditions',
    lastUpdated: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    introduction: 'Please read these Terms and Conditions carefully before using our website and services. By accessing or using our platform, you agree to be bound by these terms.',
    sections: [
      {
        title: '1. Acceptance of Terms',
        content: 'By accessing and using this website, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use this website.'
      },
      {
        title: '2. Use of the Website',
        content: 'You may use our website for lawful purposes only. You must not use our website in any way that causes, or may cause, damage to the website or impairment of the availability or accessibility of the website.'
      },
      {
        title: '3. User Accounts',
        content: 'When you create an account with us, you must provide accurate, complete, and current information. You are responsible for safeguarding the password and for any activities under your account.'
      },
      {
        title: '4. Products and Services',
        content: 'All products and services displayed are subject to availability. We reserve the right to discontinue any product at any time. Prices are subject to change without notice.'
      },
      {
        title: '5. Orders and Payment',
        content: 'We reserve the right to refuse or cancel any order for any reason, including product availability, errors in description or price, or errors in your order.'
      },
      {
        title: '6. Intellectual Property',
        content: 'The content on this website is our property and protected by copyright and trademark laws. You may not reproduce or distribute any content without written permission.'
      },
      {
        title: '7. Limitation of Liability',
        content: 'We shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services.'
      },
      {
        title: '8. Indemnification',
        content: 'You agree to defend and hold harmless our company from any claims arising from your use of the service.'
      },
      {
        title: '9. Governing Law',
        content: 'These Terms shall be governed by the laws of the jurisdiction in which our company is registered.'
      },
      {
        title: '10. Changes to Terms',
        content: 'We reserve the right to modify these Terms at any time. Your continued use constitutes acceptance of changes.'
      }
    ],
    contactInfo: {
      email: 'legal@ecommerce.com',
      companyName: 'E-Commerce Store'
    }
  },
  'privacy-policy': {
    pageTitle: 'Privacy Policy',
    lastUpdated: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    introduction: 'Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a purchase.',
    sections: [
      {
        title: 'Information We Collect',
        content: 'We collect information you provide directly, such as personal information (name, email, phone, address), payment information, account credentials, and purchase history.'
      },
      {
        title: 'How We Use Your Information',
        content: 'We use information to process orders, send confirmations, provide support, send promotional communications (with consent), improve our services, and comply with legal obligations.'
      },
      {
        title: 'Information Sharing',
        content: 'We may share information with service providers, business partners (with consent), and legal authorities when required. We do not sell your personal information.'
      },
      {
        title: 'Cookies and Tracking',
        content: 'We use cookies to enhance browsing experience, analyze traffic, and personalize content. You can control cookie preferences through browser settings.'
      },
      {
        title: 'Data Security',
        content: 'We implement appropriate security measures including encryption and secure servers. However, no method of transmission is 100% secure.'
      },
      {
        title: 'Your Rights',
        content: 'You may have rights to access, correct, delete your information, opt-out of marketing, and data portability depending on your location.'
      },
      {
        title: 'Data Retention',
        content: 'We retain information as long as necessary for the purposes collected. When no longer needed, we securely delete or anonymize it.'
      },
      {
        title: "Children's Privacy",
        content: 'Our website is not intended for children under 13. We do not knowingly collect information from children.'
      },
      {
        title: 'International Transfers',
        content: 'Your information may be transferred to other countries with appropriate safeguards in place.'
      },
      {
        title: 'Changes to This Policy',
        content: 'We may update this policy from time to time. We will notify you of material changes by posting the new policy.'
      }
    ],
    contactInfo: {
      email: 'privacy@ecommerce.com',
      address: '123 Commerce Street, Business City, BC 12345'
    }
  }
};

async function seedPolicies() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Seed each policy
    for (const [key, config] of Object.entries(policiesData)) {
      console.log(`\n📝 Seeding ${key}...`);
      
      const result = await SiteConfig.findOneAndUpdate(
        { key },
        { 
          key, 
          config, 
          version: 1, 
          isActive: true 
        },
        { upsert: true, new: true }
      );
      
      console.log(`✅ ${key} saved successfully`);
    }

    console.log('\n🎉 All policies seeded successfully!');
    console.log('\nPolicy pages available at:');
    console.log('  - /refund-policy');
    console.log('  - /terms-conditions');
    console.log('  - /privacy-policy');

  } catch (error) {
    console.error('❌ Error seeding policies:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the seed function
seedPolicies();
