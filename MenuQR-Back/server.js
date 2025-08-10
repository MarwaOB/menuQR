const express = require("express")
const app = express()
const cors = require("cors")

app.use(cors());
require('dotenv').config();

// Apply JSON parsing middleware to all routes except file upload routes
app.use((req, res, next) => {
  // Skip JSON parsing only for specific file upload routes
  if (req.path === '/api/restaurant/logo/upload') {
    // Skip JSON parsing for file upload routes
    next();
  } else {
    // Apply JSON parsing for all other routes
    express.json()(req, res, next);
  }
});

require('dotenv').config();

const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
require('dotenv').config();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer configuration for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Make upload and cloudinary available to routes
app.set('cloudinary', cloudinary);
app.set('upload', upload);


app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

// running the server 
const host =  'http://localhost';
app.listen(process.env.PORT, () => {
  console.log(`server running on ${host}:${process.env.PORT}`);
})

// Route imports
const menuRoutes = require('./routes/menuRoutes');
app.use('/api/menu', menuRoutes); 

const sectionRoutes = require('./routes/sectionRoutes');
app.use('/api/section', sectionRoutes); 

const dishRoutes = require('./routes/dishRoutes');
app.use('/api/dish', dishRoutes); 

const  orderRoutes  = require('./routes/orderRoutes');
app.use('/api/order', orderRoutes); 

const statisticsRoutes = require('./routes/statisticsRoutes');
app.use('/api/statistics', statisticsRoutes);

const restaurantRoutes = require('./routes/restaurantRoutes');
app.use('/api/restaurant', restaurantRoutes);

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);




// Global error handler

// Enhanced global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  if (err && err.stack) {
    console.error('Stack trace:', err.stack);
  }
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Catch uncaught exceptions and log them
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  if (err && err.stack) {
    console.error('Stack trace:', err.stack);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason && reason.stack) {
    console.error('Stack trace:', reason.stack);
  }
});






