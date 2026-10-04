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

// Additive, idempotent schema updates needed by the current code.
// (Password reset columns were referenced by the auth routes but missing from the schema.)
const ensureSchema = async () => {
  await pool.query(`
    ALTER TABLE Restaurant
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP WITH TIME ZONE
  `);
};

// Test the connection
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err);
  } else {
    console.log('Successfully connected to PostgreSQL database');
    ensureSchema().catch((schemaErr) => console.error('Error applying schema updates:', schemaErr));
  }
});

/**
 * Run `fn(client)` inside a real transaction on a single connection.
 * (BEGIN/COMMIT through pool.query can land on different connections.)
 */
pool.withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
};

// Export the pool for use in other modules
module.exports = pool;
