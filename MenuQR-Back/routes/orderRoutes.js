const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
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
// CLIENT MANAGEMENT
// ======================

// Add internal client (table)
// Add internal client (table)
router.post('/clients/internal/add', async (req, res) => {
  console.log('=== START: /api/order/clients/internal/add ===');
  console.log('1. Request received at:', new Date().toISOString());
  console.log('2. Request method:', req.method);
  console.log('3. Request URL:', req.originalUrl);
  console.log('4. Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('5. Request body:', req.body);
  
  try {
    const { table_number } = req.body;
    
    if (!table_number && table_number !== 0) {
      console.error('Error: Missing table_number in request');
      return res.status(400).json({ error: 'table_number is required' });
    }
    
    console.log('Processing table number:', table_number);
    
    // Generate session token
    const session_token = jwt.sign(
      { table_number, type: 'internal' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '12h' }
    );
    
    // Insert into database
    const { rows: [result] } = await db.query(
      'INSERT INTO InternalClient (table_number, session_token) VALUES ($1, $2) RETURNING id',
      [table_number, session_token]
    );
    
    console.log('Client created with ID:', result.id);
    
    return res.status(201).json({
      client_id: result.id,
      table_number,
      session_token,
      client_type: 'internal'
    });
    
  } catch (error) {
    console.error('Error in request processing:', error);
    
    // Handle duplicate table number error
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ 
        error: 'Table is already occupied',
        details: 'This table number is already in use by another client'
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Add external client
router.post('/clients/external/add', async (req, res) => {
  console.log('=== START: /api/order/clients/external/add ===');
  console.log('1. Request received at:', new Date().toISOString());
  console.log('2. Request body:', req.body);
  
  const { address, phone_number } = req.body;

  if (!address) {
    console.error('Error: Address is required');
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    // Generate session token
    const session_token = jwt.sign(
      { address, type: 'external' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Insert into database using PostgreSQL parameterized queries
    const { rows: [result] } = await db.query(
      'INSERT INTO ExternalClient (address, phone_number, session_token) VALUES ($1, $2, $3) RETURNING id',
      [address, phone_number, session_token]
    );
    
    console.log('External client created with ID:', result.id);
    
    res.status(201).json({ 
      message: 'External client created successfully', 
      client_id: result.id,
      session_token
    });
  } catch (err) {
    console.error('Error in POST /api/order/clients/external/add:', err);
    
    // Handle duplicate address error
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ 
        error: 'Address already exists',
        details: 'This address is already registered as an external client'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create external client', 
      details: err.message 
    });
  }
});

// Get all internal clients
router.get('/clients/internal', authenticateToken, async (req, res) => {
  console.log('GET /api/order/clients/internal - Request received');
  
  try {
    const sql = 'SELECT * FROM InternalClient ORDER BY table_number';
    const { rows: clients } = await db.query(sql);
    
    res.status(200).json(clients);
  } catch (err) {
    console.error('Error in GET /api/order/clients/internal:', err);
    res.status(500).json({ error: 'Failed to fetch internal clients', details: err.message });
  }
});

// Get all external clients
router.get('/clients/external', authenticateToken, async (req, res) => {
  console.log('GET /api/order/clients/external - Request received');
  
  try {
    const sql = 'SELECT * FROM ExternalClient ORDER BY created_at DESC';
    const { rows: clients } = await db.query(sql);
    
    res.status(200).json(clients);
  } catch (err) {
    console.error('Error in GET /api/order/clients/external:', err);
    res.status(500).json({ error: 'Failed to fetch external clients', details: err.message });
  }
});

// Delete internal client
router.post('/clients/internal/delete', authenticateToken, async (req, res) => {
  console.log('POST /api/order/clients/internal/delete - Request received');
  console.log('Request body:', req.body);
  
  const { client_id } = req.body;

  if (!client_id) {
    return res.status(400).json({ error: 'Client ID is required' });
  }

  try {
    const sql = 'DELETE FROM InternalClient WHERE id=$1';
    await db.query(sql, [client_id]);
    
    res.status(200).json({ message: 'Internal client deleted successfully' });
  } catch (err) {
    console.error('Error in POST /api/order/clients/internal/delete:', err);
    res.status(500).json({ error: 'Failed to delete internal client', details: err.message });
  }
});

// Delete external client
router.post('/clients/external/delete', authenticateToken, async (req, res) => {
  console.log('POST /api/order/clients/external/delete - Request received');
  console.log('Request body:', req.body);
  
  const { client_id } = req.body;

  if (!client_id) {
    return res.status(400).json({ error: 'Client ID is required' });
  }

  try {
    const sql = 'DELETE FROM ExternalClient WHERE id=$1';
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
      ? 'INSERT INTO ordertable (menu_id, internal_client_id, type, status) VALUES ($1, $2, $3, $4) RETURNING id'
      : 'INSERT INTO ordertable (menu_id, external_client_id, type, status) VALUES ($1, $2, $3, $4) RETURNING id';
    
    console.log('Creating order with SQL:', orderSql);
    console.log('Parameters:', [menu_id, client_id, client_type]);
    
    const { rows: [result] } = await db.query(orderSql, [menu_id, client_id, client_type, 'pending']);
    const order_id = result.id;
    console.log('Order created with ID:', order_id);

    // Add order items
    console.log('Adding order items:', dishes);
    for (const [index, dish] of dishes.entries()) {
      const { dish_id, quantity } = dish;
      if (!dish_id || !quantity) {
        throw new Error(`Dish at index ${index} is missing dish_id or quantity`);
      }
      
      console.log(`Adding dish ${index + 1}/${dishes.length}:`, { dish_id, quantity });
      
      await db.query(
        'INSERT INTO orderitem (order_id, dish_id, quantity, special_requests, status) VALUES ($1, $2, $3, $4, $5)',
        [order_id, dish_id, quantity, '', 'pending']
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
router.get('/allOrders', authenticateToken, async (req, res) => {
  console.log('GET /api/order/allOrders - Request received');
  
  const { status, date } = req.query;
  
  try {
    let sql = `
      SELECT o.*, 
             ic.table_number, 
             ec.address, 
             ec.phone_number,
             CASE 
               WHEN o.internal_client_id IS NOT NULL THEN 'Table ' || ic.table_number
               ELSE COALESCE(ec.address, 'N/A')
             END as customer_info
      FROM ordertable o
      LEFT JOIN InternalClient ic ON o.internal_client_id = ic.id
      LEFT JOIN ExternalClient ec ON o.external_client_id = ec.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND o.status = $1';
      params.push(status);
    }

    if (date) {
      sql += ' AND DATE(o.created_at) = $1';
      params.push(date);
    }

    sql += ' ORDER BY o.created_at DESC';

    const { rows } = await db.query(sql, params);

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/order/allOrders:', err);
    res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
  }
});

// Update order status
router.post('/update_status', authenticateToken, async (req, res) => {
  console.log('POST /api/order/update_status - Request received');
  console.log('Request body:', req.body);
  
  const { order_id, status } = req.body;

  if (!order_id || !status) {
    return res.status(400).json({ error: 'Order ID and status are required' });
  }

  if (!['pending', 'served', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const sql = 'UPDATE ordertable SET status=$1 WHERE id=$2';
    await db.query(sql, [status, order_id]);
    
    res.status(200).json({ message: 'Order status updated successfully' });
  } catch (err) {
    console.error('Error in POST /api/order/update_status:', err);
    res.status(500).json({ error: 'Failed to update order status', details: err.message });
  }
});

// Cancel order
router.post('/cancel', authenticateToken, async (req, res) => {
  console.log('POST /api/order/cancel - Request received');
  console.log('Request body:', req.body);
  
  const { order_id } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    const sql = 'UPDATE ordertable SET status=$1 WHERE id=$2';
    await db.query(sql, ['cancelled', order_id]);
    
    res.status(200).json({ message: 'Order cancelled successfully' });
  } catch (err) {
    console.error('Error in POST /api/order/cancel:', err);
    res.status(500).json({ error: 'Failed to cancel order', details: err.message });
  }
});

// Delete order (complete removal)
router.post('/delete', authenticateToken, async (req, res) => {
  console.log('POST /api/order/delete - Request received');
  console.log('Request body:', req.body);
  
  const { order_id } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    // Start a transaction to ensure data consistency
    await db.query('BEGIN');

    try {
      // First, delete all order items associated with this order
      await db.query('DELETE FROM orderitem WHERE order_id=$1', [order_id]);
      
      // Then delete the order itself
      await db.query('DELETE FROM ordertable WHERE id=$1', [order_id]);
      
      // Commit the transaction if both operations succeed
      await db.query('COMMIT');
      
      res.status(200).json({ message: 'Order and associated items deleted successfully' });
    } catch (err) {
      // If any error occurs, rollback the transaction
      await db.query('ROLLBACK');
      throw err; // Re-throw the error to be caught by the outer catch
    }
  } catch (err) {
    console.error('Error in POST /api/order/delete:', err);
    
    // Provide more specific error messages based on the error code
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(400).json({ 
        error: 'Cannot delete order because it is referenced by other records',
        details: 'Please ensure all related records are deleted first.'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to delete order', 
        details: err.message 
      });
    }
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
    const { rows: existingItem } = await db.query('SELECT * FROM OrderItem WHERE order_id=$1 AND dish_id=$2', [order_id, dish_id]);
    
    if (existingItem.length > 0) {
      // Update quantity
      await db.query('UPDATE OrderItem SET quantity=quantity+$1 WHERE order_id=$2 AND dish_id=$3', [quantity, order_id, dish_id]);
    } else {
      // Add new item
      await db.query('INSERT INTO OrderItem (order_id, dish_id, quantity) VALUES ($1, $2, $3)', [order_id, dish_id, quantity]);
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
    const sql = 'DELETE FROM OrderItem WHERE order_id=$1 AND dish_id=$2';
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
      await db.query('DELETE FROM OrderItem WHERE order_id=$1 AND dish_id=$2', [order_id, dish_id]);
    } else {
      // Update quantity
      await db.query('UPDATE OrderItem SET quantity=$1 WHERE order_id=$2 AND dish_id=$3', [quantity, order_id, dish_id]);
    }
    
    res.status(200).json({ message: 'Item quantity updated successfully' });
  } catch (err) {
    console.error('Error in POST /api/order/update_item_quantity:', err);
    res.status(500).json({ error: 'Failed to update item quantity', details: err.message });
  }
});

// Get specific order with items
router.get('/:order_id', authenticateToken, async (req, res) => {
  console.log('GET /api/order/:order_id - Request received');
  
  const { order_id } = req.params;
  
  try {
    // Get order info
    const orderSql = `
      SELECT o.*, m.name as menu_name, m.date as menu_date,
             ic.table_number, ec.address, ec.phone_number
      FROM ordertable o
      JOIN menu m ON o.menu_id = m.id
      LEFT JOIN internalclient ic ON o.internal_client_id = ic.id
      LEFT JOIN externalclient ec ON o.external_client_id = ec.id
      WHERE o.id = $1
    `;
    const { rows: orders } = await db.query(orderSql, [order_id]);
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items
    const itemsSql = `
      SELECT oi.*, d.name as dish_name, d.description, d.price, s.name as section_name
      FROM orderitem oi
      JOIN dish d ON oi.dish_id = d.id
      JOIN section s ON d.section_id = s.id
      WHERE oi.order_id = $1
    `;
    const { rows: items } = await db.query(itemsSql, [order_id]);

    const orderData = {
      ...orders[0],
      items
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
router.get('/tables/status', authenticateToken, async (req, res) => {
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
      LEFT JOIN "Order" o ON ic.id = o.internal_client_id 
        AND o.client_type = 'internal' 
        AND DATE(o.created_at) = CURDATE()
      LEFT JOIN Menu m ON o.menu_id = m.id
      GROUP BY ic.id, ic.table_number
      ORDER BY ic.table_number
    `;

    const { rows } = await db.query(sql);

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/order/tables/status:', err);
    res.status(500).json({ error: 'Failed to fetch table status', details: err.message });
  }
});

// Get live kitchen orders (pending/preparing)
router.get('/kitchen/live_orders', authenticateToken, async (req, res) => {
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
      FROM "Order" o
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

    const { rows } = await db.query(sql);

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/order/kitchen/live_orders:', err);
    res.status(500).json({ error: 'Failed to fetch live kitchen orders', details: err.message });
  }
});

// Get order queue with estimated wait times
router.get('/orders/queue', authenticateToken, async (req, res) => {
  console.log('GET /api/order/orders/queue - Request received');

  try {
    const sql = `
      SELECT 
        o.id, o.status, o.created_at, o.client_type,
        ic.table_number, ec.address, ec.phone_number
      FROM "Order" o
      JOIN Menu m ON o.menu_id = m.id
      LEFT JOIN InternalClient ic ON o.internal_client_id = ic.id
      LEFT JOIN ExternalClient ec ON o.external_client_id = ec.id
      WHERE o.status IN ('pending', 'preparing')
        AND DATE(o.created_at) = CURDATE()
      ORDER BY o.created_at ASC
    `;

    const { rows } = await db.query(sql);

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
async function calculateOrderTotal(order_id) {
  const { rows } = await db.query(
    'SELECT SUM(quantity * unit_price) as total FROM OrderItem WHERE order_id=$1',
    [order_id]
  );
  
  const total = rows[0].total || 0;
  
  await db.query(
    'UPDATE "Order" SET total_amount=$1 WHERE id=$2',
    [total, order_id]
  );
  
  return total;
}

module.exports = router;