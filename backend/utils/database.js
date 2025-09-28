// utils/database.js - ניהול חיבורי מסד נתונים מתקדם
const { Pool } = require('pg');
const dns = require('dns');
const { promisify } = require('util');
const logger = require('./logger');
const tls = require('tls');

// פונקציה להמרת host ל-IPv4
const lookup = promisify(dns.lookup);

// הגדרות connection pooling מתקדמות
// תמיכה ב-Supabase connection string או משתנים נפרדים
let dbConfig;

if (process.env.DATABASE_URL) {
  // אם יש connection string מלא (כמו ב-Supabase)
  let connectionString = process.env.DATABASE_URL;
  
  // זיהוי סוג החיבור
  if (connectionString.includes('pooler.supabase.com')) {
    console.log('🔧 Using Supabase Transaction Pooler (IPv4 compatible)');
  } else if (connectionString.includes('supabase.co')) {
    console.log('⚠️ Using Supabase Direct Connection - consider switching to Transaction Pooler');
  }
  
  // הגדרת SSL מותאמת לסאפבייס
  const sslConfig = {
    rejectUnauthorized: false,
    checkServerIdentity: (host, cert) => {
      return undefined;
    },
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3'
  };

  dbConfig = {
    connectionString: connectionString,
    ssl: sslConfig,
    // הגדרות connection pooling מותאמות ל-Transaction Pooler
    max: 10, // פחות connections ל-Transaction Pooler
    min: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    acquireTimeoutMillis: 60000,
    // הגדרות נוספות לחיבור יציב
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
    // הגדרות SSL נוספות
    statement_timeout: 30000,
    query_timeout: 30000,
    connectionTimeoutMillis: 30000,
    // הגדרות נוספות לחיבור יציב
    application_name: 'wolfit-gym-backend'
  };
} else {
  // משתנים נפרדים - נוסיף הגדרות DNS ספציפיות
  dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false,
      checkServerIdentity: (host, cert) => {
        return undefined;
      },
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3'
    },
    // הגדרות connection pooling
    max: 10,
    min: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
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
    ssl: dbConfig.ssl,
    maxConnections: dbConfig.max,
    minConnections: dbConfig.min
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

// יצירת pool עם retry mechanism
let pool;

// פונקציה לאתחול ה-pool עם retry mechanism
async function initializePool() {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      console.log(`🔍 Attempting to initialize pool (attempt ${attempts + 1}/${maxAttempts})`);
      
      // נסיון ראשון עם SSL רגיל
      pool = new Pool(dbConfig);
      
      // בדיקת חיבור
      console.log('🔍 Testing connection...');
      const client = await pool.connect();
      console.log('✅ Connected to database, testing query...');
      await client.query('SELECT 1');
      client.release();
      
      console.log('✅ Database pool initialized and tested successfully');
      return pool;
    } catch (error) {
      attempts++;
      console.error(`❌ Failed to initialize database pool (attempt ${attempts}):`, error.message);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      if (attempts < maxAttempts) {
        console.log(`⏳ Retrying in 2 seconds with modified SSL config...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // נסיון שני עם SSL מותאם
        if (attempts === 2) {
          dbConfig.ssl = {
            rejectUnauthorized: false,
            checkServerIdentity: () => undefined,
            minVersion: 'TLSv1.2',
            maxVersion: 'TLSv1.3',
            secureOptions: tls.SSL_OP_NO_TLSv1_3
          };
        }
      } else {
        console.error('❌ All attempts failed, using fallback configuration');
        // נסיון אחרון עם תצורה מינימלית
        const fallbackConfig = {
          ...dbConfig,
          ssl: {
            rejectUnauthorized: false,
            checkServerIdentity: () => undefined
          },
          max: 5,
          min: 0,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 10000
        };
        
        try {
          console.log('🔄 Attempting connection with fallback configuration...');
          pool = new Pool(fallbackConfig);
          return pool;
        } catch (fallbackError) {
          console.error('❌ Fallback configuration failed:', fallbackError.message);
          throw fallbackError;
        }
      }
    }
  }
  return pool;
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
initializePool().then((initializedPool) => {
  if (initializedPool) {
    pool = initializedPool;
    setupPoolEventListeners(pool);
    console.log('✅ Pool initialization completed and ready for use');
  }
}).catch((error) => {
  console.error('❌ Failed to initialize pool:', error);
  console.error('Error details:', {
    code: error.code,
    message: error.message,
    stack: error.stack
  });
});

// פונקציה להמתנה ל-pool להיות מוכן
const waitForPoolReady = async () => {
  let attempts = 0;
  const maxAttempts = 30; // 30 שניות
  
  while (!pool && attempts < maxAttempts) {
    console.log(`⏳ ממתין ל-pool להיות מוכן... ניסיון ${attempts + 1}/${maxAttempts}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  if (!pool) {
    console.error('❌ Pool initialization timeout after 30 seconds');
    throw new Error('Pool לא התאתחל אחרי 30 שניות');
  }
  
  // נסה להתחבר לוודא שה-pool עובד
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Pool מוכן לשימוש ונבדק בהצלחה');
    return pool;
  } catch (error) {
    console.error('❌ Pool connection test failed:', error.message);
    
    // נסה שוב עם תצורת SSL מינימלית
    console.log('🔄 Attempting connection with minimal SSL config...');
    const minimalConfig = {
      ...dbConfig,
      ssl: {
        rejectUnauthorized: false
      }
    };
    
    pool = new Pool(minimalConfig);
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Pool מוכן לשימוש עם תצורה מינימלית');
    return pool;
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
    console.error('Error details:', {
      code: err.code,
      message: err.message,
      stack: err.stack
    });
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
    console.error('Error details:', {
      code: err.code,
      message: err.message,
      stack: err.stack
    });
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