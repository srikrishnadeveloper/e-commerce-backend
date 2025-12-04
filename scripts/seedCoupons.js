/**
 * Seed Sample Coupons
 * Run: node scripts/seedCoupons.js
 */

require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');
const Coupon = require('../src/models/Coupon');

const sampleCoupons = [
  {
    code: 'WELCOME10',
    description: 'Welcome discount - 10% off your first order',
    discountType: 'percentage',
    discountValue: 10,
    minimumPurchase: 0,
    maximumDiscount: 50,
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    usageLimit: null,
    usageLimitPerUser: 1,
    isFirstPurchaseOnly: true,
    isActive: true
  },
  {
    code: 'SAVE20',
    description: 'Save $20 on orders over $100',
    discountType: 'fixed',
    discountValue: 20,
    minimumPurchase: 100,
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    usageLimit: 100,
    usageLimitPerUser: 2,
    isActive: true
  },
  {
    code: 'FREESHIP',
    description: 'Free shipping on all orders',
    discountType: 'fixed',
    discountValue: 0,
    minimumPurchase: 25,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    usageLimit: 500,
    usageLimitPerUser: 5,
    freeShipping: true,
    isActive: true
  },
  {
    code: 'SUMMER25',
    description: 'Summer sale - 25% off everything',
    discountType: 'percentage',
    discountValue: 25,
    minimumPurchase: 50,
    maximumDiscount: 100,
    validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    usageLimit: 200,
    usageLimitPerUser: 1,
    isActive: true
  },
  {
    code: 'VIP50',
    description: 'VIP exclusive - 50% off (max $200)',
    discountType: 'percentage',
    discountValue: 50,
    minimumPurchase: 200,
    maximumDiscount: 200,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    usageLimit: 50,
    usageLimitPerUser: 1,
    isActive: true
  }
];

async function seedCoupons() {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log('Connected to MongoDB');

    // Clear existing coupons
    await Coupon.deleteMany({});
    console.log('Cleared existing coupons');

    // Insert sample coupons
    const coupons = await Coupon.insertMany(sampleCoupons);
    console.log(`Created ${coupons.length} sample coupons:`);
    
    coupons.forEach(coupon => {
      console.log(`  - ${coupon.code}: ${coupon.description}`);
    });

    console.log('\nCoupon seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding coupons:', error);
    process.exit(1);
  }
}

seedCoupons();
