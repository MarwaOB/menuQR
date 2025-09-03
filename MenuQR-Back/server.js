const express = require("express");
const app = express();
const cors = require("cors");
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Load environment variables
require('dotenv').config();

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create a write stream for logging
const logStream = fs.createWriteStream(path.join(logDir, 'app.log'), { flags: 'a' });

// Logger middleware
const logger = (req, res, next) => {
  const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.url} ${JSON.stringify(req.body)}\n`;
  logStream.write(logMessage);
  console.log(logMessage.trim());
  next();
};

// Enable CORS with more permissive settings for development
app.use((req, res, next) => {
  console.log(`Incoming ${req.method} request to ${req.url} from origin ${req.headers.origin}`);
  
  // Allow requests from any origin
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling preflight request for', req.url);
    return res.status(200).end();
  }
  
  next();
});

// Log all requests
app.use(logger);

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded bodies (for form data)
app.use(express.urlencoded({ extended: true }));

// Parse JSON bodies
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  const errorMessage = `[${new Date().toISOString()}] ERROR: ${err.stack}\n`;
  logStream.write(errorMessage);
  console.error(errorMessage.trim());
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer configuration for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased for dish images)
    files: 1
  }
});

// Make upload and cloudinary available to routes
app.set('cloudinary', cloudinary);
app.set('upload', upload);


app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

// running the server 
const host = '0.0.0.0';
app.listen(process.env.PORT, host, () => {
  console.log(`Server is running on http://${host}:${process.env.PORT} (accessible from your network at http://192.168.1.105:${process.env.PORT})`);  
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






