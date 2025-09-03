const express = require('express');
const router = express.Router();
const db = require('../db');
const streamifier = require('streamifier');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authenticateToken } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


// Get restaurant profile
router.get('/profile', authenticateToken, async (req, res) => {
  console.log('GET /api/restaurant/profile - Request received');
  
  
  try {
    const { rows } = await db.query('SELECT id, name, email, phone_number, address, description, created_at FROM Restaurant');
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error in GET /api/restaurants/profile/:', err);
    res.status(500).json({ error: 'Failed to fetch restaurant profile', details: err.message });
  }
});

// Update restaurant profile
router.post('/profile/modify', authenticateToken, async (req, res) => {
  console.log('POST /api/restaurant/profile/modify - Request received');
  console.log('Request body:', req.body);
  
  const { restaurant_id, name, email, phone_number, address, description } = req.body;

  if (!restaurant_id) {
    return res.status(400).json({ error: 'Restaurant ID is required' });
  }

  try {
    const sql = 'UPDATE Restaurant SET name=$1, email=$2, phone_number=$3, address=$4, description=$5 WHERE id=$6';
    await db.query(sql, [name, email, phone_number, address, description, restaurant_id]);
    
    res.status(200).json({ message: 'Restaurant profile updated successfully' });
  } catch (err) {
    console.error('Error in POST /api/restaurant/profile/modify:', err);
    res.status(500).json({ error: 'Failed to update restaurant profile', details: err.message });
  }
});

// Upload restaurant logo
router.post('/logo/upload', authenticateToken, upload.single('logo'), async (req, res) => {
  const { restaurant_id } = req.body;
  
  if (!restaurant_id || !req.file) {
    return res.status(400).json({ error: 'Restaurant ID and logo file are required' });
  }

  try {
    // Save locally first
    const localFileName = `logo_${restaurant_id}_${Date.now()}.${req.file.originalname.split('.').pop()}`;
    const localPath = path.join(uploadsDir, localFileName);
    fs.writeFileSync(localPath, req.file.buffer);

    // Upload to Cloudinary
    const uploadToCloudinary = () => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image', folder: 'restaurant_logos' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const cloudinaryResult = await uploadToCloudinary();

    // Delete existing logo if any
    const { rows: existingLogos } = await db.query('SELECT * FROM RestaurantLogo WHERE restaurant_id = $1', [restaurant_id]);
    if (existingLogos.length > 0) {
      // Delete from Cloudinary
      if (existingLogos[0].public_id) {
        await cloudinary.uploader.destroy(existingLogos[0].public_id);
      }
      // Delete local file
      if (existingLogos[0].local_path && fs.existsSync(existingLogos[0].local_path)) {
        fs.unlinkSync(existingLogos[0].local_path);
      }
      // Delete from DB
      await db.query('DELETE FROM RestaurantLogo WHERE restaurant_id = $1', [restaurant_id]);
    }

    // Store new logo info in DB (now includes local_path)
    const sql = 'INSERT INTO RestaurantLogo (restaurant_id, image_url, public_id, local_path) VALUES ($1, $2, $3, $4) RETURNING *';
    await db.query(sql, [restaurant_id, cloudinaryResult.secure_url, cloudinaryResult.public_id, localPath]);

    res.status(201).json({
      message: 'Logo uploaded successfully',
      cloudinary_url: cloudinaryResult.secure_url,
      local_path: localPath
    });
  } catch (err) {
    console.error('Error in POST /api/restaurant/logo/upload:', err);
    res.status(500).json({ error: 'Failed to upload logo', details: err.message });
  }
});

// Get restaurant logo
router.get('/:id/logo', authenticateToken, async (req, res) => {
  console.log('GET /api/restaurant/:id/logo - Request received');
  
  const { id } = req.params;
  
  try {
    const { rows } = await db.query('SELECT image_url FROM RestaurantLogo WHERE restaurant_id = $1', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No logo found for this restaurant' });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error in GET /api/restaurant/:id/logo:', err);
    res.status(500).json({ error: 'Failed to fetch restaurant logo', details: err.message });
  }
});

