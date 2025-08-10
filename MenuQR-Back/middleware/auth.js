const jwt = require('jsonwebtoken');

/**
 * Authentication middleware to verify JWT tokens
 * Extracts token from Authorization header and validates it
 * Adds user information to req.user for authenticated requests
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid authentication token in the Authorization header'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      console.error('Token verification failed:', err.message);
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        message: 'The provided token is invalid or has expired. Please login again.'
      });
    }
    
    // Add user information to request object
    req.user = user;
    next();
  });
};

/**
 * Optional authentication middleware
 * Similar to authenticateToken but doesn't fail if no token is provided
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

module.exports = {
  authenticateToken,
  optionalAuth
};
