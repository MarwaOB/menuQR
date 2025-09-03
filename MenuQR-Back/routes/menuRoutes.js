const express = require('express');
const router = express.Router();
const db = require('../db');
const streamifier = require('streamifier');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');

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
    const { rows: allMenus } = await db.query(`
      SELECT 
        id, 
        name, 
        date,
        TO_CHAR(date, 'YYYY-MM-DD') as formatted_date
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
      LEFT JOIN Dish d ON s.id = d.section_id AND d.menu_id = $1
      LEFT JOIN DishImage di ON d.id = di.dish_id
      ORDER BY s.name, d.name
    `;
    
    const { rows: dishesRows } = await db.query(dishesSql, [currentMenu.id]);
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
    
    const { rows } = await db.query(sql);
    
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
router.post('/add', authenticateToken, async (req, res) => {
  console.log('POST /api/menu/add - Request received');
  console.log('Request body:', req.body);
  
  const { name, date } = req.body;

  if (!name || !date ) {
    return res.status(400).json({ error: 'Name and date are required' });
  }

  try {
    const sql = 'INSERT INTO Menu (name, date) VALUES ($1, $2) RETURNING id';
    const result = await db.query(sql, [name, date]);
    
    if (result.rows.length === 0) {
      throw new Error('Failed to create menu - no ID returned');
    }
    
    res.status(201).json({ 
      message: 'Menu created successfully', 
      menu_id: result.rows[0].id 
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
router.get('/allMenus', authenticateToken, async (req, res) => {
  console.log('GET /api/menu/allMenus - Request received');
    
  try {
    const sql = 'SELECT * FROM Menu ORDER BY date DESC';
    const { rows } = await db.query(sql);
    
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
    const sql = 'SELECT * FROM Menu WHERE id = $1';
    const { rows } = await db.query(sql, [menu_id]);
    
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
router.post('/modify', authenticateToken, async (req, res) => {
  console.log('POST /api/restaurants/menu/modify - Request received');
  console.log('Request body:', req.body);
  
  const { menu_id, name, date } = req.body;

  if (!menu_id || !name || !date) {
    return res.status(400).json({ error: 'Menu ID, name and date are required' });
  }

  try {
    const sql = 'UPDATE Menu SET name = $1, date = $2 WHERE id = $3';
    await db.query(sql, [name, date, menu_id]);
    
    res.status(200).json({ message: 'Menu updated successfully' });
  } catch (err) {
    console.error('Error in POST /api/menu/modify:', err);
    res.status(500).json({ error: 'Failed to update menu', details: err.message });
  }
});

// Delete menu
router.post('/delete', authenticateToken, async (req, res) => {
  console.log('POST /api/menu/delete - Request received');
  console.log('Request body:', req.body);
  
  const { menu_id } = req.body;

  if (!menu_id) {
    return res.status(400).json({ error: 'Menu ID is required' });
  }

  try {
    const cloudinary = req.app.get('cloudinary');
    
    // Start transaction for data consistency
    await db.query('START TRANSACTION');

    // 1. Get all dishes in this menu
    const { rows: dishes } = await db.query('SELECT id FROM Dish WHERE menu_id = $1', [menu_id]);
    console.log(`Found ${dishes.length} dishes to delete for menu ${menu_id}`);

    // 2. Delete all dish images (both from storage and database)
    for (const dish of dishes) {
      // Get all images for this dish
      const { rows: images } = await db.query('SELECT * FROM DishImage WHERE dish_id = $1', [dish.id]);
      
      for (const image of images) {
        // Delete from Cloudinary
        if (image.public_id) {
          try {
            await cloudinary.uploader.destroy(image.public_id);
            console.log(`Deleted image from Cloudinary: ${image.public_id}`);
          } catch (cloudinaryErr) {
            console.warn(`Failed to delete from Cloudinary: ${image.public_id}`, cloudinaryErr);
          }
        }
        
        // Delete local file
        if (image.local_filename && fs.existsSync(image.local_filename)) {
          try {
            fs.unlinkSync(image.local_filename);
            console.log(`Deleted local file: ${image.local_filename}`);
          } catch (fsErr) {
            console.warn(`Failed to delete local file: ${image.local_filename}`, fsErr);
          }
        }
      }
      
      // Delete image records from database
      await db.query('DELETE FROM DishImage WHERE dish_id = $1', [dish.id]);
    }

    // 3. Delete all dishes in this menu
    await db.query('DELETE FROM Dish WHERE menu_id = $1', [menu_id]);
    console.log(`Deleted ${dishes.length} dishes for menu ${menu_id}`);

    // 4. Finally delete the menu itself
    await db.query('DELETE FROM Menu WHERE id = $1', [menu_id]);
    console.log(`Deleted menu ${menu_id}`);

    // Commit transaction
    await db.query('COMMIT');
    
    res.status(200).json({ 
      message: 'Menu deleted successfully',
      deleted_dishes: dishes.length 
    });
  } catch (err) {
    // Rollback transaction on error
    await db.query('ROLLBACK');
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
    const menuSql = 'SELECT * FROM Menu WHERE id = $1';
    const { rows: menuRows } = await db.query(menuSql, [menu_id]);
    
    if (menuRows.length === 0) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Get dishes organized by sections with images
    const dishesSql = `
      SELECT 
        s.id as section_id, s.name as section_name,
        d.id as dish_id, d.name as dish_name, d.description, d.price,
        di.image_url
      FROM Section s
      LEFT JOIN Dish d ON s.id = d.section_id AND d.menu_id = $1
      LEFT JOIN DishImage di ON d.id = di.dish_id
      ORDER BY s.name, d.name
    `;
    const { rows: dishesRows } = await db.query(dishesSql, [menu_id]);

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
        } else if (row.image_url) {
          existingDish.images.push(row.image_url);
        }
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

// Add this new endpoint to your menu router (menu.js)

// Create menu from existing with modifications
router.post('/create-from-existing', authenticateToken, async (req, res) => {
  console.log('POST /api/menu/create-from-existing - Request received');
  console.log('Request body:', req.body);
  
  const { name, date, dishes } = req.body;

  if (!name || !date || !dishes) {
    return res.status(400).json({ error: 'Name, date, and dishes are required' });
  }

  try {
    await db.query('START TRANSACTION');

    // 1. Create the new menu
    const menuResult = await db.query(
      'INSERT INTO Menu (name, date) VALUES ($1, $2) RETURNING id',
      [name, date]
    );
    const newMenuId = menuResult.rows[0].id;

    // 2. Get all sections for mapping categories
    const { rows: sections } = await db.query('SELECT * FROM Section');
    const sectionMap = {};
    sections.forEach(section => {
      sectionMap[section.name] = section.id;
    });

    // 3. Process each dish
    let dishesCreated = 0;
    for (const dish of dishes) {
      // Map category to section_id
      const sectionId = sectionMap[dish.category];
      if (!sectionId) {
        console.warn(`Section not found for category: ${dish.category}`);
        continue;
      }

      // Insert the dish
      const dishResult = await db.query(
        'INSERT INTO Dish (name, description, price, section_id, menu_id) VALUES ($1, $2, $3, $4, $5)',
        [dish.name, dish.description, dish.price, sectionId, newMenuId]
      );
      
      const newDishId = dishResult.rows[0].id;
      
      // If dish has an image and it's not a new dish, we might want to copy the image
      // For now, we'll skip image copying as it's complex with different storage systems
      // You can implement image copying logic here if needed
      
      dishesCreated++;
    }

    await db.query('COMMIT');
    
    console.log(`✅ Successfully created menu with ${dishesCreated} dishes`);
    res.status(201).json({ 
      message: 'Menu created successfully from existing menu',
      menu_id: newMenuId,
      dishes_created: dishesCreated
    });
    
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('❌ Error in POST /api/menu/create-from-existing:', err);
    
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Menu for this date already exists' });
    } else {
      res.status(500).json({ 
        error: 'Failed to create menu from existing',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
});

// Alternative approach: Enhanced copy endpoint that supports modifications
router.post('/copy-with-modifications', authenticateToken, async (req, res) => {
  console.log('POST /api/menu/copy-with-modifications - Request received');
  console.log('Request body:', req.body);
  
  const { source_menu_id, new_date, new_name, dish_modifications, new_dishes } = req.body;

  if (!source_menu_id || !new_date) {
    return res.status(400).json({ error: 'Source menu ID and new date are required' });
  }

  try {
    await db.query('START TRANSACTION');

    // Get source menu info
    const { rows: sourceMenu } = await db.query('SELECT * FROM Menu WHERE id = $1', [source_menu_id]);
    if (sourceMenu.length === 0) {
      throw new Error('Source menu not found');
    }

    // Create new menu
    const menuName = new_name || `${sourceMenu[0].name} - Copy`;
    const newMenuResult = await db.query(
      'INSERT INTO Menu (name, date) VALUES ($1, $2) RETURNING id',
      [menuName, new_date]
    );
    const new_menu_id = newMenuResult.rows[0].id;

    // Get original dishes
    const { rows: originalDishes } = await db.query('SELECT * FROM Dish WHERE menu_id = $1', [source_menu_id]);
    
    let dishesProcessed = 0;
    const modificationMap = {};
    
    // Create modification lookup map
    if (dish_modifications) {
      dish_modifications.forEach(mod => {
        modificationMap[mod.original_dish_id] = mod;
      });
    }

    // Process original dishes with modifications
    for (const dish of originalDishes) {
      const modification = modificationMap[dish.id];
      
      // Skip if dish is marked for deletion
      if (modification && modification.action === 'delete') {
        continue;
      }
      
      // Apply modifications or use original data
      const dishData = modification && modification.action === 'modify' ? {
        name: modification.name || dish.name,
        description: modification.description || dish.description,
        price: modification.price || dish.price,
        section_id: modification.section_id || dish.section_id
      } : {
        name: dish.name,
        description: dish.description,
        price: dish.price,
        section_id: dish.section_id
      };

      await db.query(
        'INSERT INTO Dish (name, description, price, section_id, menu_id) VALUES ($1, $2, $3, $4, $5)',
        [dishData.name, dishData.description, dishData.price, dishData.section_id, new_menu_id]
      );
      
      dishesProcessed++;
    }

    // Add new dishes
    if (new_dishes && new_dishes.length > 0) {
      // Get sections for mapping
      const { rows: sections } = await db.query('SELECT * FROM Section');
      const sectionMap = {};
      sections.forEach(section => {
        sectionMap[section.name] = section.id;
      });

      for (const newDish of new_dishes) {
        const sectionId = sectionMap[newDish.category] || sectionMap[Object.keys(sectionMap)[0]];
        
        await db.query(
          'INSERT INTO Dish (name, description, price, section_id, menu_id) VALUES ($1, $2, $3, $4, $5)',
          [newDish.name, newDish.description, newDish.price, sectionId, new_menu_id]
        );
        
        dishesProcessed++;
      }
    }

    await db.query('COMMIT');
    
    res.status(201).json({ 
      message: 'Menu copied with modifications successfully',
      new_menu_id,
      dishes_processed: dishesProcessed
    });
    
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error in POST /api/menu/copy-with-modifications:', err);
    res.status(500).json({ 
      error: 'Failed to copy menu with modifications', 
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Copy menu to new date
router.post('/copy', authenticateToken, async (req, res) => {
  console.log('POST /api/menu/copy - Request received');
  console.log('Request body:', req.body);
  
  const { source_menu_id, new_date, new_name } = req.body;

  if (!source_menu_id || !new_date) {
    return res.status(400).json({ error: 'Source menu ID and new date are required' });
  }

  try {
    await db.query('START TRANSACTION');

    // Get source menu info
    const { rows: sourceMenu } = await db.query('SELECT * FROM Menu WHERE id = $1', [source_menu_id]);
    if (sourceMenu.length === 0) {
      throw new Error('Source menu not found');
    }

    // Create new menu
    const menuName = new_name || `${sourceMenu[0].name} - Copy`;
    const newMenuResult = await db.query(
      'INSERT INTO Menu (name, date) VALUES ($1, $2) RETURNING id',
      [menuName, new_date]
    );
    const new_menu_id = newMenuResult.rows[0].id;

    // Copy all dishes
    const { rows: dishes } = await db.query('SELECT * FROM Dish WHERE menu_id = $1', [source_menu_id]);
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



module.exports = router;