const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'secure_docs',
  port: 3306,
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('✅ Connected to the database');
  }
});

module.exports = connection;

