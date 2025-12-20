const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:28000/ecommerce').then(async () => {
  const Category = require('../src/models/Category');
  const Product = require('../src/models/Product');
  
  console.log('\n=== CATEGORIES ===');
  const cats = await Category.find().select('_id name status');
  cats.forEach(c => console.log(`${c.name}: status=${c.status}, _id=${c._id}`));
  
  console.log('\n=== PRODUCTS ===');
  const prods = await Product.find().select('_id name categoryId');
  prods.forEach(p => console.log(`${p.name}: categoryId=${p.categoryId}`));
  
  console.log('\n=== ACTIVE CATEGORIES ===');
  const activeCats = await Category.find({ status: 'active' }).select('_id');
  console.log('Active category IDs:', activeCats.map(c => c._id.toString()));
  
  console.log('\n=== PRODUCTS MATCHING ACTIVE CATEGORIES ===');
  const activeCatIds = activeCats.map(c => c._id);
  const matchingProducts = await Product.find({ categoryId: { $in: activeCatIds } }).select('_id name');
  console.log('Products in active categories:', matchingProducts.length);
  matchingProducts.forEach(p => console.log(`  - ${p.name}`));
  
  console.log('\n=== PRODUCTS NOT IN ACTIVE CATEGORIES ===');
  const allProducts = await Product.find().select('_id name categoryId');
  const activeCatIdStrings = activeCatIds.map(id => id.toString());
  const missingProducts = allProducts.filter(p => !activeCatIdStrings.includes(p.categoryId?.toString()));
  console.log('Products NOT in active categories:', missingProducts.length);
  missingProducts.forEach(p => console.log(`  - ${p.name} (categoryId: ${p.categoryId})`));
  
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
