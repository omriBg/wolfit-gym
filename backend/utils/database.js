// utils/database.js - ניהול חיבורי מסד נתונים מתקדם
const { Pool } = require('pg');
const logger = require('./logger');

// הגדרות connection pooling מתקדמות
let dbConfig;

if (process.env.DATABASE_URL) {
  // וודא שאנחנו משתמשים ב-postgresql:// ולא postgres://
  let connectionString = process.env.DATABASE_URL;
  if (connectionString.startsWith('postgres://')) {
    connectionString = connectionString.replace('postgres://', 'postgresql://');
  }

  // הסר sslmode=verify-full אם קיים
  connectionString = connectionString.replace('?sslmode=verify-full', '');
  connectionString = connectionString.replace('?sslmode=prefer', '');
  
  // הוסף sslmode=require
  if (!connectionString.includes('sslmode=')) {
    connectionString += '?sslmode=require';
  }

  dbConfig = {
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    // הגדרות connection pooling
    max: 10,
    min: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    // הגדרות נוספות לחיבור יציב
    keepAlive: true,
    keepAliveInitialDelayMillis: 0
  };
} else {
  // משתנים נפרדים
  dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false
    },
    // הגדרות connection pooling
    max: 10,
    min: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    // הגדרות נוספות לחיבור יציב
    keepAlive: true,
    keepAliveInitialDelayMillis: 0
  };
}

// Log connection details (without password)
console.log('🔌 Database connection details:', {
  connectionString: dbConfig.connectionString ? '***HIDDEN***' : undefined,
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  ssl: dbConfig.ssl,
  maxConnections: dbConfig.max,
  minConnections: dbConfig.min
});

// יצירת pool ישירות ללא בדיקות
const pool = new Pool(dbConfig);

// פונקציה לחיבור event listeners
function setupPoolEventListeners(poolInstance) {
  poolInstance.on('connect', (client) => {
    logger.info('חיבור חדש למסד נתונים נוצר', {
      totalCount: poolInstance.totalCount,
      idleCount: poolInstance.idleCount,
      waitingCount: poolInstance.waitingCount
    });
  });

  poolInstance.on('acquire', (client) => {
    logger.debug('חיבור נרכש מה-pool', {
      totalCount: poolInstance.totalCount,
      idleCount: poolInstance.idleCount,
      waitingCount: poolInstance.waitingCount
    });
  });

  poolInstance.on('remove', (client) => {
    logger.info('חיבור הוסר מה-pool', {
      totalCount: poolInstance.totalCount,
      idleCount: poolInstance.idleCount,
      waitingCount: poolInstance.waitingCount
    });
  });

  poolInstance.on('error', (err, client) => {
    logger.error('שגיאה ב-pool של מסד הנתונים:', {
      error: err.message,
      code: err.code,
      totalCount: poolInstance.totalCount,
      idleCount: poolInstance.idleCount,
      waitingCount: poolInstance.waitingCount
    });
  });
}

// הגדר event listeners
setupPoolEventListeners(pool);

// פונקציה להמתנה ל-pool להיות מוכן
const waitForPoolReady = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Pool מוכן לשימוש');
    return pool;
  } catch (error) {
    console.error('❌ Pool connection test failed:', error.message);
    throw error;
  }
};

// פונקציה לבדיקת חיבור
const testConnection = async () => {
  try {
    console.log('🔍 מנסה להתחבר למסד נתונים...');
    const client = await pool.connect();
    console.log('✅ התחבר למסד נתונים, מבצע שאילתה...');
    try {
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      console.log('✅ שאילתה הצליחה:', result.rows[0]);
      logger.info('בדיקת חיבור למסד נתונים הצליחה', {
        currentTime: result.rows[0].current_time,
        version: result.rows[0].version.split(' ')[0]
      });
      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ שגיאה בחיבור למסד נתונים:', err);
    logger.warn('מסד הנתונים לא זמין:', err.message);
    return { success: false, error: err.message };
  }
};

// פונקציה לביצוע שאילתה עם timeout
const queryWithTimeout = async (text, params, timeoutMs = 30000) => {
  console.log('🔍 Attempting database query:', {
    query: text,
    params: params,
    timeout: timeoutMs
  });

  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to database successfully');
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    throw err;
  }

  try {
    // הגדרת timeout לשאילתה
    await client.query(`SET statement_timeout = ${timeoutMs}`);
    console.log('✅ Set query timeout');
    
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
  waitForPoolReady,
  queryWithTimeout,
  withTransaction,
  closePool,
  getPoolStats
};