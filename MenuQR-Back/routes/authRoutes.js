const express = require('express');
const router = express.Router();
const db = require('../db');
const streamifier = require('streamifier');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const emailService = require('../utils/emailService');
const { 
  validateRegistration, 
  validateLogin, 
  validateForgotPassword, 
  validateResetPassword,
  sanitizeTextField,
  sanitizeEmail
} = require('../middleware/validation');

// Register a new restaurant
router.post('/register', validateRegistration, async (req, res) => {
  console.log('POST /api/auth/register - Request received');
  
  // Sanitize inputs to prevent SQL injection
  const { name, email, password, phone_number, address, description } = req.body;
  const sanitizedData = {
    name: sanitizeTextField(name),
    email: sanitizeEmail(email),
    password: password, // Don't sanitize password - it will be hashed
    phone_number: sanitizeTextField(phone_number),
    address: sanitizeTextField(address),
    description: sanitizeTextField(description)
  };

  if (!sanitizedData.name || !sanitizedData.email || !sanitizedData.password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  try {
    // Check if email already exists
    const { rows: existingRestaurant } = await db.query('SELECT id FROM Restaurant WHERE email = $1', [sanitizedData.email]);
    if (existingRestaurant.length > 0) {
      console.log('Registration failed: Email already exists');
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(sanitizedData.password, 10);

    // Insert new restaurant with sanitized data
    const sql = 'INSERT INTO Restaurant (name, email, password, phone_number, address, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id';
    const { rows } = await db.query(sql, [
      sanitizedData.name, 
      sanitizedData.email, 
      hashedPassword, 
      sanitizedData.phone_number, 
      sanitizedData.address, 
      sanitizedData.description
    ]);
    
    const restaurantId = rows[0].id;
    console.log('Restaurant registered successfully:', restaurantId);
    
    // Send welcome email (optional - don't fail registration if email fails)
    try {
      await emailService.sendWelcomeEmail(email, name);
      console.log(`Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue anyway - don't fail registration due to email issues
    }
    
    res.status(201).json({
      message: 'Restaurant registered successfully',
      restaurant_id: restaurantId
    });
  } catch (err) {
    console.error('Error in POST /api/auth/register:', err);
    res.status(500).json({ error: 'Failed to register restaurant', details: err.message });
  }
});

// Login restaurant
router.post('/login', validateLogin, async (req, res) => {
  console.log('POST /api/auth/login - Request received');
  
  // Sanitize inputs
  const { email, password } = req.body;
  const sanitizedEmail = sanitizeEmail(email);

  try {
    const { rows } = await db.query('SELECT * FROM Restaurant WHERE email = $1', [sanitizedEmail]);
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const restaurant = rows[0];
    const validPassword = await bcrypt.compare(password, restaurant.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { restaurant_id: restaurant.id, email: restaurant.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Update token in database
    await db.query('UPDATE Restaurant SET token = $1 WHERE id = $2', [token, restaurant.id]);

    res.status(200).json({
      message: 'Login successful',
      token,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        email: restaurant.email,
        phone_number: restaurant.phone_number,
        address: restaurant.address,
        description: restaurant.description
      }
    });
  } catch (err) {
    console.error('Error in POST /api/auth/login:', err);
    res.status(500).json({ error: 'Failed to login', details: err.message });
  }
});

// Forgot Password - Request reset token
router.post('/forgot-password', validateForgotPassword, async (req, res) => {
  console.log('POST /api/auth/forgot-password - Request received');
  
  // Sanitize email input
  const { email } = req.body;
  const sanitizedEmail = sanitizeEmail(email);

  try {
    // Check if email exists
    const [rows] = await db.query('SELECT id, name, email FROM Restaurant WHERE email = ?', [sanitizedEmail]);
    
    if (rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({ 
        message: 'If this email is registered, you will receive a password reset link shortly.' 
      });
    }

    const restaurant = rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database
    await db.query(
      'UPDATE Restaurant SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [resetToken, resetTokenExpiry, restaurant.id]
    );

    // Send password reset email
    try {
      const emailResult = await emailService.sendPasswordResetEmail(
        restaurant.email, 
        restaurant.name, 
        resetToken
      );
      
      console.log(`Password reset email sent to ${email}:`, emailResult.messageId);
      
      // In development, log the preview URL
      if (emailResult.previewUrl) {
        console.log(`Preview email at: ${emailResult.previewUrl}`);
      }
      
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Continue anyway - don't reveal email sending failure to user
    }

    res.status(200).json({ 
      message: 'If this email is registered, you will receive a password reset link shortly.'
    });
  } catch (err) {
    console.error('Error in POST /api/auth/forgot-password:', err);
    res.status(500).json({ error: 'Failed to process password reset request', details: err.message });
  }
});

// Reset Password - Verify token and update password
router.post('/reset-password', validateResetPassword, async (req, res) => {
  console.log('POST /api/auth/reset-password - Request received');
  
  // Inputs are already validated by middleware
  const { token, newPassword } = req.body;

  try {
    // Find restaurant with valid reset token
    const [rows] = await db.query(
      'SELECT id, email FROM Restaurant WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );
    
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const restaurant = rows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await db.query(
      'UPDATE Restaurant SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashedPassword, restaurant.id]
    );

    console.log(`Password reset successful for restaurant: ${restaurant.email}`);
    
    res.status(200).json({ 
      message: 'Password has been reset successfully. You can now log in with your new password.' 
    });
  } catch (err) {
    console.error('Error in POST /api/auth/reset-password:', err);
    res.status(500).json({ error: 'Failed to reset password', details: err.message });
  }
});

// Verify Reset Token - Check if token is valid (optional endpoint for frontend validation)
router.post('/verify-reset-token', async (req, res) => {
  console.log('POST /api/auth/verify-reset-token - Request received');
  
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const [rows] = await db.query(
      'SELECT email FROM Restaurant WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );
    
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.status(200).json({ 
      message: 'Token is valid',
      email: rows[0].email 
    });
  } catch (err) {
    console.error('Error in POST /api/auth/verify-reset-token:', err);
    res.status(500).json({ error: 'Failed to verify reset token', details: err.message });
  }
});


module.exports = router;