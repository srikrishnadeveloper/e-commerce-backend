const mongoose = require('mongoose');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const AppError = require('./src/utils/appError');
const globalErrorHandler = require('./src/controllers/errorController');

dotenv.config({ path: './config.env' });

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5177'], // Add your frontend URL
  credentials: true
}));
app.use(express.json());

// Routes
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const siteConfigRoutes = require('./src/routes/siteConfigRoutes');
const userRoutes = require('./src/routes/userRoutes');

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/siteconfig', siteConfigRoutes);
app.use('/api/users', userRoutes);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose.connect(DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('DB connection successful!'));

const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});