const express = require('express');
const router = express.Router();
const db = require('../db');
const streamifier = require('streamifier');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ======================
// UTILITY FUNCTIONS
// ======================

// Search dishes across all menus of the restaurant
router.get('/search', async (req, res) => {
  console.log('GET /api/dish/search - Request received');
  
  const { query, section_id, min_price, max_price } = req.query;
  
  try {
    let sql = `
      SELECT d.*, s.name as section_name, m.name as menu_name, m.date as menu_date
      FROM Dish d
      JOIN Section s ON d.section_id = s.id
      JOIN Menu m ON d.menu_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (query) {
      sql += ' AND (d.name LIKE ? OR d.description LIKE ?)';
      params.push(`%${query}%`, `%${query}%`);
    }

    if (section_id) {
      sql += ' AND d.section_id = ?';
      params.push(section_id);
    }

    if (min_price) {
      sql += ' AND d.price >= ?';
      params.push(min_price);
    }

    if (max_price) {
      sql += ' AND d.price <= ?';
      params.push(max_price);
    }

    sql += ' ORDER BY d.name';

    const [rows] = await db.query(sql, params);
    
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/dish/search:', err);
    res.status(500).json({ error: 'Failed to search dishes', details: err.message });
  }
});

// ======================
// DISH MANAGEMENT
// ======================

// Add a new dish
router.post('/add', async (req, res) => {
  console.log('POST /api/dish/add - Request received');
  console.log('Request body:', req.body);
  
  const { name, description, price, section_id, menu_id } = req.body;

  if (!name || !section_id || !menu_id) {
    return res.status(400).json({ error: 'Name, section_id and menu_id are required' });
  }

  try {
    const sql = 'INSERT INTO Dish (name, description, price, section_id, menu_id) VALUES (?, ?, ?, ?, ?)';
    const result = await db.query(sql, [name, description, price, section_id, menu_id]);
    
    res.status(201).json({ 
      message: 'Dish created successfully', 
      dish_id: result[0].insertId 
    });
  } catch (err) {
    console.error('Error in POST /api/dish/add:', err);
    res.status(500).json({ error: 'Failed to create dish', details: err.message });
  }
});

// Get dishes by menu
router.get('/menus/:menu_id/dishes', async (req, res) => {
  console.log('GET /api/dish/:menu_id/dishes - Request received');
  
  const { menu_id } = req.params;
  
  try {
    const sql = `
      SELECT d.*, s.name as section_name 
      FROM Dish d 
      JOIN Section s ON d.section_id = s.id 
      WHERE d.menu_id = ? 
      ORDER BY s.name, d.name
    `;
    const [rows] = await db.query(sql, [menu_id]);
    
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/dish/:menu_id/dishes:', err);
    res.status(500).json({ error: 'Failed to fetch dishes', details: err.message });
  }
});

// Get specific dish
router.get('/:dish_id', async (req, res) => {
  console.log('GET /api/dish/:dish_id - Request received');
  
  const { dish_id } = req.params;
  
  try {
    const sql = `
      SELECT d.*, s.name as section_name 
      FROM Dish d 
      JOIN Section s ON d.section_id = s.id 
      WHERE d.id = ?
    `;
    const [rows] = await db.query(sql, [dish_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error in GET /api/dish/:dish_id:', err);
    res.status(500).json({ error: 'Failed to fetch dish', details: err.message });
  }
});

// Update dish
router.post('/modify', async (req, res) => {
  console.log('POST /api/dish/modify - Request received');
  console.log('Request body:', req.body);
  
  const { dish_id, name, description, price, section_id } = req.body;

  if (!dish_id || !name || !section_id) {
    return res.status(400).json({ error: 'Dish ID, name and section_id are required' });
  }

  try {
    const sql = 'UPDATE Dish SET name=?, description=?, price=?, section_id=? WHERE id=?';
    await db.query(sql, [name, description, price, section_id, dish_id]);
    
    res.status(200).json({ message: 'Dish updated successfully' });
  } catch (err) {
    console.error('Error in POST /api/dish/modify:', err);
    res.status(500).json({ error: 'Failed to update dish', details: err.message });
  }
});

// Delete dish
router.post('/delete', async (req, res) => {
  console.log('POST /api/dish/delete - Request received');
  console.log('Request body:', req.body);
  
  const { dish_id } = req.body;

  if (!dish_id) {
    return res.status(400).json({ error: 'Dish ID is required' });
  }

  try {
    // Delete associated images first
    const [images] = await db.query('SELECT * FROM DishImage WHERE dish_id = ?', [dish_id]);
    const cloudinary = req.app.get('cloudinary');
    
    for (const image of images) {
      // Delete from Cloudinary
      if (image.public_id) {
        await cloudinary.uploader.destroy(image.public_id);
      }
      // Delete local file
      if (image.local_filename && fs.existsSync(image.local_filename)) {
  fs.unlinkSync(image.local_filename);
}

    }

    const sql = 'DELETE FROM Dish WHERE id=?';
    await db.query(sql, [dish_id]);
    
    res.status(200).json({ message: 'Dish deleted successfully' });
  } catch (err) {
    console.error('Error in POST /api/dish/delete:', err);
    res.status(500).json({ error: 'Failed to delete dish', details: err.message });
  }
});

// Upload dish image
router.post('/image/upload', (req, res, next) => {
  const upload = req.app.get('upload');
  upload.single('image')(req, res, function (err) {
    if (err) {
      return res.status(400).json({ error: 'Image upload failed', details: err.message });
    }
    next();
  });
}, async (req, res) => {
  const cloudinary = req.app.get('cloudinary');
  // Remove this line: const db = req.app.get('db');
  // The db is already imported at the top of the file
  const { dish_id } = req.body;

  if (!dish_id || !req.file) {
    return res.status(400).json({ error: 'Dish ID and image file are required' });
  }

  try {
    // Vérifier d'abord si le dish_id existe
    const [dish] = await db.query('SELECT id FROM Dish WHERE id = ?', [dish_id]);
    if (dish.length === 0) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    // Save locally
    const localFileName = `dish_${dish_id}_${Date.now()}.${req.file.originalname.split('.').pop()}`;
    const localPath = path.join(uploadsDir, localFileName);
    fs.writeFileSync(localPath, req.file.buffer);

    // Upload to Cloudinary
    const uploadToCloudinary = () => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image', folder: 'dish_images' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const cloudinaryResult = await uploadToCloudinary();

    // Enregistrement dans la base
    const sql = 'INSERT INTO DishImage (dish_id, image_url, public_id, local_filename) VALUES (?, ?, ?, ?)';
    await db.query(sql, [dish_id, cloudinaryResult.secure_url, cloudinaryResult.public_id, localPath]);

    res.status(201).json({
      message: 'Dish image uploaded successfully',
      cloudinary_url: cloudinaryResult.secure_url,
      local_path: localPath
    });

  } catch (err) {
    console.error('Error in POST /api/dish/image/upload:', err);
    res.status(500).json({ error: 'Failed to upload dish image', details: err.message });
  }
});

// Get dish images
router.get('/:dish_id/images', async (req, res) => {
  console.log('GET /api/dish/:dish_id/images - Request received');
  
  const { dish_id } = req.params;
  
  try {
    const sql = 'SELECT image_url FROM DishImage WHERE dish_id = ?';
    const [rows] = await db.query(sql, [dish_id]);
    
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/dish/:dish_id/images:', err);
    res.status(500).json({ error: 'Failed to fetch dish images', details: err.message });
  }
});

// Remove dish image
router.post('/image/remove', async (req, res) => {
  console.log('POST /api/dish/image/remove - Request received');
  console.log('Request body:', req.body);
  
  const { dish_id, image_url } = req.body;
  const cloudinary = req.app.get('cloudinary');

  if (!dish_id || !image_url) {
    return res.status(400).json({ error: 'Dish ID and image URL are required' });
  }

  try {
    // Get image info from DB
    const [rows] = await db.query('SELECT * FROM DishImage WHERE dish_id = ? AND image_url = ?', [dish_id, image_url]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const imageInfo = rows[0];

    // Delete from Cloudinary
    if (imageInfo.public_id) {
      await cloudinary.uploader.destroy(imageInfo.public_id);
    }

    // Delete local file
    const localPath = imageInfo.local_path;
if (localPath && fs.existsSync(localPath)) {
  fs.unlinkSync(localPath);
}


    // Delete from DB
    await db.query('DELETE FROM DishImage WHERE dish_id = ? AND image_url = ?', [dish_id, image_url]);
    
    res.status(200).json({ message: 'Dish image removed successfully' });
  } catch (err) {
console.error('Error in POST /api/dish/image/remove:', err.stack || err);
    res.status(500).json({ error: 'Failed to remove dish image', details: err.message });
  }
});



// ======================
// BULK OPERATIONS
// ======================

// Bulk add dishes to menu
router.post('/bulk_add', async (req, res) => {
  console.log('POST /api/dish/bulk_add - Request received');
  console.log('Request body:', req.body);
  
  const { menu_id, dishes } = req.body;

  if (!menu_id || !dishes || !Array.isArray(dishes)) {
    return res.status(400).json({ error: 'Menu ID and dishes array are required' });
  }

  try {
    await db.query('START TRANSACTION');

    for (const dish of dishes) {
      const { name, description, price, section_id } = dish;
      if (!name || !section_id) {
        throw new Error('Each dish must have name and section_id');
      }
      
      await db.query(
        'INSERT INTO Dish (name, description, price, section_id, menu_id) VALUES (?, ?, ?, ?, ?)',
        [name, description, price, section_id, menu_id]
      );
    }

    await db.query('COMMIT');
    
    res.status(201).json({ message: `${dishes.length} dishes added successfully` });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error in POST /api/dish/bulk_add:', err);
    res.status(500).json({ error: 'Failed to bulk add dishes', details: err.message });
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