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

// ======================
// CLIENT MANAGEMENT
// ======================

// Add internal client (table)
router.post('/clients/internal/add', async (req, res) => {
  console.log('POST /api/order/clients/internal/add - Request received');
  console.log('Request body:', req.body);
  
  const { table_number } = req.body;

  if (!table_number) {
    return res.status(400).json({ error: 'Table number is required' });
  }

  try {
    // Generate session token
    const session_token = jwt.sign(
      { table_number, type: 'internal' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    const sql = 'INSERT INTO InternalClient (table_number, session_token) VALUES (?, ?)';
    const result = await db.query(sql, [table_number, session_token]);
    
    res.status(201).json({ 
      message: 'Internal client created successfully', 
      client_id: result[0].insertId,
      session_token
    });
  } catch (err) {
    console.error('Error in POST /api/order/clients/internal/add:', err);
    res.status(500).json({ error: 'Failed to create internal client', details: err.message });
  }
});

// Add external client
router.post('/clients/external/add', async (req, res) => {
  console.log('POST /api/order/clients/external/add - Request received');
  console.log('Request body:', req.body);
  
  const { address, phone_number } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    // Generate session token
    const session_token = jwt.sign(
      { address, type: 'external' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    const sql = 'INSERT INTO ExternalClient (address, phone_number, session_token) VALUES (?, ?, ?)';
    const result = await db.query(sql, [address, phone_number, session_token]);
    
    res.status(201).json({ 
      message: 'External client created successfully', 
      client_id: result[0].insertId,
      session_token
    });
  } catch (err) {
    console.error('Error in POST /api/order/clients/external/add:', err);
    res.status(500).json({ error: 'Failed to create external client', details: err.message });
  }
});

// Get all internal clients
router.get('/clients/internal', async (req, res) => {
  console.log('GET /api/order/clients/internal - Request received');
  
  try {
    const sql = 'SELECT * FROM InternalClient ORDER BY table_number';
    const [rows] = await db.query(sql);
    
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/order/clients/internal:', err);
    res.status(500).json({ error: 'Failed to fetch internal clients', details: err.message });
  }
});

// Get all external clients
router.get('/clients/external', async (req, res) => {
  console.log('GET /api/order/clients/external - Request received');
  
  try {
    const sql = 'SELECT * FROM ExternalClient ORDER BY created_at DESC';
    const [rows] = await db.query(sql);
    
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/order/clients/external:', err);
    res.status(500).json({ error: 'Failed to fetch external clients', details: err.message });
  }
});

// Delete internal client
router.post('/clients/internal/delete', async (req, res) => {
  console.log('POST /api/order/clients/internal/delete - Request received');
  console.log('Request body:', req.body);
  
  const { client_id } = req.body;

  if (!client_id) {
    return res.status(400).json({ error: 'Client ID is required' });
  }

  try {
    const sql = 'DELETE FROM InternalClient WHERE id=?';
    await db.query(sql, [client_id]);
    
    res.status(200).json({ message: 'Internal client deleted successfully' });
  } catch (err) {
    console.error('Error in POST /api/order/clients/internal/delete:', err);
    res.status(500).json({ error: 'Failed to delete internal client', details: err.message });
  }
});

// Delete external client
router.post('/clients/external/delete', async (req, res) => {
  console.log('POST /api/order/clients/external/delete - Request received');
  console.log('Request body:', req.body);
  
  const { client_id } = req.body;

  if (!client_id) {
    return res.status(400).json({ error: 'Client ID is required' });
  }

  try {
    const sql = 'DELETE FROM ExternalClient WHERE id=?';
    await db.query(sql, [client_id]);
    
    res.status(200).json({ message: 'External client deleted successfully' });
  } catch (err) {
    console.error('Error in POST /api/order/clients/external/delete:', err);
    res.status(500).json({ error: 'Failed to delete external client', details: err.message });
  }
});

// ======================
// ORDER MANAGEMENT
// ======================

// Create a new order
router.post('/add', async (req, res) => {
  console.log('POST /api/order/add - Request received');
  console.log('Request body:', req.body);
  
  const { menu_id, client_id, client_type, dishes } = req.body;

  if (!menu_id || !client_id || !client_type || !dishes || !Array.isArray(dishes)) {
    return res.status(400).json({ error: 'Menu ID, client ID, client type and dishes array are required' });
  }

  if (!['internal', 'external'].includes(client_type)) {
    return res.status(400).json({ error: 'Client type must be internal or external' });
  }

  try {
    // Start transaction
    await db.query('START TRANSACTION');

    // Create order
    const orderSql = client_type === 'internal' 
      ? 'INSERT INTO `Order` (menu_id, internal_client_id, client_type) VALUES (?, ?, ?)'
      : 'INSERT INTO `Order` (menu_id, external_client_id, client_type) VALUES (?, ?, ?)';
    
    const orderResult = await db.query(orderSql, [menu_id, client_id, client_type]);
    const order_id = orderResult[0].insertId;

    // Add order items
    for (const dish of dishes) {
      const { dish_id, quantity } = dish;
      if (!dish_id || !quantity) {
        throw new Error('Each dish must have dish_id and quantity');
      }
      
      await db.query(
        'INSERT INTO OrderItem (order_id, dish_id, quantity) VALUES (?, ?, ?)',
        [order_id, dish_id, quantity]
      );
    }

    await db.query('COMMIT');
    
    res.status(201).json({ 
      message: 'Order created successfully', 
      order_id 
    });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error in POST /api/order/add:', err);
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
});

// Get all orders for a restaurant
router.get('/allOrders', async (req, res) => {
  console.log('GET /api/order/allOrders - Request received');
  
  const { status, date } = req.query;
  
  try {
    let sql = `
      SELECT o.*, m.name as menu_name, m.date as menu_date,
             ic.table_number, ec.address, ec.phone_number
      FROM \`Order\` o
      JOIN Menu m ON o.menu_id = m.id
      LEFT JOIN InternalClient ic ON o.internal_client_id = ic.id
      LEFT JOIN ExternalClient ec ON o.external_client_id = ec.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (date) {
      sql += ' AND DATE(o.created_at) = ?';
      params.push(date);
    }

    sql += ' ORDER BY o.created_at DESC';

    const [rows] = await db.query(sql, params);

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/order/allOrders:', err);
    res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
  }
});

// Update order status
router.post('/update_status', async (req, res) => {
  console.log('POST /api/order/update_status - Request received');
  console.log('Request body:', req.body);
  
  const { order_id, status } = req.body;

  if (!order_id || !status) {
    return res.status(400).json({ error: 'Order ID and status are required' });
  }

  if (!['pending', 'preparing', 'served', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const sql = 'UPDATE `Order` SET status=? WHERE id=?';
    await db.query(sql, [status, order_id]);
    
    res.status(200).json({ message: 'Order status updated successfully' });
  } catch (err) {
    console.error('Error in POST /api/order/update_status:', err);
    res.status(500).json({ error: 'Failed to update order status', details: err.message });
  }
});

// Cancel order
router.post('/cancel', async (req, res) => {
  console.log('POST /api/order/cancel - Request received');
  console.log('Request body:', req.body);
  
  const { order_id } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    const sql = 'UPDATE `Order` SET status=? WHERE id=?';
    await db.query(sql, ['cancelled', order_id]);
    
    res.status(200).json({ message: 'Order cancelled successfully' });
  } catch (err) {
    console.error('Error in POST /api/order/cancel:', err);
    res.status(500).json({ error: 'Failed to cancel order', details: err.message });
  }
});

// Delete order (complete removal)
router.post('/delete', async (req, res) => {
  console.log('POST /api/order/delete - Request received');
  console.log('Request body:', req.body);
  
  const { order_id } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    const sql = 'DELETE FROM `Order` WHERE id=?';
    await db.query(sql, [order_id]);
    
    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (err) {
    console.error('Error in POST /api/order/delete:', err);
    res.status(500).json({ error: 'Failed to delete order', details: err.message });
  }
});

// Add item to existing order
router.post('/add_item', async (req, res) => {
  console.log('POST /api/order/add_item - Request received');
  console.log('Request body:', req.body);
  
  const { order_id, dish_id, quantity } = req.body;

  if (!order_id || !dish_id || !quantity) {
    return res.status(400).json({ error: 'Order ID, dish ID and quantity are required' });
  }

  try {
    // Check if item already exists in order
    const [existingItem] = await db.query('SELECT * FROM OrderItem WHERE order_id = ? AND dish_id = ?', [order_id, dish_id]);
    
    if (existingItem.length > 0) {
      // Update quantity
      await db.query('UPDATE OrderItem SET quantity = quantity + ? WHERE order_id = ? AND dish_id = ?', [quantity, order_id, dish_id]);
    } else {
      // Add new item
      await db.query('INSERT INTO OrderItem (order_id, dish_id, quantity) VALUES (?, ?, ?)', [order_id, dish_id, quantity]);
    }
    
    res.status(200).json({ message: 'Item added to order successfully' });
  } catch (err) {
    console.error('Error in POST /api/order/add_item:', err);
    res.status(500).json({ error: 'Failed to add item to order', details: err.message });
  }
});

// Remove item from order
router.post('/remove_item', async (req, res) => {
  console.log('POST /api/order/remove_item - Request received');
  console.log('Request body:', req.body);
  
  const { order_id, dish_id } = req.body;

  if (!order_id || !dish_id) {
    return res.status(400).json({ error: 'Order ID and dish ID are required' });
  }

  try {
    const sql = 'DELETE FROM OrderItem WHERE order_id=? AND dish_id=?';
    await db.query(sql, [order_id, dish_id]);
    
    res.status(200).json({ message: 'Item removed from order successfully' });
  } catch (err) {
    console.error('Error in POST /api/order/remove_item:', err);
    res.status(500).json({ error: 'Failed to remove item from order', details: err.message });
  }
});

// Update item quantity in order
router.post('/update_item_quantity', async (req, res) => {
  console.log('POST /api/order/update_item_quantity - Request received');
  console.log('Request body:', req.body);
  
  const { order_id, dish_id, quantity } = req.body;

  if (!order_id || !dish_id || quantity === undefined) {
    return res.status(400).json({ error: 'Order ID, dish ID and quantity are required' });
  }

  try {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      await db.query('DELETE FROM OrderItem WHERE order_id=? AND dish_id=?', [order_id, dish_id]);
    } else {
      // Update quantity
      await db.query('UPDATE OrderItem SET quantity=? WHERE order_id=? AND dish_id=?', [quantity, order_id, dish_id]);
    }
    
    res.status(200).json({ message: 'Item quantity updated successfully' });
  } catch (err) {
    console.error('Error in POST /api/order/update_item_quantity:', err);
    res.status(500).json({ error: 'Failed to update item quantity', details: err.message });
  }
});

// Get specific order with items
router.get('/:order_id', async (req, res) => {
  console.log('GET /api/order/:order_id - Request received');
  
  const { order_id } = req.params;
  
  try {
    // Get order info
    const orderSql = `
      SELECT o.*, m.name as menu_name, m.date as menu_date,
             ic.table_number, ec.address, ec.phone_number
      FROM \`Order\` o
      JOIN Menu m ON o.menu_id = m.id
      LEFT JOIN InternalClient ic ON o.internal_client_id = ic.id
      LEFT JOIN ExternalClient ec ON o.external_client_id = ec.id
      WHERE o.id = ?
    `;
    const [orderRows] = await db.query(orderSql, [order_id]);
    
    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items
    const itemsSql = `
      SELECT oi.*, d.name as dish_name, d.description, d.price, s.name as section_name
      FROM OrderItem oi
      JOIN Dish d ON oi.dish_id = d.id
      JOIN Section s ON d.section_id = s.id
      WHERE oi.order_id = ?
    `;
    const [itemsRows] = await db.query(itemsSql, [order_id]);

    const orderData = {
      ...orderRows[0],
      items: itemsRows
    };

    res.status(200).json(orderData);
  } catch (err) {
    console.error('Error in GET /api/order/:order_id:', err);
    res.status(500).json({ error: 'Failed to fetch order details', details: err.message });
  }
});

// ======================
// ADVANCED FEATURES
// ======================

// Get table status for internal clients
router.get('/tables/status', async (req, res) => {
  console.log('GET /api/order/tables/status - Request received');

  try {
    const sql = `
      SELECT 
        ic.id, ic.table_number, ic.created_at,
        COUNT(o.id) as active_orders,
        MAX(o.created_at) as last_order_time,
        CASE 
          WHEN COUNT(CASE WHEN o.status IN ('pending', 'preparing') THEN 1 END) > 0 THEN 'busy'
          WHEN COUNT(o.id) > 0 THEN 'occupied'
          ELSE 'available'
        END as table_status
      FROM InternalClient ic
      LEFT JOIN \`Order\` o ON ic.id = o.internal_client_id 
        AND o.client_type = 'internal' 
        AND DATE(o.created_at) = CURDATE()
      LEFT JOIN Menu m ON o.menu_id = m.id
      GROUP BY ic.id, ic.table_number
      ORDER BY ic.table_number
    `;

    const [rows] = await db.query(sql);

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/order/tables/status:', err);
    res.status(500).json({ error: 'Failed to fetch table status', details: err.message });
  }
});


// Get live kitchen orders (pending/preparing)
router.get('/kitchen/live_orders', async (req, res) => {
  console.log('GET /api/order/kitchen/live_orders - Request received');

  try {
    const sql = `
      SELECT 
        o.id as order_id, o.status, o.created_at, o.client_type,
        ic.table_number, ec.address,
        GROUP_CONCAT(
          CONCAT(d.name, ' x', oi.quantity) 
          ORDER BY d.name SEPARATOR ', '
        ) as order_items,
        SUM(d.price * oi.quantity) as total_amount
      FROM \`Order\` o
      JOIN Menu m ON o.menu_id = m.id
      LEFT JOIN InternalClient ic ON o.internal_client_id = ic.id
      LEFT JOIN ExternalClient ec ON o.external_client_id = ec.id
      JOIN OrderItem oi ON o.id = oi.order_id
      JOIN Dish d ON oi.dish_id = d.id
      WHERE o.status IN ('pending', 'preparing')
        AND DATE(o.created_at) = CURDATE()
      GROUP BY o.id
      ORDER BY o.created_at ASC
    `;

    const [rows] = await db.query(sql);

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/order/kitchen/live_orders:', err);
    res.status(500).json({ error: 'Failed to fetch live kitchen orders', details: err.message });
  }
});

// Get order queue with estimated wait times
router.get('/orders/queue', async (req, res) => {
  console.log('GET /api/order/orders/queue - Request received');

  try {
    const sql = `
      SELECT 
        o.id, o.status, o.created_at, o.client_type,
        ic.table_number, ec.address,
        COUNT(oi.id) as items_count,
        SUM(oi.quantity) as total_quantity,
        CASE 
          WHEN o.status = 'pending' THEN TIMESTAMPDIFF(MINUTE, o.created_at, NOW())
          WHEN o.status = 'preparing' THEN TIMESTAMPDIFF(MINUTE, o.created_at, NOW())
          ELSE 0
        END as wait_time_minutes
      FROM \`Order\` o
      JOIN Menu m ON o.menu_id = m.id
      LEFT JOIN InternalClient ic ON o.internal_client_id = ic.id
      LEFT JOIN ExternalClient ec ON o.external_client_id = ec.id
      JOIN OrderItem oi ON o.id = oi.order_id
      WHERE o.status IN ('pending', 'preparing')
        AND DATE(o.created_at) = CURDATE()
      GROUP BY o.id
      ORDER BY o.created_at ASC
    `;

    const [rows] = await db.query(sql);

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/order/orders/queue:', err);
    res.status(500).json({ error: 'Failed to fetch order queue', details: err.message });
  }
});

// ======================
// HELPER FUNCTIONS
// ======================

// Calculate order total helper
const calculateOrderTotal = async (order_id) => {
  try {
    const sql = `
      SELECT SUM(d.price * oi.quantity) as total
      FROM OrderItem oi
      JOIN Dish d ON oi.dish_id = d.id
      WHERE oi.order_id = ?
    `;
    const [rows] = await db.query(sql, [order_id]);
    return rows[0].total || 0;
  } catch (err) {
    console.error('Error calculating order total:', err);
    return 0;
  }
};


module.exports = router;