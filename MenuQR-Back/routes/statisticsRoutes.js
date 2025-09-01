const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// ======================
// ANALYTICS & REPORTS
// ======================

// Get order analytics for a restaurant with period comparison
router.get('/analytics/orders', authenticateToken, async (req, res) => {
  console.log('GET /api/statistics/analytics/orders - Request received');
  
  const { start_date, end_date } = req.query;
  
  try {
    // Current period query
    let currentSql = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing_orders,
        COUNT(CASE WHEN status = 'served' THEN 1 END) as served_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN client_type = 'internal' THEN 1 END) as internal_orders,
        COUNT(CASE WHEN client_type = 'external' THEN 1 END) as external_orders
      FROM \`Order\`
    `;
    
    let currentParams = [];
    let previousSql = currentSql;
    let previousParams = [];

    if (start_date && end_date) {
      currentSql += ' WHERE DATE(created_at) BETWEEN ? AND ?';
      currentParams.push(start_date, end_date);
      
      // Calculate previous period dates
      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);
      const daysDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
      
      const prevEndDate = new Date(startDateObj);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
      
      previousSql += ' WHERE DATE(created_at) BETWEEN ? AND ?';
      previousParams.push(
        prevStartDate.toISOString().split('T')[0],
        prevEndDate.toISOString().split('T')[0]
      );
    }

    // Execute both queries
    const [currentRows] = await db.query(currentSql, currentParams);
    const [previousRows] = await db.query(previousSql, previousParams);
    
    const current = currentRows[0] || {
      total_orders: 0,
      pending_orders: 0,
      preparing_orders: 0,
      served_orders: 0,
      cancelled_orders: 0,
      internal_orders: 0,
      external_orders: 0
    };

    const previous = previousRows[0] || {
      total_orders: 0,
      pending_orders: 0,
      preparing_orders: 0,
      served_orders: 0,
      cancelled_orders: 0,
      internal_orders: 0,
      external_orders: 0
    };

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const result = {
      ...current,
      changes: {
        total_orders: calculateChange(current.total_orders, previous.total_orders),
        internal_orders: calculateChange(current.internal_orders, previous.internal_orders),
        external_orders: calculateChange(current.external_orders, previous.external_orders)
      }
    };
    
    res.status(200).json(result);
  } catch (err) {
    console.error('Error in GET /api/statistics/analytics/orders:', err);
    res.status(500).json({ error: 'Failed to fetch order analytics', details: err.message });
  }
});

// Get popular dishes analytics
router.get('/analytics/popular_dishes', authenticateToken, async (req, res) => {
  console.log('GET /api/statistics/analytics/popular_dishes - Request received');
  
  const { limit = 10 } = req.query;
  
  try {
    const sql = `
      SELECT 
        d.id, d.name, d.description, d.price,
        s.name as section_name,
        COALESCE(SUM(oi.quantity), 0) as total_ordered,
        COUNT(DISTINCT o.id) as times_ordered
      FROM Dish d
      JOIN Section s ON d.section_id = s.id
      LEFT JOIN OrderItem oi ON d.id = oi.dish_id
      LEFT JOIN \`Order\` o ON oi.order_id = o.id AND o.status != 'cancelled'
      GROUP BY d.id, d.name, d.description, d.price, s.name
      ORDER BY total_ordered DESC, times_ordered DESC
      LIMIT ?
    `;
    
    const [rows] = await db.query(sql, [parseInt(limit)]);
    
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error in GET /api/statistics/analytics/popular_dishes:', err);
    res.status(500).json({ error: 'Failed to fetch popular dishes', details: err.message });
  }
});

// Get revenue analytics with period comparison
router.get('/analytics/revenue', authenticateToken, async (req, res) => {
  console.log('GET /api/statistics/analytics/revenue - Request received');
  
  const { start_date, end_date } = req.query;
  
  try {
    // Current period revenue
    let currentSql = `
      SELECT 
        DATE(o.created_at) as order_date,
        COALESCE(SUM(d.price * oi.quantity), 0) as daily_revenue,
        COUNT(DISTINCT o.id) as orders_count
      FROM \`Order\` o
      JOIN OrderItem oi ON o.id = oi.order_id
      JOIN Dish d ON oi.dish_id = d.id
      WHERE o.status = 'served'
    `;
    
    let totalRevenueSql = `
      SELECT COALESCE(SUM(d.price * oi.quantity), 0) as total_revenue
      FROM \`Order\` o
      JOIN OrderItem oi ON o.id = oi.order_id
      JOIN Dish d ON oi.dish_id = d.id
      WHERE o.status = 'served'
    `;
    
    let currentParams = [];
    let totalCurrentParams = [];
    let totalPreviousParams = [];

    if (start_date && end_date) {
      currentSql += ' AND DATE(o.created_at) BETWEEN ? AND ?';
      currentParams.push(start_date, end_date);
      
      totalRevenueSql += ' AND DATE(o.created_at) BETWEEN ? AND ?';
      totalCurrentParams.push(start_date, end_date);
      
      // Calculate previous period for total revenue comparison
      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);
      const daysDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
      
      const prevEndDate = new Date(startDateObj);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
      
      const previousRevenueSql = totalRevenueSql.replace(
        'AND DATE(o.created_at) BETWEEN ? AND ?',
        'AND DATE(o.created_at) BETWEEN ? AND ?'
      );
      
      totalPreviousParams.push(
        prevStartDate.toISOString().split('T')[0],
        prevEndDate.toISOString().split('T')[0]
      );
    }

    currentSql += ' GROUP BY DATE(o.created_at) ORDER BY order_date DESC';

    // Execute queries
    const [dailyRows] = await db.query(currentSql, currentParams);
    const [currentRevenueRows] = await db.query(totalRevenueSql, totalCurrentParams);
    
    let revenueChange = 0;
    if (start_date && end_date && totalPreviousParams.length > 0) {
      const previousRevenueSql = `
        SELECT COALESCE(SUM(d.price * oi.quantity), 0) as total_revenue
        FROM \`Order\` o
        JOIN OrderItem oi ON o.id = oi.order_id
        JOIN Dish d ON oi.dish_id = d.id
        WHERE o.status = 'served' AND DATE(o.created_at) BETWEEN ? AND ?
      `;
      
      const [previousRevenueRows] = await db.query(previousRevenueSql, totalPreviousParams);
      
      const currentTotal = currentRevenueRows[0]?.total_revenue || 0;
      const previousTotal = previousRevenueRows[0]?.total_revenue || 0;
      
      if (previousTotal > 0) {
        revenueChange = ((currentTotal - previousTotal) / previousTotal) * 100;
      } else if (currentTotal > 0) {
        revenueChange = 100;
      }
    }
    
    res.status(200).json({
      daily_data: dailyRows,
      total_revenue: currentRevenueRows[0]?.total_revenue || 0,
      revenue_change: revenueChange
    });
  } catch (err) {
    console.error('Error in GET /api/statistics/analytics/revenue:', err);
    res.status(500).json({ error: 'Failed to fetch revenue analytics', details: err.message });
  }
});

module.exports = router;