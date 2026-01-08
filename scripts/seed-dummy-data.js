const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', 'config.env') });

const DATABASE = process.env.DATABASE || 'mongodb://localhost:28000/ecommerce';

// Models
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');

// Categories for dry fruits store
const categories = [
  {
    name: 'Almonds',
    slug: 'almonds',
    description: 'Premium quality almonds - California, Mamra, and organic varieties',
    status: 'active',
    metaTitle: 'Buy Premium Almonds Online',
    metaDescription: 'Shop the finest quality almonds at best prices',
    displayOrder: 1,
    isActive: true
  },
  {
    name: 'Cashews',
    slug: 'cashews',
    description: 'Whole cashews, splits, and flavored varieties',
    status: 'active',
    metaTitle: 'Buy Premium Cashews Online',
    metaDescription: 'Shop the finest quality cashews at best prices',
    displayOrder: 2,
    isActive: true
  },
  {
    name: 'Pistachios',
    slug: 'pistachios',
    description: 'Roasted, salted, and raw pistachios',
    status: 'active',
    metaTitle: 'Buy Premium Pistachios Online',
    metaDescription: 'Shop the finest quality pistachios at best prices',
    displayOrder: 3,
    isActive: true
  },
  {
    name: 'Dates',
    slug: 'dates',
    description: 'Medjool, Ajwa, and Deglet Noor dates',
    status: 'active',
    metaTitle: 'Buy Premium Dates Online',
    metaDescription: 'Shop the finest quality dates at best prices',
    displayOrder: 4,
    isActive: true
  },
  {
    name: 'Mixed & Bowls',
    slug: 'mixed-bowls',
    description: 'Mixed dry fruits, granola bowls, and gift packs',
    status: 'active',
    metaTitle: 'Buy Mixed Dry Fruits Online',
    metaDescription: 'Shop premium mixed dry fruits and gift packs',
    displayOrder: 5,
    isActive: true
  }
];

