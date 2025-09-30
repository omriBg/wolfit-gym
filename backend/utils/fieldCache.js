const redisService = require('./redis');
const { logger } = require('./logger');
const { pool } = require('./database');

class FieldCacheService {
  constructor() {
    this.cacheTTL = 300; // 5 דקות
  }

  async getAvailableFields(date, timeSlot) {
    try {
      // נסה לקבל מ-Redis
      const cachedFields = await redisService.getFieldAvailability(date, timeSlot);
      if (cachedFields) {
        logger.info(`Cache hit for fields on ${date} at ${timeSlot}`);
        return cachedFields;
      }

      // אם אין ב-cache, קבל ממסד הנתונים
      logger.info(`Cache miss for fields on ${date} at ${timeSlot}`);
      const fields = await this.fetchFromDatabase(date, timeSlot);
      
      // שמור ב-cache רק אם החיבור ל-Redis פעיל
      if (redisService.isConnected) {
        await redisService.setFieldAvailability(date, timeSlot, fields);
      }
      
      return fields;
    } catch (error) {
      logger.error('Error getting available fields:', error.message);
      // במקרה של שגיאה, נחזור למסד הנתונים
      return this.fetchFromDatabase(date, timeSlot);
    }
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
      logger.error('Error fetching from database:', error.message);
      throw error;
    }
  }

  async invalidateCache(date, timeSlot) {
    try {
      if (redisService.isConnected) {
        await redisService.invalidateFieldAvailability(date, timeSlot);
        logger.info(`Invalidated cache for ${date} at ${timeSlot}`);
      }
    } catch (error) {
      logger.error('Error invalidating cache:', error.message);
      // נמשיך גם אם יש שגיאה בביטול ה-cache
    }
  }
}

const fieldCacheService = new FieldCacheService();
module.exports = fieldCacheService;