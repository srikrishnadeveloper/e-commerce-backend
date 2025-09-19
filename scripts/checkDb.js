const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });

const Product = require('../src/models/Product');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const SiteConfig = require('../src/models/SiteConfig');

async function main() {
  const uri = process.env.DATABASE || 'mongodb://localhost:28000/ecommerce';
  console.log('Connecting to MongoDB:', uri);
  await mongoose.connect(uri);
  console.log('Connected. DB:', mongoose.connection.name);

  const [products, users, orders, configs] = await Promise.all([
    Product.countDocuments(),
    User.countDocuments(),
    Order.countDocuments(),
    SiteConfig.countDocuments(),
  ]);

  console.log('Counts:');
  console.log(' - products:', products);
  console.log(' - users   :', users);
  console.log(' - orders  :', orders);
  console.log(' - config  :', configs);

  await mongoose.connection.close();
  console.log('Disconnected.');
}

main().catch(async (err) => {
  console.error('checkDb error:', err);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});
