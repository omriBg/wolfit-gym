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
    // הגדרות connection pooling משופרות
    max: 10, // הקטנת המקסימום
    min: 1,  // הקטנת המינימום
    idleTimeoutMillis: 60000, // הגדלת הזמן
    connectionTimeoutMillis: 30000, // הגדלת timeout
    acquireTimeoutMillis: 120000, // הגדלת acquire timeout
    // הגדרות נוספות לחיבור יציב
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    // הגדרות נוספות ליציבות
    statement_timeout: 30000,
    query_timeout: 30000,
    application_name: 'wolfit-gym-backend'
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

// יצירת pool עם מנגנון retry
let pool;
let retryCount = 0;
const maxRetries = 3;

function createPool() {
  try {
    pool = new Pool(dbConfig);
    console.log('✅ Pool created successfully without connection test');
    return pool;
  } catch (error) {
    console.error('❌ שגיאה ביצירת pool:', error);
    throw error;
  }
}

// יצירת pool ראשונית
createPool();

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

// פונקציה להמתנה ל-pool להיות מוכן - ללא בדיקת חיבור!
const waitForPoolReady = async () => {
  console.log('✅ Pool מוכן לשימוש');
  return pool;
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

// פונקציה לביצוע שאילתה עם timeout ו-retry
const queryWithTimeout = async (text, params, timeoutMs = 30000, maxRetries = 3) => {
  console.log('🔍 Attempting database query:', {
    query: text,
    params: params,
    timeout: timeoutMs,
    maxRetries: maxRetries
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let client;
    try {
      client = await pool.connect();
      console.log(`✅ Connected to database successfully (attempt ${attempt}/${maxRetries})`);
    } catch (err) {
      console.error(`❌ Failed to connect to database (attempt ${attempt}/${maxRetries}):`, err.message);
      
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // 1, 2, 3 שניות
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
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
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        attempt: attempt
      });
      
      return result;
    } catch (err) {
      logger.error(`שגיאה בביצוע שאילתה (attempt ${attempt}/${maxRetries}):`, {
        error: err.message,
        code: err.code,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params
      });
      
      if (attempt < maxRetries && (
        err.message.includes('Connection terminated') ||
        err.message.includes('Control plane request failed') ||
        err.message.includes('timeout')
      )) {
        const delay = attempt * 1000;
        console.log(`⏳ Retrying query in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw err;
    } finally {
      if (client) {
        client.release();
      }
    }
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