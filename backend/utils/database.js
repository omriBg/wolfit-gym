// utils/database.js - ניהול חיבורי מסד נתונים מתקדם
const { Pool } = require('pg');
const dns = require('dns');
const { promisify } = require('util');
const logger = require('./logger');

// פונקציה להמרת host ל-IPv4
const lookup = promisify(dns.lookup);

// הגדרות connection pooling מתקדמות
// תמיכה ב-Supabase connection string או משתנים נפרדים
let dbConfig;

if (process.env.DATABASE_URL) {
  // אם יש connection string מלא (כמו ב-Supabase)
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false,
      require: true
    } : false,
    // הגדרות connection pooling
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    acquireTimeoutMillis: 60000,
    // כפיית IPv4 עבור Supabase
    family: 4,
    // הגדרות נוספות לחיבור יציב
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
  };
} else {
  // משתנים נפרדים - נוסיף הגדרות DNS ספציפיות
  dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false,
      require: true
    } : false,
    // הגדרות connection pooling
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    acquireTimeoutMillis: 60000,
    // כפיית IPv4 עבור Supabase
    family: 4,
    // הגדרות נוספות לחיבור יציב
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
    // הגדרות DNS ספציפיות
    lookup: require('dns').lookup,
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

// פונקציה להמרת host ל-IPv4
async function resolveHostToIPv4(host) {
  try {
    const result = await lookup(host, { family: 4 });
    console.log(`🔍 Resolved ${host} to IPv4: ${result.address}`);
    return result.address;
  } catch (error) {
    console.warn(`⚠️ Failed to resolve ${host} to IPv4, using original:`, error.message);
    return host;
  }
}

// המרת host ל-IPv4 אם נדרש
async function createPoolWithIPv4() {
  if (dbConfig.host && !dbConfig.connectionString) {
    try {
      const ipv4Host = await resolveHostToIPv4(dbConfig.host);
      dbConfig.host = ipv4Host;
    } catch (error) {
      console.warn('⚠️ Could not resolve host to IPv4, proceeding with original host');
    }
  }
  
  return new Pool(dbConfig);
}

// יצירת pool
let pool;

// פונקציה לאתחול ה-pool
async function initializePool() {
  try {
    pool = await createPoolWithIPv4();
    console.log('✅ Database pool initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database pool:', error);
    // fallback ל-pool רגיל
    pool = new Pool(dbConfig);
  }
}

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

// אתחול ה-pool
initializePool().then(() => {
  if (pool) {
    setupPoolEventListeners(pool);
  }
}).catch((error) => {
  console.error('❌ Failed to initialize pool, creating fallback pool:', error);
  // fallback ל-pool רגיל
  pool = new Pool(dbConfig);
  setupPoolEventListeners(pool);
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
  queryWithTimeout,
  withTransaction,
  closePool,
  getPoolStats
};
