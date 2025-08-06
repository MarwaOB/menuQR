const express = require('express');
const router = express.Router();
const db = require('../db');
const streamifier = require('streamifier');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ======================
// SECTION MANAGEMENT
// ======================

// Add a new section
router.post('/add', async (req, res) => {
  console.log('POST /api/section/add - Request received');
  console.log('Request body:', req.body);
  
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Section name is required' });
  }

  try {
    const sql = 'INSERT INTO Section (name) VALUES (?)';
    const result = await db.query(sql, [name]);
    
    res.status(201).json({ 
      message: 'Section created successfully', 
      section_id: result[0].insertId 
    });
  } catch (err) {
    console.error('Error in POST /api/section/add:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Section name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create section', details: err.message });
    }
  }
});

// Get all sections
router.get('/allSections', async (req, res) => {
  console.log('GET /api/section/allSections - Request received');
  
  try {
    const sql = 'SELECT * FROM Section ORDER BY name';
    const [rows] = await db.query(sql);
    
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/section/allSections:', err);
    res.status(500).json({ error: 'Failed to fetch sections', details: err.message });
  }
});

// Update section
router.post('/modify', async (req, res) => {
  console.log('POST /api/section/modify - Request received');
  console.log('Request body:', req.body);
  
  const { section_id, name } = req.body;

  if (!section_id || !name) {
    return res.status(400).json({ error: 'Section ID and name are required' });
  }

  try {
    const sql = 'UPDATE Section SET name=? WHERE id=?';
    await db.query(sql, [name, section_id]);
    
    res.status(200).json({ message: 'Section updated successfully' });
  } catch (err) {
    console.error('Error in POST /api/section/modify:', err);
    res.status(500).json({ error: 'Failed to update section', details: err.message });
  }
});

// Delete section
router.post('/delete', async (req, res) => {
  console.log('POST /api/section/delete - Request received');
  console.log('Request body:', req.body);
  
  const { section_id } = req.body;

  if (!section_id) {
    return res.status(400).json({ error: 'Section ID is required' });
  }

  try {
    const sql = 'DELETE FROM Section WHERE id=?';
    await db.query(sql, [section_id]);
    
    res.status(200).json({ message: 'Section deleted successfully' });
  } catch (err) {
    console.error('Error in POST /api/section/delete:', err);
    res.status(500).json({ error: 'Failed to delete section', details: err.message });
  }
});


// ======================
// MIDDLEWARE & UTILITIES
// ======================

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

module.exports = router;