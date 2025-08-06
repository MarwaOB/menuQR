const express = require('express');
const router = express.Router();
const db = require('../db');
const streamifier = require('streamifier');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// ======================
// ANALYTICS & REPORTS
// ======================

// Get order statistics for a restaurant
router.get('/:restaurant_id/analytics/orders', async (req, res) => {
  console.log('GET /api/restaurants/:restaurant_id/analytics/orders - Request received');
  
  const { restaurant_id } = req.params;
  const { start_date, end_date } = req.query;
  
  try {
    let sql = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN o.status = 'preparing' THEN 1 END) as preparing_orders,
        COUNT(CASE WHEN o.status = 'served' THEN 1 END) as served_orders,
        COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN o.client_type = 'internal' THEN 1 END) as internal_orders,
        COUNT(CASE WHEN o.client_type = 'external' THEN 1 END) as external_orders
      FROM \`Order\` o
      JOIN Menu m ON o.menu_id = m.id
      WHERE m.restaurant_id = ?
    `;
    const params = [restaurant_id];

    if (start_date && end_date) {
      sql += ' AND DATE(o.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    const [rows] = await db.query(sql, params);
    
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error in GET /api/restaurants/:restaurant_id/analytics/orders:', err);
    res.status(500).json({ error: 'Failed to fetch order analytics', details: err.message });
  }
});

// Get popular dishes for a restaurant
router.get('/:restaurant_id/analytics/popular_dishes', async (req, res) => {
  console.log('GET /api/restaurants/:restaurant_id/analytics/popular_dishes - Request received');
  
  const { restaurant_id } = req.params;
  const { limit = 10 } = req.query;
  
  try {
    const sql = `
      SELECT 
        d.id, d.name, d.description, d.price,
        s.name as section_name,
        SUM(oi.quantity) as total_ordered,
        COUNT(DISTINCT o.id) as times_ordered
      FROM Dish d
      JOIN Section s ON d.section_id = s.id
      JOIN OrderItem oi ON d.id = oi.dish_id
      JOIN \`Order\` o ON oi.order_id = o.id
      JOIN Menu m ON o.menu_id = m.id
      WHERE m.restaurant_id = ? AND o.status != 'cancelled'
      GROUP BY d.id
      ORDER BY total_ordered DESC
      LIMIT ?
    `;
    
    const [rows] = await db.query(sql, [restaurant_id, parseInt(limit)]);
    
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/restaurants/:restaurant_id/analytics/popular_dishes:', err);
    res.status(500).json({ error: 'Failed to fetch popular dishes', details: err.message });
  }
});

// Get daily revenue for a restaurant
router.get('/:restaurant_id/analytics/revenue', async (req, res) => {
  console.log('GET /api/restaurants/:restaurant_id/analytics/revenue - Request received');
  
  const { restaurant_id } = req.params;
  const { start_date, end_date } = req.query;
  
  try {
    let sql = `
      SELECT 
        DATE(o.created_at) as order_date,
        SUM(d.price * oi.quantity) as daily_revenue,
        COUNT(DISTINCT o.id) as orders_count
      FROM \`Order\` o
      JOIN Menu m ON o.menu_id = m.id
      JOIN OrderItem oi ON o.id = oi.order_id
      JOIN Dish d ON oi.dish_id = d.id
      WHERE m.restaurant_id = ? AND o.status = 'served'
    `;
    const params = [restaurant_id];

    if (start_date && end_date) {
      sql += ' AND DATE(o.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    sql += ' GROUP BY DATE(o.created_at) ORDER BY order_date DESC';

    const [rows] = await db.query(sql, params);
    
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/restaurants/:restaurant_id/analytics/revenue:', err);
    res.status(500).json({ error: 'Failed to fetch revenue analytics', details: err.message });
  }
});


// ======================
// CUSTOMER FEEDBACK & RATINGS
// ======================

// Rate a dish (simplified rating system)
router.post('/dishes/rate', async (req, res) => {
  console.log('POST /api/restaurants/dishes/rate - Request received');
  console.log('Request body:', req.body);
  
  const { dish_id, rating, comment, client_id, client_type } = req.body;

  if (!dish_id || !rating || !client_id || !client_type) {
    return res.status(400).json({ error: 'Dish ID, rating, client ID and client type are required' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    // Create a simple rating table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS DishRating (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dish_id INT,
        rating INT CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        client_id INT,
        client_type ENUM('internal', 'external'),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dish_id) REFERENCES Dish(id) ON DELETE CASCADE
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
    `);

    const sql = 'INSERT INTO DishRating (dish_id, rating, comment, client_id, client_type) VALUES (?, ?, ?, ?, ?)';
    await db.query(sql, [dish_id, rating, comment, client_id, client_type]);
    
    res.status(201).json({ message: 'Rating submitted successfully' });
  } catch (err) {
    console.error('Error in POST /api/restaurants/dishes/rate:', err);
    res.status(500).json({ error: 'Failed to submit rating', details: err.message });
  }
});

// Get dish ratings and average
router.get('/dishes/:dish_id/ratings', async (req, res) => {
  console.log('GET /api/restaurants/dishes/:dish_id/ratings - Request received');
  
  const { dish_id } = req.params;
  
  try {
    const ratingsSql = `
      SELECT 
        dr.rating, dr.comment, dr.created_at, dr.client_type,
        CASE 
          WHEN dr.client_type = 'internal' THEN CONCAT('Table ', ic.table_number)
          ELSE 'Delivery Customer'
        END as client_info
      FROM DishRating dr
      LEFT JOIN InternalClient ic ON dr.client_id = ic.id AND dr.client_type = 'internal'
      WHERE dr.dish_id = ?
      ORDER BY dr.created_at DESC
    `;

    const avgSql = `
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_ratings,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM DishRating 
      WHERE dish_id = ?
    `;

    const [ratingsRows] = await db.query(ratingsSql, [dish_id]);
    const [avgRows] = await db.query(avgSql, [dish_id]);
    
    res.status(200).json({
      ratings: ratingsRows,
      statistics: avgRows[0]
    });
  } catch (err) {
    console.error('Error in GET /api/restaurants/dishes/:dish_id/ratings:', err);
    res.status(500).json({ error: 'Failed to fetch dish ratings', details: err.message });
  }
});

module.exports = router;