const express = require('express');
const router = express.Router();
const db = require('../db');
const streamifier = require('streamifier');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Register a new restaurant
router.post('/register', async (req, res) => {
  console.log('POST /api/auth/register - Request received');
  console.log('Request body:', req.body);
  
  const { name, email, password, phone_number, address, description } = req.body;

  if (!name || !email || !password) {
    console.log('Validation failed: name, email and password are required');
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  try {
    // Check if email already exists
    const [existingUser] = await db.query('SELECT id FROM Restaurant WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const sql = 'INSERT INTO Restaurant (name, email, password, phone_number, address, description) VALUES (?, ?, ?, ?, ?, ?)';
    const result = await db.query(sql, [name, email, hashedPassword, phone_number, address, description]);
    
    console.log('Restaurant registered successfully');
    res.status(201).json({ message: 'Restaurant registered successfully', restaurant_id: result[0].insertId });
  } catch (err) {
    console.error('Error in POST /api/auth/register:', err);
    res.status(500).json({ error: 'Failed to register restaurant', details: err.message });
  }
});

// Login restaurant
router.post('/login', async (req, res) => {
  console.log('POST /api/auth/login - Request received');
  
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM Restaurant WHERE email = ?', [email]);
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const restaurant = rows[0];
    const validPassword = await bcrypt.compare(password, restaurant.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { restaurant_id: restaurant.id, email: restaurant.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Update token in database
    await db.query('UPDATE Restaurant SET token = ? WHERE id = ?', [token, restaurant.id]);

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


module.exports = router;