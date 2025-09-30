const redisService = require('./redis');
const { logger } = require('./logger');
const { pool } = require('./database');

class FieldCacheService {
  constructor() {
    this.cacheTTL = 300; // 5 דקות
  }

  async getAvailableFields(date, timeSlot) {
    // קודם כל ננסה לקבל ממסד הנתונים
    const fields = await this.fetchFromDatabase(date, timeSlot);
    
    // אם Redis מחובר, ננסה לשמור את התוצאה
    try {
      if (redisService.isConnected) {
        await redisService.setFieldAvailability(date, timeSlot, fields);
      }
    } catch (error) {
      // נתעלם משגיאות Redis - נמשיך עם התוצאה ממסד הנתונים
      try {
        logger.warn('Redis cache failed, continuing without caching:', error.message);
      } catch (logErr) {
        console.warn('Redis cache failed, continuing without caching:', error.message);
      }
    }
    
    return fields;
  }

  async fetchFromDatabase(date, timeSlot) {
    try {
      const fieldsResult = await pool.query(
        'SELECT f.idfield, f.fieldname, f.sporttype, st.sportname FROM field f JOIN sporttypes st ON f.sporttype = st.sporttype ORDER BY f.idfield'
      );
      
      const availableFields = [];
      
      for (const field of fieldsResult.rows) {
        const bookingCheck = await pool.query(
          'SELECT * FROM bookfield WHERE idfield = $1 AND bookingdate = $2 AND starttime = $3',
          [field.idfield, date, timeSlot]
        );
        
        if (bookingCheck.rows.length === 0) {
          availableFields.push({
            id: field.idfield,
            name: field.fieldname,
            sportType: field.sportname,
            sportTypeId: field.sporttype,
            isAvailable: true
          });
        }
      }
      
      return availableFields;
    } catch (error) {
      try {
        logger.error('Error fetching from database:', error.message);
      } catch (logErr) {
        console.error('Error fetching from database:', error.message);
      }
      throw error;
    }
  }

  async invalidateCache(date, timeSlot) {
    try {
      if (redisService.isConnected) {
        await redisService.invalidateFieldAvailability(date, timeSlot);
        try {
          logger.info(`Invalidated cache for ${date} at ${timeSlot}`);
        } catch (logErr) {
          console.log(`Invalidated cache for ${date} at ${timeSlot}`);
        }
      }
    } catch (error) {
      // נתעלם משגיאות Redis
      try {
        logger.warn('Redis cache invalidation failed:', error.message);
      } catch (logErr) {
        console.warn('Redis cache invalidation failed:', error.message);
      }
    }
  }
}

const fieldCacheService = new FieldCacheService();
module.exports = fieldCacheService;