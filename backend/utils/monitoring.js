// utils/monitoring.js - מערכת ניטור והתראות
const logger = require('./logger');
const { getPoolStats } = require('./database');

// סטטיסטיקות ניטור
let monitoringStats = {
  startTime: new Date(),
  requestCount: 0,
  errorCount: 0,
  averageResponseTime: 0,
  responseTimeSum: 0,
  lastAlertTime: null,
  alertCount: 0
};

// סף התראות
const ALERT_THRESHOLDS = {
  ERROR_RATE: 0.1, // 10% שגיאות
  RESPONSE_TIME: 5000, // 5 שניות
  MEMORY_USAGE: 800, // 800MB
  DB_CONNECTIONS: 15, // 15 חיבורים פעילים
  UPTIME_CHECK: 300000 // 5 דקות
};

// פונקציה לעדכון סטטיסטיקות בקשה
const updateRequestStats = (responseTime, isError = false) => {
  monitoringStats.requestCount++;
  monitoringStats.responseTimeSum += responseTime;
  monitoringStats.averageResponseTime = monitoringStats.responseTimeSum / monitoringStats.requestCount;
  
  if (isError) {
    monitoringStats.errorCount++;
  }
};

// פונקציה לבדיקת ספי התראות
const checkAlertThresholds = async () => {
  const now = new Date();
  const timeSinceLastAlert = monitoringStats.lastAlertTime 
    ? now - monitoringStats.lastAlertTime 
    : Infinity;
  
  // מניעת spam של התראות - רק אחת כל 5 דקות
  if (timeSinceLastAlert < ALERT_THRESHOLDS.UPTIME_CHECK) {
    return;
  }
  
  const alerts = [];
  
  // בדיקת שיעור שגיאות
  if (monitoringStats.requestCount > 0) {
    const errorRate = monitoringStats.errorCount / monitoringStats.requestCount;
    if (errorRate > ALERT_THRESHOLDS.ERROR_RATE) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        message: `שיעור שגיאות גבוה: ${(errorRate * 100).toFixed(2)}%`,
        severity: 'HIGH',
        data: {
          errorRate,
          errorCount: monitoringStats.errorCount,
          totalRequests: monitoringStats.requestCount
        }
      });
    }
  }
  
  // בדיקת זמן תגובה
  if (monitoringStats.averageResponseTime > ALERT_THRESHOLDS.RESPONSE_TIME) {
    alerts.push({
      type: 'SLOW_RESPONSE',
      message: `זמן תגובה איטי: ${monitoringStats.averageResponseTime.toFixed(2)}ms`,
      severity: 'MEDIUM',
      data: {
        averageResponseTime: monitoringStats.averageResponseTime,
        threshold: ALERT_THRESHOLDS.RESPONSE_TIME
      }
    });
  }
  
  // בדיקת זיכרון
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  if (heapUsedMB > ALERT_THRESHOLDS.MEMORY_USAGE) {
    alerts.push({
      type: 'HIGH_MEMORY_USAGE',
      message: `שימוש גבוה בזיכרון: ${heapUsedMB}MB`,
      severity: 'HIGH',
      data: {
        heapUsed: heapUsedMB,
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
        threshold: ALERT_THRESHOLDS.MEMORY_USAGE
      }
    });
  }
  
  // בדיקת חיבורי מסד נתונים
  const poolStats = getPoolStats();
  if (poolStats.totalCount > ALERT_THRESHOLDS.DB_CONNECTIONS) {
    alerts.push({
      type: 'HIGH_DB_CONNECTIONS',
      message: `יותר מדי חיבורי מסד נתונים: ${poolStats.totalCount}`,
      severity: 'MEDIUM',
      data: {
        totalCount: poolStats.totalCount,
        idleCount: poolStats.idleCount,
        waitingCount: poolStats.waitingCount,
        threshold: ALERT_THRESHOLDS.DB_CONNECTIONS
      }
    });
  }
  
  // שליחת התראות
  if (alerts.length > 0) {
    monitoringStats.lastAlertTime = now;
    monitoringStats.alertCount += alerts.length;
    
    for (const alert of alerts) {
      await sendAlert(alert);
    }
  }
};

// פונקציה לשליחת התראות
const sendAlert = async (alert) => {
  const alertData = {
    timestamp: new Date().toISOString(),
    service: 'wolfit-backend',
    ...alert
  };
  
  // רישום התראה בלוג
  if (alert.severity === 'HIGH') {
    logger.error('התראה קריטית:', alertData);
  } else {
    logger.warn('התראה:', alertData);
  }
  
  // כאן ניתן להוסיף שליחה לשרותי התראות חיצוניים
  // כמו Slack, Email, SMS, וכו'
  
  // דוגמה לשליחה לאימייל (אם מוגדר)
  if (process.env.ALERT_EMAIL && alert.severity === 'HIGH') {
    try {
      const { sendAlertEmail } = require('../emailService');
      await sendAlertEmail(alert);
    } catch (err) {
      logger.error('שגיאה בשליחת התראה באימייל:', err);
    }
  }
};

// פונקציה לקבלת סטטיסטיקות ניטור
const getMonitoringStats = () => {
  const memUsage = process.memoryUsage();
  const poolStats = getPoolStats();
  
  return {
    ...monitoringStats,
    uptime: Date.now() - monitoringStats.startTime.getTime(),
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    },
    database: poolStats,
    errorRate: monitoringStats.requestCount > 0 
      ? monitoringStats.errorCount / monitoringStats.requestCount 
      : 0,
    alerts: {
      total: monitoringStats.alertCount,
      lastAlert: monitoringStats.lastAlertTime
    }
  };
};

// פונקציה לאיפוס סטטיסטיקות
const resetMonitoringStats = () => {
  monitoringStats = {
    startTime: new Date(),
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    responseTimeSum: 0,
    lastAlertTime: null,
    alertCount: 0
  };
  logger.info('סטטיסטיקות ניטור אופסו');
};

// Middleware לניטור בקשות
const monitoringMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    updateRequestStats(responseTime, isError);
    
    // בדיקת ספי התראות (רק עבור בקשות שגיאה או זמן תגובה איטי)
    if (isError || responseTime > ALERT_THRESHOLDS.RESPONSE_TIME) {
      checkAlertThresholds().catch(err => {
        logger.error('שגיאה בבדיקת ספי התראות:', err);
      });
    }
  });
  
  next();
};

// בדיקה תקופתית של ספי התראות (כל 5 דקות)
setInterval(() => {
  checkAlertThresholds().catch(err => {
    logger.error('שגיאה בבדיקה תקופתית של ספי התראות:', err);
  });
}, ALERT_THRESHOLDS.UPTIME_CHECK);

module.exports = {
  updateRequestStats,
  checkAlertThresholds,
  getMonitoringStats,
  resetMonitoringStats,
  monitoringMiddleware,
  ALERT_THRESHOLDS
};
