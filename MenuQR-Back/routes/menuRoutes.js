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


// Get current active menu (today's menu)
router.get('/current', async (req, res) => {
  console.log('=== GET /api/menu/current - Request received ===');
  
  try {
    // Get current date in server's local time (YYYY-MM-DD)
    const today = new Date();
    const todayLocalStr = today.toLocaleDateString('en-CA');
    console.log(`Server's local date: ${todayLocalStr}`);

    // First get ALL menus with formatted dates
    const [allMenus] = await db.query(`
      SELECT 
        id, 
        name, 
        date,
        DATE_FORMAT(date, '%Y-%m-%d') as formatted_date
      FROM Menu 
      ORDER BY date DESC
    `);
    
    console.log(`Total menus in database: ${allMenus.length}`);
    console.log('Menu dates in database:', 
      allMenus.map(m => m.formatted_date).join(', '));

    if (allMenus.length === 0) {
      console.log('❌ No menus found in database');
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Find today's menu (exact date match)
    const todayMenu = allMenus.find(menu => 
      menu.formatted_date === todayLocalStr
    );

    // Fallback to most recent menu if today's not found
    const currentMenu = todayMenu || allMenus[0];
    console.log('Selected menu:', {
      id: currentMenu.id,
      name: currentMenu.name,
      date: currentMenu.date,
      formatted_date: currentMenu.formatted_date,
      is_todays_menu: !!todayMenu,
      is_fallback: !todayMenu
    });

    // Get full menu with dishes
    const dishesSql = `
      SELECT 
        s.id as section_id, 
        s.name as section_name,
        d.id as dish_id, 
        d.name as dish_name, 
        d.description, 
        d.price,
        di.image_url
      FROM Section s
      LEFT JOIN Dish d ON s.id = d.section_id AND d.menu_id = ?
      LEFT JOIN DishImage di ON d.id = di.dish_id
      ORDER BY s.name, d.name
    `;
    
    const [dishesRows] = await db.query(dishesSql, [currentMenu.id]);
    console.log(`Found ${dishesRows.length} dish records`);

    // Organize dishes by sections
    const sections = {};
    let totalDishes = 0;

    dishesRows.forEach(row => {
      if (!sections[row.section_id]) {
        sections[row.section_id] = {
          id: row.section_id,
          name: row.section_name,
          dishes: []
        };
      }
      
      if (row.dish_id) {
        const existingDish = sections[row.section_id].dishes.find(
          d => d.id === row.dish_id
        );

        if (!existingDish) {
          sections[row.section_id].dishes.push({
            id: row.dish_id,
            name: row.dish_name,
            description: row.description,
            price: row.price,
            images: row.image_url ? [row.image_url] : []
          });
          totalDishes++;
        } else if (row.image_url) {
          existingDish.images.push(row.image_url);
        }
      }
    });

    console.log(`Organized into ${Object.keys(sections).length} sections with ${totalDishes} dishes`);

    // Build final response
    const response = {
      id: currentMenu.id,
      name: currentMenu.name,
      date: currentMenu.date,
      sections: Object.values(sections),
      meta: {
        is_todays_menu: !!todayMenu,
        is_fallback: !todayMenu,
        server_date: todayLocalStr,
        menu_date: currentMenu.formatted_date
      }
    };

    console.log('✅ Successfully returning current menu');
    res.status(200).json(response);
    
  } catch (err) {
    console.error('❌ Error in GET /api/menu/current:', err);
    console.error(err.stack);
    res.status(500).json({ 
      error: 'Failed to fetch current menu',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ======================
// ADVANCED FEATURES
// ======================

// Get menu suggestions based on popular items
router.get('/menuSuggestions', async (req, res) => {
  console.log('GET /api/menu/menuSuggestions - Request received');
  
  
  try {
    const sql = `
      SELECT 
        d.name, d.description, d.price, s.name as section_name,
        COUNT(oi.dish_id) as order_frequency,
        AVG(d.price) OVER (PARTITION BY s.id) as avg_section_price
      FROM Dish d
      JOIN Section s ON d.section_id = s.id
      JOIN OrderItem oi ON d.id = oi.dish_id
      JOIN \`Order\` o ON oi.order_id = o.id
      JOIN Menu m ON o.menu_id = m.id
      WHERE  o.status = 'served'
        AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY d.id
      HAVING order_frequency >= 5
      ORDER BY order_frequency DESC, s.name
      LIMIT 20
    `;
    
    const [rows] = await db.query(sql);
    
    res.status(200).json({
      message: 'Menu suggestions based on last 30 days',
      suggestions: rows
    });
  } catch (err) {
    console.error('Error in GET /api/menu/menu_suggestions:', err);
    res.status(500).json({ error: 'Failed to fetch menu suggestions', details: err.message });
  }
});



// ======================
// MENU MANAGEMENT
// ======================

// Create a new menu
router.post('/add', async (req, res) => {
  console.log('POST /api/menu/add - Request received');
  console.log('Request body:', req.body);
  
  const { name, date } = req.body;

  if (!name || !date ) {
    return res.status(400).json({ error: 'Name and date are required' });
  }

  try {
    const sql = 'INSERT INTO Menu (name, date) VALUES (?, ?)';
    const result = await db.query(sql, [name, date]);
    
    res.status(201).json({ 
      message: 'Menu created successfully', 
      menu_id: result[0].insertId 
    });
  } catch (err) {
    console.error('Error in POST /api/menu/add:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Menu for this date already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create menu', details: err.message });
    }
  }
});

// Get all menus for a restaurant
router.get('/allMenus', async (req, res) => {
  console.log('GET /api/menu/allMenus - Request received');
    
  try {
    const sql = 'SELECT * FROM Menu ORDER BY date DESC';
    const [rows] = await db.query(sql);
    
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/menu/allMenus:', err);
    res.status(500).json({ error: 'Failed to fetch menus', details: err.message });
  }
});

// Get specific menu
router.get('/:menu_id', async (req, res) => {
  console.log('GET /api/menu/:menu_id - Request received');
  
  const { menu_id } = req.params;
  
  try {
    const sql = 'SELECT * FROM Menu WHERE id = ?';
    const [rows] = await db.query(sql, [menu_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error in GET /api/menu/:menu_id:', err);
    res.status(500).json({ error: 'Failed to fetch menu', details: err.message });
  }
});

// Update menu
router.post('/modify', async (req, res) => {
  console.log('POST /api/restaurants/menu/modify - Request received');
  console.log('Request body:', req.body);
  
  const { menu_id, name, date } = req.body;

  if (!menu_id || !name || !date) {
    return res.status(400).json({ error: 'Menu ID, name and date are required' });
  }

  try {
    const sql = 'UPDATE Menu SET name=?, date=? WHERE id=?';
    await db.query(sql, [name, date, menu_id]);
    
    res.status(200).json({ message: 'Menu updated successfully' });
  } catch (err) {
    console.error('Error in POST /api/menu/modify:', err);
    res.status(500).json({ error: 'Failed to update menu', details: err.message });
  }
});

// Delete menu
router.post('/delete', async (req, res) => {
  console.log('POST /api/menu/delete - Request received');
  console.log('Request body:', req.body);
  
  const { menu_id } = req.body;

  if (!menu_id) {
    return res.status(400).json({ error: 'Menu ID is required' });
  }

  try {
    const sql = 'DELETE FROM Menu WHERE id=?';
    await db.query(sql, [menu_id]);
    
    res.status(200).json({ message: 'Menu deleted successfully' });
  } catch (err) {
    console.error('Error in POST /api/menu/delete:', err);
    res.status(500).json({ error: 'Failed to delete menu', details: err.message });
  }
});


// ======================
// UTILITY FUNCTIONS
// ======================

// Get full menu with dishes organized by sections
router.get('/:menu_id/full', async (req, res) => {
  console.log('GET /api/menu/:menu_id/full - Request received');
  
  const { menu_id } = req.params;
  
  try {
    // Get menu info
    const menuSql = 'SELECT * FROM Menu WHERE id = ?';
    const [menuRows] = await db.query(menuSql, [menu_id]);
    
    if (menuRows.length === 0) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Get dishes organized by sections
    const dishesSql = `
      SELECT 
        s.id as section_id, s.name as section_name,
        d.id as dish_id, d.name as dish_name, d.description, d.price
      FROM Section s
      LEFT JOIN Dish d ON s.id = d.section_id AND d.menu_id = ?
      ORDER BY s.name, d.name
    `;
    const [dishesRows] = await db.query(dishesSql, [menu_id]);

    // Organize dishes by sections
    const sections = {};
    dishesRows.forEach(row => {
      if (!sections[row.section_id]) {
        sections[row.section_id] = {
          id: row.section_id,
          name: row.section_name,
          dishes: []
        };
      }
      
      if (row.dish_id) {
        sections[row.section_id].dishes.push({
          id: row.dish_id,
          name: row.dish_name,
          description: row.description,
          price: row.price
        });
      }
    });

    const fullMenu = {
      ...menuRows[0],
      sections: Object.values(sections)
    };

    res.status(200).json(fullMenu);
  } catch (err) {
    console.error('Error in GET /api/menu/:menu_id/full:', err);
    res.status(500).json({ error: 'Failed to fetch full menu', details: err.message });
  }
});



// ======================
// BULK OPERATIONS
// ======================

// Copy menu to new date
router.post('/copy', async (req, res) => {
  console.log('POST /api/menu/copy - Request received');
  console.log('Request body:', req.body);
  
  const { source_menu_id, new_date, new_name } = req.body;

  if (!source_menu_id || !new_date) {
    return res.status(400).json({ error: 'Source menu ID and new date are required' });
  }

  try {
    await db.query('START TRANSACTION');

    // Get source menu info
    const [sourceMenu] = await db.query('SELECT * FROM Menu WHERE id = ?', [source_menu_id]);
    if (sourceMenu.length === 0) {
      throw new Error('Source menu not found');
    }

    // Create new menu
    const menuName = new_name || `${sourceMenu[0].name} - Copy`;
    const newMenuResult = await db.query(
      'INSERT INTO Menu (name, date) VALUES (?, ?)',
      [menuName, new_date]
    );
    const new_menu_id = newMenuResult[0].insertId;

    // Copy all dishes
    const [dishes] = await db.query('SELECT * FROM Dish WHERE menu_id = ?', [source_menu_id]);
    for (const dish of dishes) {
      await db.query(
        'INSERT INTO Dish (name, description, price, section_id, menu_id) VALUES (?, ?, ?, ?, ?)',
        [dish.name, dish.description, dish.price, dish.section_id, new_menu_id]
      );
    }

    await db.query('COMMIT');
    
    res.status(201).json({ 
      message: 'Menu copied successfully',
      new_menu_id,
      dishes_copied: dishes.length
    });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error in POST /api/menu/copy:', err);
    res.status(500).json({ error: 'Failed to copy menu', details: err.message });
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