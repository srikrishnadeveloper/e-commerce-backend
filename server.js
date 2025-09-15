const mongoose = require('mongoose');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const path = require('path');
const AppError = require('./src/utils/appError');
const globalErrorHandler = require('./src/controllers/errorController');

dotenv.config({ path: './config.env' });

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', // existing frontend
    'http://localhost:5177', // existing frontend
    'http://localhost:5174'  // admin frontend
  ],
  credentials: true
}));
app.use(express.json());

// Serve static images from the shared root images folder
const sharedImagesPath = path.join(__dirname, '..', 'images');
app.use('/images', express.static(sharedImagesPath));

// Routes
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const siteConfigRoutes = require('./src/routes/siteConfigRoutes');
const userRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');
const wishlistRoutes = require('./src/routes/wishlistRoutes');
const cartRoutes = require('./src/routes/cartRoutes');

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/siteconfig', siteConfigRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/cart', cartRoutes);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

const DB = process.env.DATABASE;

if (!DB) {
  console.error('FATAL ERROR: DATABASE connection string not found in config.env');
  process.exit(1);
}

mongoose.connect(DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('DB connection successful!')).catch(err => {
    console.error('DB connection error:', err);
    process.exit(1);
});

const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
  console.log(`🖼️ Images served from: ${sharedImagesPath} at /api/images`);
});
