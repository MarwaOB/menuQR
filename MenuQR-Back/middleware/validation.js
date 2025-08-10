const { body, validationResult } = require('express-validator');

// Validation middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Registration validation rules
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Restaurant name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-'&.]+$/)
    .withMessage('Restaurant name contains invalid characters'),
    
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 100 })
    .withMessage('Email must be less than 100 characters'),
    
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('phone_number')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number')
    .isLength({ max: 50 })
    .withMessage('Phone number must be less than 50 characters'),
    
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters')
    .matches(/^[a-zA-Z0-9\s\-,.'#]+$/)
    .withMessage('Address contains invalid characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
    
  handleValidationErrors
];

// Login validation rules
const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password is too long'),
    
  handleValidationErrors
];

// Forgot password validation rules
const validateForgotPassword = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  handleValidationErrors
];

// Reset password validation rules
const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid reset token format')
    .matches(/^[a-f0-9]{64}$/)
    .withMessage('Reset token must be a valid hexadecimal string'),
    
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  handleValidationErrors
];

// General text field sanitization
const sanitizeTextField = (value) => {
  if (!value) return value;
  return value
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could break SQL
    .substring(0, 1000); // Limit length
};

// Email sanitization
const sanitizeEmail = (email) => {
  if (!email) return email;
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9@._-]/g, ''); // Only allow valid email characters
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  handleValidationErrors,
  sanitizeTextField,
  sanitizeEmail
};
