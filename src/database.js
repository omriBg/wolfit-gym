// src/database.js
const { Pool } = require('pg');
require('dotenv').config();

// יצירת pool של חיבורים
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// פונקציה לבדיקת חיבור
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ חיבור למסד הנתונים הצליח!');
    client.release();
  } catch (err) {
    console.error('❌ שגיאה בחיבור למסד הנתונים:', err);
  }
}

module.exports = {
  pool,
  testConnection
};