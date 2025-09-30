const { logger } = require('./logger');
const { Redis } = require('@upstash/redis');

class RedisService {
  constructor() {
    this.isConnected = false;
    this.redis = null;
  }

  async connect() {
    try {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      
      if (!url || !token) {
        try {
          logger.warn('Redis: Missing configuration - UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set');
        } catch (logErr) {
          console.warn('Redis: Missing configuration - UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set');
        }
        return false;
      }

      // יצירת חיבור Redis עם SDK החדש
      this.redis = new Redis({
        url: url,
        token: token,
      });

      // בדיקת חיבור פשוטה
      const pingResult = await this.ping();
      if (!pingResult) {
        try {
          logger.warn('Redis: Ping failed');
        } catch (logErr) {
          console.warn('Redis: Ping failed');
        }
        return false;
      }

      this.isConnected = true;
      try {
        logger.info('Redis: Connected successfully');
      } catch (logErr) {
        console.log('Redis: Connected successfully');
      }
      return true;
    } catch (err) {
      // טיפול בשגיאה בצורה בטוחה יותר
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      try {
        logger.error('Redis connection failed:', errorMessage);
      } catch (logErr) {
        console.error('Redis connection failed:', errorMessage);
        console.error('Logger error:', logErr.message);
      }
      this.isConnected = false;
      return false;
    }
  }

  // פונקציה זו כבר לא נדרשת עם SDK החדש
  async makeRequest(command, args = []) {
    try {
      logger.debug(`Redis: makeRequest is deprecated with new SDK`);
    } catch (logErr) {
      console.debug(`Redis: makeRequest is deprecated with new SDK`);
    }
    return null;
  }

  async get(key) {
    if (!this.isConnected || !this.redis) return null;
    try {
      const result = await this.redis.get(key);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      try {
        logger.error('Redis get error:', errorMessage);
      } catch (logErr) {
        console.error('Redis get error:', errorMessage);
      }
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    if (!this.isConnected || !this.redis) return false;
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      try {
        logger.error('Redis set error:', errorMessage);
      } catch (logErr) {
        console.error('Redis set error:', errorMessage);
      }
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.redis) return false;
    try {
      await this.redis.del(key);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      try {
        logger.error('Redis delete error:', errorMessage);
      } catch (logErr) {
        console.error('Redis delete error:', errorMessage);
      }
      return false;
    }
  }

  async ping() {
    try {
      if (!this.redis) return false;
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      try {
        logger.error('Redis ping error:', errorMessage);
      } catch (logErr) {
        console.error('Redis ping error:', errorMessage);
      }
      return false;
    }
  }

  // פונקציות ספציפיות למגרשים
  async getFieldAvailability(date, timeSlot) {
    return this.get(`fields:${date}:${timeSlot}`);
  }

  async setFieldAvailability(date, timeSlot, fields) {
    return this.set(`fields:${date}:${timeSlot}`, fields);
  }

  async invalidateFieldAvailability(date, timeSlot) {
    return this.del(`fields:${date}:${timeSlot}`);
  }

  getConnectionStatus() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    return {
      connected: this.isConnected,
      url: url ? '✓' : '✗',
      token: token ? '✓' : '✗'
    };
  }
}

const redisService = new RedisService();
module.exports = redisService;