// ======================
// ADVANCED FEATURES
// ======================


// Export menu data (for backup/sharing)
router.get('/export/:menu_id', authenticateToken, async (req, res) => {
  console.log('GET /api/restaurant/export/:menu_id - Request received');
  
  const { menu_id } = req.params;
  
  try {
    // Get complete menu data (no join, since Menu has no restaurant_id)
    const menuSql = `
      SELECT * FROM Menu WHERE id = ?
    `;
    const [menuRows] = await db.query(menuSql, [menu_id]);
    
    if (menuRows.length === 0) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const dishesSql = `
      SELECT d.*, s.name as section_name
      FROM Dish d
      JOIN Section s ON d.section_id = s.id
      WHERE d.menu_id = ?
      ORDER BY s.name, d.name
    `;
    const [dishesRows] = await db.query(dishesSql, [menu_id]);

    const exportData = {
      menu: menuRows[0],
      dishes: dishesRows,
      export_timestamp: new Date().toISOString(),
      total_dishes: dishesRows.length
    };

    res.status(200).json(exportData);
  } catch (err) {
    console.error('Error in GET /api/restaurant/export/:menu_id:', err);
    res.status(500).json({ error: 'Failed to export menu', details: err.message });
  }
});

// Import menu data
router.post('/import', authenticateToken, async (req, res) => {
  console.log('POST /api/restaurant/import - Request received');
  
  const { menu_data, new_date, new_name } = req.body;

  if (!menu_data || !new_date) {
    return res.status(400).json({ error: 'Menu data and new date are required' });
  }

  try {
    await db.query('START TRANSACTION');

    // Create new menu
    const menuName = new_name || menu_data.menu.name;
    const newMenuResult = await db.query(
      'INSERT INTO Menu (name, date) VALUES (?, ?)',
      [menuName, new_date]
    );
    const new_menu_id = newMenuResult[0].insertId;

    // --- Import sections if present and remap section_ids ---
    let sectionIdMap = {};
    if (menu_data.sections && Array.isArray(menu_data.sections) && menu_data.sections.length > 0) {
      for (const section of menu_data.sections) {
        // Check if section with same name exists
        const [existingSections] = await db.query(
          'SELECT id FROM Section WHERE name = ?',
          [section.name]
        );
        let sectionId;
        if (existingSections.length > 0) {
          sectionId = existingSections[0].id;
        } else {
          const [sectionResult] = await db.query(
            'INSERT INTO Section (name) VALUES (?)',
            [section.name]
          );
          sectionId = sectionResult.insertId;
        }
        sectionIdMap[section.id] = sectionId;
      }
    }

    // Import dishes, remapping section_id if needed
    for (const dish of menu_data.dishes) {
      let section_id = dish.section_id;
      if (Object.keys(sectionIdMap).length > 0 && sectionIdMap[dish.section_id]) {
        section_id = sectionIdMap[dish.section_id];
      }
      await db.query(
        'INSERT INTO Dish (name, description, price, section_id, menu_id) VALUES (?, ?, ?, ?, ?)',
        [dish.name, dish.description, dish.price, section_id, new_menu_id]
      );
    }

    await db.query('COMMIT');
    res.status(201).json({
      message: 'Menu imported successfully',
      new_menu_id,
      dishes_imported: menu_data.dishes.length,
      sections_imported: menu_data.sections ? menu_data.sections.length : 0
    });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error in POST /api/restaurant/import:', err);
    res.status(500).json({ error: 'Failed to import menu', details: err.message });
  }
});


// ======================
// INVENTORY SUGGESTIONS
// ======================

