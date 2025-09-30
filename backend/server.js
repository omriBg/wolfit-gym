// Wolfit Gym Backend Server
require('dotenv').config();

// הגדרות בסיסיות
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Database connection
const { pool, testConnection, waitForPoolReady } = require('./utils/database');
const { OptimalHungarianAlgorithm, CompleteOptimalWorkoutScheduler, SPORT_MAPPING } = require('./optimalWorkoutAlgorithm');

const app = express();
const PORT = process.env.PORT || 10000;

// Trust proxy for rate limiting (fixes X-Forwarded-For error)
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://wolfit-gym.vercel.app',
    'https://wolfit-gym-frontend.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'],
  maxAge: 86400
}));

// Pre-flight requests
app.options('*', cors());

// Security headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

// API לשמירת אימון
app.post('/api/save-workout', authenticateToken, async (req, res) => {
  try {
    const { bookings, userId, date } = req.body;
    
    console.log('📋 מקבל בקשה לשמירת אימון:', { bookings, userId, date });
    
    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
      return res.json({
        success: false,
        message: 'אין נתוני הזמנות לשמירה'
      });
    }
    
    if (!userId) {
      return res.json({
        success: false,
        message: 'מזהה משתמש נדרש'
      });
    }
    
    // בדיקה שהתאריך לא בעבר
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    if (date < today) {
      return res.json({
        success: false,
        message: `לא ניתן להזמין מגרשים לתאריך בעבר: ${date}`
      });
    }
    
    // אם זה היום, נבדוק שהשעות לא עברו
    if (date === today) {
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
      
      // נבדוק רק הזמנות שעברו
      const pastBookings = bookings.filter(booking => booking.startTime < currentTime);
      if (pastBookings.length > 0) {
        return res.json({
          success: false,
          message: `לא ניתן להזמין מגרשים לשעות שעברו: ${pastBookings.map(b => b.startTime).join(', ')}`
        });
      }
    }
    
    // בדיקה שהמשתמש קיים
    const userCheck = await pool.query(
      'SELECT idUser FROM "User" WHERE idUser = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }
    
    // בדיקה שהמשתמש לא הזמין כבר אימון באותו תאריך ושעות
    console.log('🔍 בודק התנגשויות עם הזמנות קיימות...');
    
    for (const booking of bookings) {
      const { startTime } = booking;
      
      // חישוב רבע שעה לפני ואחרי
      const [hours, minutes] = startTime.split(':');
      const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
      const beforeMinutes = startMinutes - 15; // רבע שעה לפני
      const afterMinutes = startMinutes + 15;  // רבע שעה אחרי
      
      // המרה חזרה לפורמט זמן
      const beforeHours = Math.floor(beforeMinutes / 60);
      const beforeMins = beforeMinutes % 60;
      const beforeTime = `${beforeHours.toString().padStart(2, '0')}:${beforeMins.toString().padStart(2, '0')}`;
      
      const afterHours = Math.floor(afterMinutes / 60);
      const afterMins = afterMinutes % 60;
      const afterTime = `${afterHours.toString().padStart(2, '0')}:${afterMins.toString().padStart(2, '0')}`;
      
      console.log(`⏰ בודק התנגשות עבור ${startTime} (טווח: ${beforeTime} - ${afterTime})`);
      
      // בדיקה אם יש הזמנה קיימת של אותו משתמש באותו תאריך בטווח הזמן
      const conflictCheck = await pool.query(
        `SELECT * FROM BookField 
         WHERE iduser = $1 
         AND bookingdate = $2 
         AND (
           starttime = $3 OR 
           starttime = $4 OR 
           starttime = $5
         )`,
        [userId, date, beforeTime, startTime, afterTime]
      );
      
      if (conflictCheck.rows.length > 0) {
        const conflict = conflictCheck.rows[0];
        return res.json({
          success: false,
          message: `יש לך כבר אימון מוזמן ב-${date} בשעה ${conflict.starttime}. לא ניתן להזמין אימון בטווח של רבע שעה לפני ואחרי (${beforeTime} - ${afterTime})`
        });
      }
    }
    
    console.log('✅ לא נמצאו התנגשויות עם הזמנות קיימות');
    
    // שמירת כל ההזמנות
    for (const booking of bookings) {
      const { idField, startTime } = booking;
      
      // בדיקה שהמגרש קיים
      const fieldCheck = await pool.query(
        'SELECT idfield FROM Field WHERE idfield = $1',
        [idField]
      );
      
      if (fieldCheck.rows.length === 0) {
        console.warn(`⚠️ מגרש ${idField} לא נמצא, מדלג...`);
        continue;
      }
      
      // נשתמש בטרנזקציה כדי למנוע מצב שבו שני משתמשים מזמינים את אותו מגרש
      await pool.query('BEGIN');

      try {
        // בדיקה + הכנסה באטומיות אחת
        const result = await pool.query(`
          INSERT INTO BookField (idfield, bookingdate, starttime, iduser)
          SELECT $1, $2, $3, $4
          WHERE NOT EXISTS (
            SELECT 1 FROM BookField 
            WHERE idfield = $1 
            AND bookingdate = $2 
            AND starttime = $3
            FOR UPDATE
          )
          RETURNING idfield
        `, [idField, date, startTime, userId]);

        if (result.rows.length === 0) {
          // המגרש כבר תפוס
          await pool.query('ROLLBACK');
        console.warn(`⚠️ מגרש ${idField} תפוס ב-${date} ${startTime}, מדלג...`);
        continue;
      }
      
        await pool.query('COMMIT');
      console.log(`✅ נשמרה הזמנה: מגרש ${idField}, תאריך ${date}, שעה ${startTime}`);
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    }
    
    res.json({
      success: true,
      message: `האימון נשמר בהצלחה! נשמרו ${bookings.length} הזמנות`,
      savedCount: bookings.length
    });
    
  } catch (err) {
    console.error('❌ שגיאה בשמירת האימון:', err);
    res.json({
      success: false,
      message: 'שגיאה בשמירת האימון',
      error: err.message
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({ status: 'Servidor rodando!' });
});

// Start server
const HOST = process.env.HOST || 'localhost';
console.log('🔍 מגיע להפעלת השרת...');

try {
  console.log('🚀 מפעיל שרת...');
  app.listen(PORT, HOST, () => {
    console.log(`השרת רץ על http://${HOST}:${PORT}`);
  });
  console.log('✅ שרת הופעל בהצלחה!');
} catch (error) {
  console.error('❌ שגיאה בהפעלת השרת:', error);
  process.exit(1);
}