// Products with detailed information
const getProducts = (categoryMap) => [
  // ALMONDS (5 products)
  {
    name: 'California Premium Almonds',
    description: 'Our California Premium Almonds are sourced directly from the finest orchards in California\'s Central Valley. These almonds are known for their large size, satisfying crunch, and rich, buttery flavor. Perfect for snacking, baking, or adding to your morning oatmeal. Each almond is carefully selected to ensure premium quality and freshness.',
    price: 599,
    originalPrice: 799,
    category: 'Almonds',
    categoryId: categoryMap['Almonds'],
    images: ['/images/almond-1.png'],
    colors: [],
    sizes: [
      { name: '250g', price: 599 },
      { name: '500g', price: 999 },
      { name: '1kg', price: 1799 }
    ],
    inStock: true,
    stockQuantity: 150,
    rating: 4.8,
    reviews: 245,
    bestseller: true,
    hotDeal: true,
    specifications: {
      'Origin': 'California, USA',
      'Type': 'Raw, Unprocessed',
      'Shelf Life': '12 months',
      'Storage': 'Cool, dry place'
    }
  },
  {
    name: 'Mamra Almonds Premium',
    description: 'Authentic Mamra Almonds from Afghanistan, known for their superior oil content and exceptional nutritional value. These rare almonds have a unique elongated shape and are considered the finest variety in the world. Rich in Vitamin E, healthy fats, and antioxidants. A true delicacy for health-conscious consumers.',
    price: 1299,
    originalPrice: 1599,
    category: 'Almonds',
    categoryId: categoryMap['Almonds'],
    images: ['/images/almond-2.png'],
    colors: [],
    sizes: [
      { name: '250g', price: 1299 },
      { name: '500g', price: 2399 }
    ],
    inStock: true,
    stockQuantity: 80,
    rating: 4.9,
    reviews: 128,
    bestseller: true,
    hotDeal: false,
    specifications: {
      'Origin': 'Afghanistan',
      'Type': 'Raw Mamra',
      'Shelf Life': '10 months',
      'Storage': 'Refrigerate for best results'
    }
  },
  {
    name: 'Roasted Salted Almonds',
    description: 'Perfectly roasted California almonds with just the right amount of Himalayan pink salt. Our slow-roasting process enhances the natural nuttiness while maintaining the crunch. Zero oil used in roasting. An ideal healthy snack for any time of the day.',
    price: 649,
    originalPrice: 849,
    category: 'Almonds',
    categoryId: categoryMap['Almonds'],
    images: ['/images/almond-3.png'],
    colors: [],
    sizes: [
      { name: '200g', price: 649 },
      { name: '400g', price: 1149 },
      { name: '800g', price: 2099 }
    ],
    inStock: true,
    stockQuantity: 200,
    rating: 4.6,
    reviews: 312,
    bestseller: false,
    hotDeal: true,
    specifications: {
      'Origin': 'California, USA',
      'Type': 'Roasted & Salted',
      'Salt': 'Himalayan Pink Salt',
      'Shelf Life': '8 months'
    }
  },
  {
    name: 'Almond Butter Spread',
    description: 'Creamy, all-natural almond butter made from 100% California almonds. No added sugar, no preservatives, no palm oil. Just pure, wholesome almond goodness. Perfect for smoothies, toast, or straight from the jar. High in protein and healthy fats.',
    price: 449,
    originalPrice: 549,
    category: 'Almonds',
    categoryId: categoryMap['Almonds'],
    images: ['/images/almond-4.png'],
    colors: [],
    sizes: [
      { name: '200g', price: 449 },
      { name: '400g', price: 799 }
    ],
    inStock: true,
    stockQuantity: 120,
    rating: 4.7,
    reviews: 89,
    bestseller: false,
    hotDeal: false,
    specifications: {
      'Ingredients': '100% Almonds',
      'Type': 'Creamy',
      'Added Sugar': 'None',
      'Shelf Life': '6 months'
    }
  },
  {
    name: 'Organic Raw Almonds',
    description: 'USDA certified organic almonds grown without pesticides or chemicals. These raw, unpasteurized almonds retain all their natural enzymes and nutrients. Ideal for those following a raw food diet or anyone seeking the purest form of this superfood.',
    price: 899,
    originalPrice: 1099,
    category: 'Almonds',
    categoryId: categoryMap['Almonds'],
    images: ['/images/almond-5.png'],
    colors: [],
    sizes: [
      { name: '250g', price: 899 },
      { name: '500g', price: 1649 }
    ],
    inStock: true,
    stockQuantity: 75,
    rating: 4.8,
    reviews: 67,
    bestseller: false,
    hotDeal: false,
    specifications: {
      'Origin': 'California, USA',
      'Certification': 'USDA Organic',
      'Type': 'Raw, Unpasteurized',
      'Shelf Life': '10 months'
    }
  },

  // CASHEWS (4 products)
  {
    name: 'Whole Cashews W240',
    description: 'Premium W240 grade whole cashews - the gold standard in cashew quality. Each nut is perfectly shaped, ivory-white in color, and delivers an exceptional creamy taste. Sourced from Kerala\'s finest cashew plantations. Perfect for gifting or personal indulgence.',
    price: 749,
    originalPrice: 949,
    category: 'Cashews',
    categoryId: categoryMap['Cashews'],
    images: ['/images/cashew-1.png'],
    colors: [],
    sizes: [
      { name: '250g', price: 749 },
      { name: '500g', price: 1399 },
      { name: '1kg', price: 2599 }
    ],
    inStock: true,
    stockQuantity: 180,
    rating: 4.9,
    reviews: 356,
    bestseller: true,
    hotDeal: true,
    specifications: {
      'Grade': 'W240 (Premium)',
      'Origin': 'Kerala, India',
      'Type': 'Whole, Raw',
      'Shelf Life': '12 months'
    }
  },
  {
    name: 'Roasted Cashews Pepper',
    description: 'Crunchy roasted cashews seasoned with freshly ground black pepper and a hint of sea salt. Our signature dry-roasting technique brings out the natural sweetness of cashews while the pepper adds a subtle kick. Addictively delicious!',
    price: 699,
    originalPrice: 849,
    category: 'Cashews',
    categoryId: categoryMap['Cashews'],
    images: ['/images/cashew-2.png'],
    colors: [],
    sizes: [
      { name: '200g', price: 699 },
      { name: '400g', price: 1299 }
    ],
    inStock: true,
    stockQuantity: 140,
    rating: 4.7,
    reviews: 198,
    bestseller: false,
    hotDeal: true,
    specifications: {
      'Origin': 'Kerala, India',
      'Flavor': 'Black Pepper & Sea Salt',
      'Type': 'Dry Roasted',
      'Shelf Life': '8 months'
    }
  },
  {
    name: 'Cashew Splits',
    description: 'High-quality cashew splits perfect for cooking and baking. These pieces offer the same great taste as whole cashews at a more economical price. Ideal for curries, desserts, stir-fries, and homemade cashew milk.',
    price: 549,
    originalPrice: 699,
    category: 'Cashews',
    categoryId: categoryMap['Cashews'],
    images: ['/images/cashew-3.png'],
    colors: [],
    sizes: [
      { name: '250g', price: 549 },
      { name: '500g', price: 999 },
      { name: '1kg', price: 1849 }
    ],
    inStock: true,
    stockQuantity: 220,
    rating: 4.5,
    reviews: 145,
    bestseller: false,
    hotDeal: false,
    specifications: {
      'Grade': 'Split (2-piece)',
      'Origin': 'Kerala, India',
      'Best For': 'Cooking & Baking',
      'Shelf Life': '12 months'
    }
  },
  {
    name: 'Honey Glazed Cashews',
    description: 'Luxurious cashews coated with pure organic honey and lightly caramelized to perfection. The perfect balance of sweet and nutty. A gourmet treat that makes an excellent gift or a special snack for yourself.',
    price: 799,
    originalPrice: 999,
    category: 'Cashews',
    categoryId: categoryMap['Cashews'],
    images: ['/images/cashew-4.png'],
    colors: [],
    sizes: [
      { name: '200g', price: 799 },
      { name: '350g', price: 1349 }
    ],
    inStock: true,
    stockQuantity: 95,
    rating: 4.8,
    reviews: 112,
    bestseller: true,
    hotDeal: false,
    specifications: {
      'Coating': 'Organic Honey',
      'Origin': 'Kerala, India',
      'Type': 'Sweet & Glazed',
      'Shelf Life': '6 months'
    }
  },

  // PISTACHIOS (3 products)
  {
    name: 'Iranian Pistachios Premium',
    description: 'The finest pistachios from Iran\'s Kerman province - world-renowned for producing the most flavorful pistachios. These naturally opened nuts have a vibrant green color and an unmatched rich, slightly sweet taste. Lightly salted to enhance the natural flavor.',
    price: 899,
    originalPrice: 1199,
    category: 'Pistachios',
    categoryId: categoryMap['Pistachios'],
    images: ['/images/pistachio-1.png'],
    colors: [],
    sizes: [
      { name: '250g', price: 899 },
      { name: '500g', price: 1699 }
    ],
    inStock: true,
    stockQuantity: 100,
    rating: 4.9,
    reviews: 278,
    bestseller: true,
    hotDeal: true,
    specifications: {
      'Origin': 'Kerman, Iran',
      'Type': 'In-Shell, Salted',
      'Color': 'Vibrant Green',
      'Shelf Life': '10 months'
    }
  },
  {
    name: 'Roasted Pistachios Unsalted',
    description: 'Perfectly roasted American pistachios without any added salt. Ideal for those watching their sodium intake or preferring the pure, natural taste of pistachios. Great for baking, cooking, or healthy snacking.',
    price: 849,
    originalPrice: 1049,
    category: 'Pistachios',
    categoryId: categoryMap['Pistachios'],
    images: ['/images/pistachio-2.png'],
    colors: [],
    sizes: [
      { name: '200g', price: 849 },
      { name: '400g', price: 1599 }
    ],
    inStock: true,
    stockQuantity: 85,
    rating: 4.6,
    reviews: 134,
    bestseller: false,
    hotDeal: false,
    specifications: {
      'Origin': 'California, USA',
      'Type': 'In-Shell, Unsalted',
      'Roasting': 'Dry Roasted',
      'Shelf Life': '8 months'
    }
  },
  {
    name: 'Pistachio Kernels',
    description: 'Shelled pistachio kernels - pure green gold! These ready-to-use kernels are perfect for garnishing desserts, adding to ice cream, or incorporating into your favorite recipes. Premium grade with vibrant green color.',
    price: 1199,
    originalPrice: 1499,
    category: 'Pistachios',
    categoryId: categoryMap['Pistachios'],
    images: ['/images/pistachio-3.png'],
    colors: [],
    sizes: [
      { name: '100g', price: 1199 },
      { name: '250g', price: 2799 }
    ],
    inStock: true,
    stockQuantity: 60,
    rating: 4.8,
    reviews: 89,
    bestseller: false,
    hotDeal: true,
    specifications: {
      'Origin': 'Iran',
      'Type': 'Shelled Kernels',
      'Grade': 'Premium Green',
      'Shelf Life': '8 months'
    }
  },

  // DATES (2 products)
  {
    name: 'Medjool Dates Premium',
    description: 'Known as the "King of Dates", our Medjool dates are exceptionally large, incredibly soft, and naturally sweet like caramel. Sourced from Jordan\'s finest date farms. Rich in fiber, potassium, and natural energy. Perfect for athletes, health enthusiasts, or anyone with a sweet tooth.',
    price: 699,
    originalPrice: 899,
    category: 'Dates',
    categoryId: categoryMap['Dates'],
    images: ['/images/dates-1.png'],
    colors: [],
    sizes: [
      { name: '250g', price: 699 },
      { name: '500g', price: 1299 },
      { name: '1kg', price: 2399 }
    ],
    inStock: true,
    stockQuantity: 160,
    rating: 4.9,
    reviews: 423,
    bestseller: true,
    hotDeal: true,
    specifications: {
      'Origin': 'Jordan',
      'Type': 'Fresh Medjool',
      'Texture': 'Soft & Chewy',
      'Shelf Life': '12 months'
    }
  },
  {
    name: 'Ajwa Dates Madina',
    description: 'Sacred Ajwa dates from the holy city of Madina. These dark, wrinkled dates have a unique sweet taste with hints of caramel and dried fruit. Highly valued for their spiritual significance and numerous health benefits. Traditionally consumed for their medicinal properties.',
    price: 1499,
    originalPrice: 1899,
    category: 'Dates',
    categoryId: categoryMap['Dates'],
    images: ['/images/dates-2.png'],
    colors: [],
    sizes: [
      { name: '250g', price: 1499 },
      { name: '500g', price: 2799 }
    ],
    inStock: true,
    stockQuantity: 50,
    rating: 5.0,
    reviews: 187,
    bestseller: true,
    hotDeal: false,
    specifications: {
      'Origin': 'Madina, Saudi Arabia',
      'Type': 'Ajwa',
      'Grade': 'Premium Export',
      'Shelf Life': '18 months'
    }
  },

  // MIXED & BOWLS (3 products)
  {
    name: 'Premium Mixed Dry Fruits',
    description: 'A carefully curated mix of almonds, cashews, pistachios, raisins, and walnuts. Each ingredient is selected for premium quality and perfect proportion. An ideal healthy snack that provides a variety of nutrients, textures, and flavors in every handful.',
    price: 799,
    originalPrice: 999,
    category: 'Mixed & Bowls',
    categoryId: categoryMap['Mixed & Bowls'],
    images: ['/images/granola-bowl.png'],
    colors: [],
    sizes: [
      { name: '250g', price: 799 },
      { name: '500g', price: 1499 },
      { name: '1kg', price: 2799 }
    ],
    inStock: true,
    stockQuantity: 130,
    rating: 4.7,
    reviews: 234,
    bestseller: true,
    hotDeal: true,
    specifications: {
      'Contents': 'Almonds, Cashews, Pistachios, Raisins, Walnuts',
      'Type': 'Premium Mix',
      'Added Sugar': 'None',
      'Shelf Life': '8 months'
    }
  },
  {
    name: 'Salted Peanuts Classic',
    description: 'Crunchy roasted peanuts with just the right amount of salt. A timeless classic that never goes out of style. Perfect for parties, movie nights, or everyday snacking. High in protein and incredibly satisfying.',
    price: 199,
    originalPrice: 249,
    category: 'Mixed & Bowls',
    categoryId: categoryMap['Mixed & Bowls'],
    images: ['/images/peanuts-bowl.png'],
    colors: [],
    sizes: [
      { name: '200g', price: 199 },
      { name: '400g', price: 349 },
      { name: '1kg', price: 799 }
    ],
    inStock: true,
    stockQuantity: 300,
    rating: 4.5,
    reviews: 567,
    bestseller: false,
    hotDeal: true,
    specifications: {
      'Origin': 'Gujarat, India',
      'Type': 'Roasted & Salted',
      'Protein': '26g per 100g',
      'Shelf Life': '10 months'
    }
  },
  {
    name: 'Golden Kiwi Dried',
    description: 'Sweet and tangy dried golden kiwi slices. A delicious and healthy snack packed with Vitamin C and fiber. No added sugar, no preservatives - just pure fruit goodness. Great for snacking, adding to cereals, or baking.',
    price: 399,
    originalPrice: 499,
    category: 'Mixed & Bowls',
    categoryId: categoryMap['Mixed & Bowls'],
    images: ['/images/kiwi-bowl.png'],
    colors: [],
    sizes: [
      { name: '100g', price: 399 },
      { name: '200g', price: 749 }
    ],
    inStock: true,
    stockQuantity: 90,
    rating: 4.6,
    reviews: 78,
    bestseller: false,
    hotDeal: false,
    specifications: {
      'Origin': 'New Zealand',
      'Type': 'Dried Slices',
      'Added Sugar': 'None',
      'Shelf Life': '12 months'
    }
  }
];

async function seedDatabase() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(DATABASE);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('\n🧹 Clearing existing data...');
    await Category.deleteMany({});
    await Product.deleteMany({});
    console.log('✅ Cleared existing categories and products');

    // Create categories
    console.log('\n📁 Creating categories...');
    const categoryMap = {};
    for (const cat of categories) {
      const created = await Category.create(cat);
      categoryMap[cat.name] = created._id;
      console.log(`   ✅ Created category: ${cat.name}`);
    }

    // Create products
    console.log('\n📦 Creating products...');
    const products = getProducts(categoryMap);
    for (const prod of products) {
      await Product.create(prod);
      console.log(`   ✅ Created product: ${prod.name}`);
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log(`   📁 Categories: ${categories.length}`);
    console.log(`   📦 Products: ${products.length}`);

    // Verify
    const catCount = await Category.countDocuments();
    const prodCount = await Product.countDocuments();
    console.log(`\n📊 Verification:`);
    console.log(`   Categories in DB: ${catCount}`);
    console.log(`   Products in DB: ${prodCount}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seedDatabase();
