// Redis configuration and connection
const redis = require('redis');

// יצירת חיבור ל-Redis
const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            // ניסיון חיבור מחדש כל 5 שניות, עד 10 פעמים
            if (retries > 10) return new Error('ניסיונות חיבור מרובים נכשלו');
            return Math.min(retries * 1000, 5000);
        }
    }
});

// טיפול בשגיאות חיבור
client.on('error', (err) => console.error('Redis שגיאת:', err));
client.on('connect', () => console.log('Redis מחובר בהצלחה'));

// פונקציות עזר לשימוש ב-Redis
const redisHelper = {
    // שמירת מידע ב-cache
    async set(key, value, expirationSeconds = 60) {
        try {
            await client.connect();
            await client.setEx(key, expirationSeconds, JSON.stringify(value));
            await client.quit();
            console.log(`✅ נשמר ב-cache: ${key}`);
        } catch (error) {
            console.error('❌ שגיאה בשמירה ב-cache:', error);
        }
    },

    // קבלת מידע מה-cache
    async get(key) {
        try {
            await client.connect();
            const value = await client.get(key);
            await client.quit();
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('❌ שגיאה בקבלת מידע מה-cache:', error);
            return null;
        }
    },

    // מחיקת מידע מה-cache
    async delete(key) {
        try {
            await client.connect();
            await client.del(key);
            await client.quit();
            console.log(`🗑️ נמחק מה-cache: ${key}`);
        } catch (error) {
            console.error('❌ שגיאה במחיקה מה-cache:', error);
        }
    }
};

module.exports = redisHelper;
