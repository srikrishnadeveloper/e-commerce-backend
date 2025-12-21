/**
 * Script to remove shipping field from all products in MongoDB
 * Run: cd backend && node scripts/remove-product-shipping.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:28000/ecommerce';

async function removeShippingFromProducts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');

    // Remove shipping field from all products
    const result = await productsCollection.updateMany(
      {}, 
      { $unset: { shipping: '' } }
    );

    console.log(`✅ Successfully removed shipping field from ${result.modifiedCount} products`);
    console.log(`   Matched: ${result.matchedCount} documents`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

removeShippingFromProducts();
