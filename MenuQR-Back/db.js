require('dotenv').config();

const { Pool } = require('pg');

// Create a pool of connections to PostgreSQL db
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432, // Default PostgreSQL port,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase
  },
});

// Test the connection
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err);
  } else {
    console.log('Successfully connected to PostgreSQL database');
  }
});

// Export the pool for use in other modules
module.exports = pool;