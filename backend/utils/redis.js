const redis = require('redis');
const { logger } = require('./logger');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
  }

  async connect() {
    try {
      const redisConfig = {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.maxRetries) {
              logger.error('Redis: Max retries reached, giving up');
              return new Error('Max retries reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      };

      // אם יש סיסמה, נוסיף אותה להגדרות
      if (process.env.REDIS_PASSWORD) {
        redisConfig.password = process.env.REDIS_PASSWORD;
      }

      this.client = redis.createClient(redisConfig);

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis: Connected successfully');
        this.isConnected = true;
        this.retryCount = 0;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    if (!this.isConnected) return false;
    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error);
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
}

const redisService = new RedisService();
module.exports = redisService;
