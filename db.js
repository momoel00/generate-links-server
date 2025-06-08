const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'srv1736.hstgr.io',
  user: 'u499540832_admin',
  password: 'SiMo1992@@',
  database: 'u499540832_admin',
  port: 3306,
});

db.connect((err) => {
  if (err) {
    console.error('❌ MySQL connection error:', err);
    return;
  }
  console.log('✅ MySQL connected!');
});

module.exports = db;
