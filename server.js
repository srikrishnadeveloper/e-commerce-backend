const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./src/config/database');
const { notFound } = require('./src/middleware/notFound');
const { errorHandler } = require('./src/middleware/errorHandler');

// Import routes
const productRoutes = require('./src/routes/productRoutes');
const siteConfigRoutes = require('./src/routes/siteConfigRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');

// Initialize Express app
const app = express();

// Environment variables
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5177', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5177'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (images) from frontend public directory
app.use('/images', express.static(path.join(__dirname, '../frontend/public/images')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/public/assets')));
app.use('/public', express.static(path.join(__dirname, '../frontend/public')));

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/siteconfig', siteConfigRoutes);
app.use('/api/categories', categoryRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'E-commerce Backend API is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'E-commerce Backend API',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      health: '/api/health'
    }
  });
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`📊 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('unhandledRejection', (err, promise) => {
  console.log(`💥 Unhandled Promise Rejection: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

module.exports = app;
