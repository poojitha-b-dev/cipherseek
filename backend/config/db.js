// backend/config/db.js
const mysql = require('mysql2');
require('dotenv').config();

// Use a connection POOL instead of a single connection.
// - Survives dropped connections (Railway's MySQL goes idle and closes them)
// - Supports both .query(sql, params, callback) AND .promise().query(...)
//   so authRoutes.js and documentRoutes.js both work without any changes.
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'secure_docs',
  port:     Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

// Verify connectivity at startup so Railway logs show a clear message
pool.getConnection((err, conn) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to the database (pool)');
    conn.release();
  }
});

// Export the pool — it has both .query() (callback) and .promise().query()
module.exports = pool;
