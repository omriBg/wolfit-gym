const { logger } = require('./logger');

class RedisService {
  constructor() {
    this.isConnected = false;
    this.baseUrl = process.env.UPSTASH_REDIS_REST_URL;
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN;
  }

  async connect() {
    try {
      if (!this.baseUrl || !this.token) {
        logger.warn('Redis: Missing configuration - UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set');
        return false;
      }

      // בדיקת חיבור פשוטה
      await this.ping();
      this.isConnected = true;
      logger.info('Redis: Connected successfully');
      return true;
    } catch (error) {
      // שימוש ב-error.message במקום error ישירות
      logger.error('Redis connection failed:', error.message || error);
      this.isConnected = false;
      return false;
    }
  }

  async makeRequest(command, args = []) {
    if (!this.isConnected) return null;

    try {
      const response = await fetch(`${this.baseUrl}/${command}/${args.join('/')}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      logger.error(`Redis ${command} error:`, error.message || error);
      return null;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    try {
      const result = await this.makeRequest('get', [key]);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      logger.error('Redis get error:', error.message || error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    if (!this.isConnected) return false;
    try {
      const stringValue = JSON.stringify(value);
      await this.makeRequest('set', [key, stringValue, 'EX', ttlSeconds.toString()]);
      return true;
    } catch (error) {
      logger.error('Redis set error:', error.message || error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;
    try {
      await this.makeRequest('del', [key]);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error.message || error);
      return false;
    }
  }

  async ping() {
    try {
      const result = await this.makeRequest('ping');
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping error:', error.message || error);
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
    return {
      connected: this.isConnected,
      url: this.baseUrl ? '✓' : '✗',
      token: this.token ? '✓' : '✗'
    };
  }
}

const redisService = new RedisService();
module.exports = redisService;