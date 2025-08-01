require('dotenv').config()

const mysql = require("mysql2");
// creating a pool of connections to mysql db
const pool = mysql.createPool({host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
// Export promise-based version for async/await
module.exports = pool.promise();