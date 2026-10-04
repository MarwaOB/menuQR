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
    // The restaurant that owns this token (not simply the first row in the table).
    const { rows } = await db.query(
      'SELECT id, name, email, phone_number, address, description, created_at FROM Restaurant WHERE id = $1',
      [req.user.restaurant_id]
    );
    
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
  
  const { name, email, phone_number, address, description } = req.body;
  // Only ever update the authenticated restaurant, whatever ID the body claims.
  const restaurant_id = req.user.restaurant_id;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
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
  // Always the authenticated restaurant.
  const restaurant_id = req.user.restaurant_id;

  if (!req.file) {
    return res.status(400).json({ error: 'Logo file is required' });
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
    const { rows: menuRows } = await db.query('SELECT * FROM Menu WHERE id = $1', [menu_id]);

    if (menuRows.length === 0) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const dishesSql = `
      SELECT d.*, s.name as section_name
      FROM Dish d
      JOIN Section s ON d.section_id = s.id
      WHERE d.menu_id = $1
      ORDER BY s.name, d.name
    `;
    const { rows: dishesRows } = await db.query(dishesSql, [menu_id]);

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

  if (!menu_data || !new_date || !Array.isArray(menu_data.dishes)) {
    return res.status(400).json({ error: 'Menu data (with dishes) and new date are required' });
  }

  try {
    const new_menu_id = await db.withTransaction(async (client) => {
      // Create new menu
      const menuName = new_name || menu_data.menu?.name || 'Imported menu';
      const { rows: [menu] } = await client.query(
        'INSERT INTO Menu (name, date) VALUES ($1, $2) RETURNING id',
        [menuName, new_date]
      );

      // --- Import sections if present and remap section_ids ---
      const sectionIdMap = {};
      if (Array.isArray(menu_data.sections)) {
        for (const section of menu_data.sections) {
          const { rows: [row] } = await client.query(
            `INSERT INTO Section (name) VALUES ($1)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [section.name]
          );
          sectionIdMap[section.id] = row.id;
        }
      }

      // Import dishes, remapping section_id if needed
      for (const dish of menu_data.dishes) {
        const section_id = sectionIdMap[dish.section_id] || dish.section_id;
        await client.query(
          'INSERT INTO Dish (name, description, price, section_id, menu_id) VALUES ($1, $2, $3, $4, $5)',
          [dish.name, dish.description, dish.price, section_id, menu.id]
        );
      }

      return menu.id;
    });

    res.status(201).json({
      message: 'Menu imported successfully',
      new_menu_id,
      dishes_imported: menu_data.dishes.length,
      sections_imported: menu_data.sections ? menu_data.sections.length : 0
    });
  } catch (err) {
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

  const days = Math.max(1, parseInt(req.query.days, 10) || 7);

  try {
    const sql = `
      SELECT * FROM (
        SELECT
          d.id, d.name, d.description, s.name as section_name,
          COALESCE(SUM(oi.quantity), 0) as times_ordered,
          MAX(o.created_at) as last_ordered,
          EXTRACT(DAY FROM NOW() - MAX(o.created_at))::int as days_since_last_order
        FROM Dish d
        JOIN Section s ON d.section_id = s.id
        LEFT JOIN OrderItem oi ON d.id = oi.dish_id
        LEFT JOIN OrderTable o ON oi.order_id = o.id AND o.status = 'served'
          AND o.created_at >= NOW() - make_interval(days => $1)
        GROUP BY d.id, s.name
      ) stats
      WHERE times_ordered < 3 OR days_since_last_order > $1 OR last_ordered IS NULL
      ORDER BY times_ordered ASC, days_since_last_order DESC NULLS FIRST
    `;

    const { rows } = await db.query(sql, [days]);

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
    const { rows: restaurant } = await db.query(
      'SELECT id, name, email, phone_number, address, description, created_at FROM Restaurant WHERE id = $1',
      [req.user.restaurant_id]
    );
    const { rows: menus } = await db.query('SELECT * FROM Menu');
    const { rows: dishes } = await db.query(`
      SELECT d.*, s.name as section_name
      FROM Dish d
      JOIN Section s ON d.section_id = s.id
    `);
    const { rows: orders } = await db.query(`
      SELECT o.*, oi.dish_id, oi.quantity
      FROM OrderTable o
      JOIN OrderItem oi ON o.id = oi.order_id
    `);

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

  const days_old = Math.max(1, parseInt(req.body.days_old ?? req.body.days, 10) || 90);

  try {
    const ordersDeleted = await db.withTransaction(async (client) => {
      // Delete old completed orders (order items cascade)
      const result = await client.query(
        `DELETE FROM OrderTable
         WHERE status IN ('served', 'cancelled')
           AND created_at < NOW() - make_interval(days => $1)`,
        [days_old]
      );

      // Clean up old client sessions
      await client.query('DELETE FROM InternalClient WHERE created_at < NOW() - make_interval(days => $1)', [days_old]);
      await client.query('DELETE FROM ExternalClient WHERE created_at < NOW() - make_interval(days => $1)', [days_old]);

      return result.rowCount;
    });

    res.status(200).json({
      message: 'Cleanup completed successfully',
      orders_deleted: ordersDeleted
    });
  } catch (err) {
    console.error('Error in POST /api/restaurant/maintenance/cleanup:', err);
    res.status(500).json({ error: 'Failed to cleanup old data', details: err.message });
  }
});



module.exports = router;
