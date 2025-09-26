// utils/database.js - ניהול חיבורי מסד נתונים מתקדם
const { Pool } = require('pg');
const logger = require('./logger');

// הגדרות connection pooling מתקדמות
const dbConfig = {
  host: process.env.DB_HOST,
  // Force IPv4
  family: 4,
  // Force IPv4 for DNS resolution
  hostaddr: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // הגדרות connection pooling
  max: 20, // מקסימום חיבורים ב-pool
  min: 2,  // מינימום חיבורים ב-pool
  idleTimeoutMillis: 30000, // זמן המתנה לפני סגירת חיבור לא פעיל
  connectionTimeoutMillis: 2000, // timeout לחיבור חדש
  acquireTimeoutMillis: 60000, // timeout לקבלת חיבור מה-pool
  
  // הגדרות SSL
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    
  // הגדרות נוספות לביצועים
  statement_timeout: 30000, // 30 שניות timeout לשאילתות
  query_timeout: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  
};

// יצירת pool
const pool = new Pool(dbConfig);

// Event listeners לניטור ה-pool
pool.on('connect', (client) => {
  logger.info('חיבור חדש למסד נתונים נוצר', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('acquire', (client) => {
  logger.debug('חיבור נרכש מה-pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('remove', (client) => {
  logger.info('חיבור הוסר מה-pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('error', (err, client) => {
  logger.error('שגיאה ב-pool של מסד הנתונים:', {
    error: err.message,
    code: err.code,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

// פונקציה לבדיקת חיבור
const testConnection = async () => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      logger.info('בדיקת חיבור למסד נתונים הצליחה', {
        currentTime: result.rows[0].current_time,
        version: result.rows[0].version.split(' ')[0]
      });
      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn('מסד הנתונים לא זמין:', err.message);
    return { success: false, error: err.message };
  }
};

// פונקציה לביצוע שאילתה עם timeout
const queryWithTimeout = async (text, params, timeoutMs = 30000) => {
  const client = await pool.connect();
  try {
    // הגדרת timeout לשאילתה
    await client.query(`SET statement_timeout = ${timeoutMs}`);
    
    const startTime = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - startTime;
    
    logger.debug('שאילתה בוצעה בהצלחה', {
      duration: `${duration}ms`,
      rowCount: result.rowCount,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    });
    
    return result;
  } catch (err) {
    logger.error('שגיאה בביצוע שאילתה:', {
      error: err.message,
      code: err.code,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params: params
    });
    throw err;
  } finally {
    client.release();
  }
};

// פונקציה לביצוע transaction
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Transaction נכשל, בוצע rollback:', err);
    throw err;
  } finally {
    client.release();
  }
};

// פונקציה לניקוי ה-pool
const closePool = async () => {
  try {
    await pool.end();
    logger.info('Pool של מסד הנתונים נסגר בהצלחה');
  } catch (err) {
    logger.error('שגיאה בסגירת pool של מסד הנתונים:', err);
  }
};

// פונקציה לקבלת סטטיסטיקות ה-pool
const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('מקבל SIGINT, סוגר חיבורי מסד נתונים...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('מקבל SIGTERM, סוגר חיבורי מסד נתונים...');
  await closePool();
  process.exit(0);
});

module.exports = {
  pool,
  testConnection,
  queryWithTimeout,
  withTransaction,
  closePool,
  getPoolStats
};
