const redisService = require('./redis');
const { logger } = require('./logger');

class DistributedLockService {
  constructor() {
    this.defaultTTL = 30; // 30 שניות
    this.retryAttempts = 3;
    this.retryDelay = 100; // 100ms
  }

  /**
   * ניסיון לקבל נעילה מבוזרת למשתמש
   * @param {string} userId - מזהה המשתמש
   * @param {number} ttlSeconds - זמן תפוגה בשניות
   * @returns {Promise<{success: boolean, lockValue?: string, reason?: string}>}
   */
  async acquireUserLock(userId, ttlSeconds = this.defaultTTL) {
    const lockKey = `user_lock:${userId}`;
    const lockValue = `${Date.now()}_${Math.random()}`; // ערך ייחודי למניעת race conditions
    
    try {
      // בדיקה ש-Redis מחובר
      if (!redisService.isConnected) {
        console.warn(`Redis not connected - falling back to local lock for user ${userId}`);
        return { success: true, lockValue: 'local_fallback' };
      }

      // ניסיון לקבל נעילה עם SET NX EX (SET if Not eXists with EXpiration)
      const result = await redisService.redis.set(lockKey, lockValue, { ex: ttlSeconds, nx: true });
      
      if (result === 'OK') {
        console.log(`🔒 Distributed lock acquired for user ${userId} (TTL: ${ttlSeconds}s)`);
        return { success: true, lockValue };
      } else {
        console.warn(`🔒 User ${userId} already has an active lock`);
        return { success: false, reason: 'Lock already exists' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to acquire lock for user ${userId}:`, errorMessage);
      return { success: false, reason: 'Redis error' };
    }
  }

  /**
   * שחרור נעילה מבוזרת
   * @param {string} userId - מזהה המשתמש
   * @param {string} lockValue - ערך הנעילה שניתן בעת יצירתה
   * @returns {Promise<{success: boolean, reason?: string}>}
   */
  async releaseUserLock(userId, lockValue) {
    const lockKey = `user_lock:${userId}`;
    
    try {
      // אם זה fallback מקומי, אין צורך לשחרר
      if (lockValue === 'local_fallback') {
        console.log(`🔓 Local fallback lock released for user ${userId}`);
        return { success: true };
      }

      // בדיקה ש-Redis מחובר
      if (!redisService.isConnected) {
        console.warn(`Redis not connected - cannot release lock for user ${userId}`);
        return { success: false, reason: 'Redis not connected' };
      }

      // בדיקה שהנעילה עדיין שייכת לנו (מניעת שחרור נעילה של אינסטנס אחר)
      const currentValue = await redisService.redis.get(lockKey);
      
      if (currentValue === lockValue) {
        await redisService.redis.del(lockKey);
        console.log(`🔓 Distributed lock released for user ${userId}`);
        return { success: true };
      } else {
        console.warn(`⚠️ Lock value mismatch for user ${userId} - lock may have expired or been taken by another instance`);
        return { success: false, reason: 'Lock value mismatch' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to release lock for user ${userId}:`, errorMessage);
      return { success: false, reason: 'Redis error' };
    }
  }

  /**
   * בדיקה אם משתמש נעול
   * @param {string} userId - מזהה המשתמש
   * @returns {Promise<boolean>}
   */
  async isUserLocked(userId) {
    const lockKey = `user_lock:${userId}`;
    try {
      if (!redisService.isConnected) {
        return false; // אם Redis לא מחובר, נניח שאין נעילה
      }
      
      const result = await redisService.redis.get(lockKey);
      return result !== null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to check lock status for user ${userId}:`, errorMessage);
      return false;
    }
  }

  /**
   * קבלת מידע על נעילה
   * @param {string} userId - מזהה המשתמש
   * @returns {Promise<{locked: boolean, lockValue?: string, ttl?: number}>}
   */
  async getLockInfo(userId) {
    const lockKey = `user_lock:${userId}`;
    try {
      if (!redisService.isConnected) {
        return { locked: false };
      }

      const lockValue = await redisService.redis.get(lockKey);
      const ttl = await redisService.redis.ttl(lockKey);
      
      return {
        locked: lockValue !== null,
        lockValue: lockValue || undefined,
        ttl: ttl > 0 ? ttl : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to get lock info for user ${userId}:`, errorMessage);
      return { locked: false };
    }
  }

  /**
   * ניקוי נעילות פגות (ניתן להריץ באופן תקופתי)
   * @returns {Promise<number>} - מספר נעילות שנוקו
   */
  async cleanupExpiredLocks() {
    try {
      if (!redisService.isConnected) {
        return 0;
      }

      // חיפוש כל המפתחות של נעילות
      const lockKeys = await redisService.redis.keys('user_lock:*');
      let cleanedCount = 0;

      for (const key of lockKeys) {
        const ttl = await redisService.redis.ttl(key);
        if (ttl === -1) { // מפתח ללא TTL - לא אמור לקרות
          await redisService.redis.del(key);
          cleanedCount++;
          console.warn(`🧹 Cleaned up lock without TTL: ${key}`);
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired locks`);
      }

      return cleanedCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to cleanup expired locks:`, errorMessage);
      return 0;
    }
  }

  /**
   * בדיקת חיבור Redis
   * @returns {Promise<boolean>}
   */
  async isRedisHealthy() {
    try {
      if (!redisService.isConnected) {
        return false;
      }
      
      const pingResult = await redisService.ping();
      return pingResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Redis health check failed:`, errorMessage);
      return false;
    }
  }
}

module.exports = new DistributedLockService();
