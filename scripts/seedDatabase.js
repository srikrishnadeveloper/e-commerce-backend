const fs = require('fs');
const path = require('path');
const { connectDB } = require('../src/config/database');
const Product = require('../src/models/Product');

// Script to seed the database with product data from products.json
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding process...');
    
    // Connect to MongoDB
    await connectDB();
    
    // Path to the products.json file in the frontend
    const productsFilePath = path.join(__dirname, '../../frontend/src/data/products.json');
    
    // Check if the products.json file exists
    if (!fs.existsSync(productsFilePath)) {
      console.error('❌ products.json file not found at:', productsFilePath);
      process.exit(1);
    }
    
    // Read and parse the products.json file
    console.log('📖 Reading products.json file...');
    const fileData = fs.readFileSync(productsFilePath, 'utf8');
    const jsonData = JSON.parse(fileData);
    
    // Extract products from the JSON data
    const products = jsonData.products;
    const categories = jsonData.categories;
    
    console.log(`📦 Found ${products.length} products and ${categories.length} categories`);
    
    // Clear existing products to prevent duplicates
    console.log('🧹 Clearing existing products from database...');
    await Product.deleteMany({});
    console.log('✅ Existing products cleared');
    
    // Transform and insert products
    console.log('💾 Inserting products into database...');
    
    const transformedProducts = products.map(product => ({
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      description: product.description,
      category: product.category,
      categoryId: product.categoryId,
      images: product.images,
      colors: product.colors,
      sizes: product.sizes,
      inStock: product.inStock,
      rating: product.rating,
      reviews: product.reviews,
      features: product.features,
      specifications: product.specifications,
      tags: product.tags,
      bestseller: product.bestseller,
      featured: product.featured
    }));
    
    // Insert products in batches for better performance
    const insertedProducts = await Product.insertMany(transformedProducts);
    
    console.log(`✅ Successfully inserted ${insertedProducts.length} products`);
    
    // Display summary of seeded data
    console.log('\n📊 Seeding Summary:');
    console.log(`   Total Products: ${insertedProducts.length}`);
    console.log(`   Featured Products: ${insertedProducts.filter(p => p.featured).length}`);
    console.log(`   Bestsellers: ${insertedProducts.filter(p => p.bestseller).length}`);
    console.log(`   Products in Stock: ${insertedProducts.filter(p => p.inStock).length}`);
    
    // Display products by category
    console.log('\n📂 Products by Category:');
    for (const category of categories) {
      const categoryCount = insertedProducts.filter(p => p.categoryId === category.id).length;
      console.log(`   ${category.name}: ${categoryCount} products`);
    }
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('💡 You can now delete the products.json file and use the database API');
    
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close the database connection
    try {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      console.log('🔐 Database connection closed');
    } catch (closeError) {
      console.error('Error closing database connection:', closeError);
    }
    process.exit(0);
  }
};

// Run the seeding function if this script is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