// Get low stock alerts (dishes that haven't been ordered recently)
router.get('/inventory/alerts', authenticateToken, async (req, res) => {
  console.log('GET /api/restaurant/inventory/alerts - Request received');

  const { days = 7 } = req.query;

  try {
    const sql = `
      SELECT 
        d.id, d.name, d.description, s.name as section_name,
        COALESCE(SUM(oi.quantity), 0) as times_ordered,
        MAX(o.created_at) as last_ordered,
        DATEDIFF(NOW(), MAX(o.created_at)) as days_since_last_order
      FROM Dish d
      JOIN Section s ON d.section_id = s.id
      JOIN Menu m ON d.menu_id = m.id
      LEFT JOIN OrderItem oi ON d.id = oi.dish_id
      LEFT JOIN \`Order\` o ON oi.order_id = o.id AND o.status = 'served'
        AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY d.id
      HAVING times_ordered < 3 OR days_since_last_order > ? OR last_ordered IS NULL
      ORDER BY times_ordered ASC, days_since_last_order DESC
    `;

    const [rows] = await db.query(sql, [days, days]);

    res.status(200).json({
      message: `Dishes with low orders in the last ${days} days`,
      alerts: rows
    });
  } catch (err) {
    console.error('Error in GET /api/restaurant/inventory/alerts:', err);
    res.status(500).json({ error: 'Failed to fetch inventory alerts', details: err.message });
  }
});

// ======================
// BACKUP & MAINTENANCE
// ======================

// Backup restaurant data
router.get('/backup', authenticateToken, async (req, res) => {
  console.log('GET /api/restaurant/backup - Request received');
    
  try {
    // Get all restaurant data 
    const restaurantSql = 'SELECT * FROM Restaurant LIMIT 1';
    const menusSql = 'SELECT * FROM Menu';
    const dishesSql = `
      SELECT d.*, s.name as section_name
      FROM Dish d
      JOIN Section s ON d.section_id = s.id
      JOIN Menu m ON d.menu_id = m.id
    `;
    const ordersSql = `
      SELECT o.*, oi.dish_id, oi.quantity
      FROM \`Order\` o
      JOIN Menu m ON o.menu_id = m.id
      JOIN OrderItem oi ON o.id = oi.order_id
    `;

    const [restaurant] = await db.query(restaurantSql);
    const [menus] = await db.query(menusSql);
    const [dishes] = await db.query(dishesSql);
    const [orders] = await db.query(ordersSql);

    const backupData = {
      restaurant: restaurant[0],
      menus,
      dishes,
      orders,
      backup_timestamp: new Date().toISOString(),
      version: '1.0'
    };

    res.status(200).json(backupData);
  } catch (err) {
    console.error('Error in GET /api/restaurant/backup:', err);
    res.status(500).json({ error: 'Failed to create backup', details: err.message });
  }
});

// Clean old data (older than specified days)
router.post('/maintenance/cleanup', authenticateToken, async (req, res) => {
  console.log('POST /api/restaurant/maintenance/cleanup - Request received');
  console.log('Request body:', req.body);

  const { days_old = 90 } = req.body;

  try {
    await db.query('START TRANSACTION');

    // Delete old completed orders (no restaurant_id, single restaurant setup)
    const cleanupSql = `
      DELETE o FROM \`Order\` o
      WHERE o.status IN ('served', 'cancelled')
        AND o.created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    const result = await db.query(cleanupSql, [days_old]);

    // Clean up old client sessions
    await db.query('DELETE FROM InternalClient WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)', [days_old]);
    await db.query('DELETE FROM ExternalClient WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)', [days_old]);

    await db.query('COMMIT');

    res.status(200).json({
      message: 'Cleanup completed successfully',
      orders_deleted: result[0].affectedRows
    });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error in POST /api/restaurant/maintenance/cleanup:', err);
    res.status(500).json({ error: 'Failed to cleanup old data', details: err.message });
  }
});



module.exports = router;