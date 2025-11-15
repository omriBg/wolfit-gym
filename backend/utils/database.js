// utils/database.js - ניהול חיבורי מסד נתונים מתקדם
const { Pool } = require('pg');
const logger = {
  info: console.log,
  debug: console.log,
  error: console.error,
  warn: console.warn
};

// הגדרות connection pooling מתקדמות
let dbConfig;

if (process.env.DATABASE_URL) {
  let connectionString = process.env.DATABASE_URL;
  
  // וידוא שה-URL כולל sslmode=require עבור Supabase
  if (!connectionString.includes('sslmode=')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
  }
  
  console.log('🔧 Using Supabase connection string');
  console.log('🔧 Connection string with SSL mode:', connectionString.replace(/:[^:@]+@/, ':****@'));
  
  dbConfig = {
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false,
      require: true
    },
    // הגדרות connection pooling
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    acquireTimeoutMillis: 60000,
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
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    acquireTimeoutMillis: 60000,
    // הגדרות נוספות לחיבור יציב
    keepAlive: true,
    keepAliveInitialDelayMillis: 0
  };
}

// Log connection details (without password)
if (dbConfig.connectionString) {
  console.log('🔌 Database connection details:', {
    connectionString: '***HIDDEN***',
    ssl: dbConfig.ssl
  });
} else {
  console.log('🔌 Database connection details:', {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    ssl: dbConfig.ssl
  });
}

// יצירת pool ללא בדיקה מיידית
let pool = new Pool(dbConfig);
console.log('✅ Pool created successfully without connection test');

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

// הגדרת event listeners
setupPoolEventListeners(pool);

// פונקציה להמתנה ל-pool להיות מוכן - עם בדיקת חיבור
const waitForPoolReady = async (maxRetries = 3, retryDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 ניסיון ${attempt}/${maxRetries} - בודק חיבור למסד נתונים...`);
      const client = await pool.connect();
      
      // בדיקה מהירה שהחיבור עובד
      await client.query('SELECT 1');
      client.release();
      
      console.log('✅ Pool מוכן לשימוש');
      return pool;
    } catch (err) {
      console.error(`❌ ניסיון ${attempt}/${maxRetries} נכשל:`, err.message);
      
      if (attempt === maxRetries) {
        console.error('❌ כל הניסיונות נכשלו, זורק שגיאה');
        throw new Error(`לא ניתן להתחבר למסד הנתונים לאחר ${maxRetries} ניסיונות: ${err.message}`);
      }
      
      // המתנה לפני ניסיון נוסף
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
};

// פונקציה לבדיקת חיבור (רק כשקוראים לה במפורש)
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