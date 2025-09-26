// utils/healthCheck.js - מערכת בדיקות בריאות
const { testConnection, getPoolStats } = require('./database');
const logger = require('./logger');

// סטטיסטיקות מערכת
let systemStats = {
  startTime: new Date(),
  totalRequests: 0,
  errorCount: 0,
  lastHealthCheck: null,
  uptime: 0
};

// פונקציה לעדכון סטטיסטיקות
const updateStats = (isError = false) => {
  systemStats.totalRequests++;
  if (isError) {
    systemStats.errorCount++;
  }
  systemStats.uptime = Date.now() - systemStats.startTime.getTime();
};

// בדיקת בריאות בסיסית
const basicHealthCheck = async () => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: systemStats.uptime,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    // בדיקת חיבור למסד נתונים
    const dbHealth = await testConnection();
    if (dbHealth.success) {
      health.database = {
        status: 'connected',
        responseTime: Date.now() - new Date().getTime()
      };
    } else {
      health.database = {
        status: 'disconnected',
        error: dbHealth.error
      };
      health.status = 'unhealthy';
    }

    // סטטיסטיקות pool
    const poolStats = getPoolStats();
    health.database.pool = poolStats;

    // בדיקת זיכרון
    const memUsage = process.memoryUsage();
    health.memory = {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024) // MB
    };

    // בדיקת CPU
    const cpuUsage = process.cpuUsage();
    health.cpu = {
      user: cpuUsage.user,
      system: cpuUsage.system
    };

    systemStats.lastHealthCheck = new Date();
    
    logger.info('בדיקת בריאות הושלמה', { status: health.status });
    
    return health;
  } catch (err) {
    logger.error('שגיאה בבדיקת בריאות:', err);
    return {
      ...health,
      status: 'unhealthy',
      error: err.message
    };
  }
};

// בדיקת בריאות מפורטת
const detailedHealthCheck = async () => {
  const health = await basicHealthCheck();
  
  try {
    // בדיקות נוספות
    health.checks = {
      database: health.database.status === 'connected',
      memory: health.memory.heapUsed < 500, // פחות מ-500MB
      uptime: health.uptime > 0,
      lastCheck: systemStats.lastHealthCheck !== null
    };

    // חישוב ציון בריאות כללי
    const checks = Object.values(health.checks);
    const passedChecks = checks.filter(check => check === true).length;
    health.healthScore = Math.round((passedChecks / checks.length) * 100);

    // סטטיסטיקות בקשות
    health.requests = {
      total: systemStats.totalRequests,
      errors: systemStats.errorCount,
      errorRate: systemStats.totalRequests > 0 
        ? Math.round((systemStats.errorCount / systemStats.totalRequests) * 100) 
        : 0
    };

    return health;
  } catch (err) {
    logger.error('שגיאה בבדיקת בריאות מפורטת:', err);
    return {
      ...health,
      status: 'unhealthy',
      error: err.message
    };
  }
};

// בדיקת readiness (מוכן לקבל בקשות)
const readinessCheck = async () => {
  try {
    const dbHealth = await testConnection();
    const poolStats = getPoolStats();
    
    // המערכת מוכנה אם:
    // 1. מסד הנתונים מחובר
    // 2. יש חיבורים זמינים ב-pool
    // 3. הזיכרון לא מלא מדי
    const memUsage = process.memoryUsage();
    const isMemoryOk = memUsage.heapUsed < 800 * 1024 * 1024; // פחות מ-800MB
    
    const isReady = dbHealth.success && 
                   poolStats.idleCount > 0 && 
                   isMemoryOk;

    return {
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealth.success,
        pool: poolStats.idleCount > 0,
        memory: isMemoryOk
      },
      details: {
        database: dbHealth.success ? 'connected' : dbHealth.error,
        pool: poolStats,
        memory: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB'
      }
    };
  } catch (err) {
    logger.error('שגיאה בבדיקת readiness:', err);
    return {
      ready: false,
      timestamp: new Date().toISOString(),
      error: err.message
    };
  }
};

// בדיקת liveness (המערכת חיה)
const livenessCheck = () => {
  return {
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: systemStats.uptime,
    pid: process.pid
  };
};

// פונקציה לאיפוס סטטיסטיקות
const resetStats = () => {
  systemStats = {
    startTime: new Date(),
    totalRequests: 0,
    errorCount: 0,
    lastHealthCheck: null,
    uptime: 0
  };
  logger.info('סטטיסטיקות המערכת אופסו');
};

module.exports = {
  basicHealthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck,
  updateStats,
  resetStats,
  getSystemStats: () => systemStats
};
