// backend/server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// חיבור למסד נתונים
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'Wolfit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9526',
  ssl: {
    rejectUnauthorized: false,
    sslmode: 'require'
  },
});

// בדיקת חיבור
app.get('/test', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    res.json({
      success: true,
      message: 'חיבור למסד הנתונים הצליח!',
      timestamp: result.rows[0].now
    });
  } catch (err) {
    res.json({
      success: false,
      message: 'שגיאה בחיבור למסד הנתונים',
      error: err.message
    });
  }
});
// API לטעינת העדפות משתמש
app.get('/api/user-preferences/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const userResult = await pool.query(
        'SELECT intensityLevel FROM "User" WHERE idUser = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.json({
          success: false,
          message: 'משתמש לא נמצא'
        });
      }
      
      const preferencesResult = await pool.query(
        'SELECT sportType, preferenceRank FROM UserPreferences WHERE idUser = $1 ORDER BY preferenceRank',
        [userId]
      );
      
      const selectedSports = preferencesResult.rows.map(row => row.sporttype);
      
      res.json({
        success: true,
        data: {
          intensityLevel: userResult.rows[0].intensitylevel,
          selectedSports: selectedSports,
          preferenceMode: selectedSports.length > 0 ? 'ranked' : 'simple'
        }
      });
      
    } catch (err) {
      console.error('שגיאה בטעינת העדפות:', err);
      res.json({
        success: false,
        message: 'שגיאה בשרת',
        error: err.message
      });
    }
  });

// API לבדיקת התחברות
app.post('/api/login', async (req, res) => {
    try {
      const { userName, password } = req.body;
      
      // בדיקה שהשדות לא ריקים
      if (!userName || !password) {
        return res.json({
          success: false,
          message: 'שם משתמש וסיסמה נדרשים'
        });
      }
      
      // חיפוש המשתמש במסד נתונים
      const userResult = await pool.query(
        'SELECT idUser, userName, email FROM "User" WHERE userName = $1 AND password = $2',
        [userName, password]
      );
      
      if (userResult.rows.length === 0) {
        return res.json({
          success: false,
          message: 'שם משתמש או סיסמה שגויים'
        });
      }
      
      const user = userResult.rows[0];
      
      res.json({
        success: true,
        message: 'התחברות הצליחה!',
        user: {
          id: user.iduser,
          userName: user.username,
          email: user.email
        }
      });
      
    } catch (err) {
      console.error('שגיאה בהתחברות:', err);
      res.json({
        success: false,
        message: 'שגיאה בשרת',
        error: err.message
      });
    }
  });

  // API לבדיקת זמינות שם משתמש
  app.post('/api/check-username', async (req, res) => {
    try {
      const { userName } = req.body;
      
      if (!userName || userName.trim().length < 3) {
        return res.json({
          success: false,
          available: false,
          message: 'שם משתמש חייב להכיל לפחות 3 תווים'
        });
      }
      
      // בדיקה אם שם המשתמש כבר קיים
      const existingUser = await pool.query(
        'SELECT idUser FROM "User" WHERE userName = $1',
        [userName.trim()]
      );
      
      const available = existingUser.rows.length === 0;
      
      res.json({
        success: true,
        available: available,
        message: available ? 'שם משתמש זמין' : 'שם משתמש זה כבר תפוס'
      });
      
    } catch (err) {
      console.error('שגיאה בבדיקת שם משתמש:', err);
      res.json({
        success: false,
        available: false,
        message: 'שגיאה בשרת'
      });
    }
  });
  
  // API להרשמת משתמש חדש
  app.post('/api/register', async (req, res) => {
    try {
      const { userName, password, email, height, weight, birthdate, intensityLevel, selectedSports } = req.body;
      
      // בדיקה שכל השדות החובה קיימים
      if (!userName || !password || !email) {
        return res.json({
          success: false,
          message: 'שם משתמש, סיסמה ואימייל נדרשים'
        });
      }
      
      // בדיקה אם שם המשתמש כבר קיים
      const existingUser = await pool.query(
        'SELECT idUser FROM "User" WHERE userName = $1',
        [userName]
      );
      
      if (existingUser.rows.length > 0) {
        return res.json({
          success: false,
          message: 'שם המשתמש כבר קיים במערכת'
        });
      }
      
      // בדיקה אם האימייל כבר קיים
      const existingEmail = await pool.query(
        'SELECT idUser FROM "User" WHERE email = $1',
        [email]
      );
      
      if (existingEmail.rows.length > 0) {
        return res.json({
          success: false,
          message: 'האימייל כבר קיים במערכת'
        });
      }
      
      // הכנסת משתמש חדש
      const userResult = await pool.query(
        'INSERT INTO "User" (userName, password, email, height, weight, birthdate, intensityLevel) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING idUser',
        [userName, password, email, height, weight, birthdate, intensityLevel]
      );
      
      const userId = userResult.rows[0].iduser;
      
      // הכנסת העדפות ספורט (אם יש)
      if (selectedSports && selectedSports.length > 0) {
        for (let i = 0; i < selectedSports.length; i++) {
          await pool.query(
            'INSERT INTO UserPreferences (idUser, sportType, preferenceRank) VALUES ($1, $2, $3)',
            [userId, selectedSports[i], i + 1]
          );
        }
      }
      
      res.json({
        success: true,
        message: 'המשתמש נרשם בהצלחה!',
        userId: userId
      });
      
    } catch (err) {
      console.error('שגיאה בהרשמה:', err);
      res.json({
        success: false,
        message: 'שגיאה בהרשמה',
        error: err.message
      });
    }
  });
app.put('/api/save-user-preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { intensityLevel, selectedSports } = req.body;
    
    await pool.query(
      'UPDATE "User" SET intensityLevel = $1 WHERE idUser = $2',
      [intensityLevel, userId]
    );
    
    await pool.query(
      'DELETE FROM UserPreferences WHERE idUser = $1',
      [userId]
    );
    
    if (selectedSports && selectedSports.length > 0) {
      for (let i = 0; i < selectedSports.length; i++) {
        await pool.query(
          'INSERT INTO UserPreferences (idUser, sportType, preferenceRank) VALUES ($1, $2, $3)',
          [userId, selectedSports[i], i + 1]
        );
      }
    }
    
    res.json({
      success: true,
      message: 'העדפות נשמרו בהצלחה!'
    });
    
  } catch (err) {
    console.error('שגיאה בשמירת העדפות:', err);
    res.json({
      success: false,
      message: 'שגיאה בשמירת העדפות',
      error: err.message
    });
  }
});

// API לשמירת אימון במסד הנתונים
app.post('/api/book-fields', async (req, res) => {
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
    
    // שמירת כל ההזמנות
    for (const booking of bookings) {
      const { idField, bookingDate, startTime, idUser } = booking;
      
      // בדיקה שהמגרש קיים
      const fieldCheck = await pool.query(
        'SELECT idField FROM Field WHERE idField = $1',
        [idField]
      );
      
      if (fieldCheck.rows.length === 0) {
        console.warn(`⚠️ מגרש ${idField} לא נמצא, מדלג...`);
        continue;
      }
      
      // בדיקה שהמגרש לא תפוס כבר
      const existingBooking = await pool.query(
        'SELECT * FROM BookField WHERE idField = $1 AND bookingDate = $2 AND startTime = $3',
        [idField, bookingDate, startTime]
      );
      
      if (existingBooking.rows.length > 0) {
        console.warn(`⚠️ מגרש ${idField} תפוס ב-${bookingDate} ${startTime}, מדלג...`);
        continue;
      }
      
      // הכנסת ההזמנה
      await pool.query(
        'INSERT INTO BookField (idField, bookingDate, startTime, idUser) VALUES ($1, $2, $3, $4)',
        [idField, bookingDate, startTime, idUser]
      );
      
      console.log(`✅ נשמרה הזמנה: מגרש ${idField}, תאריך ${bookingDate}, שעה ${startTime}`);
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

// API לקבלת מגרשים זמינים ליצירת אימון
app.post('/api/available-fields-for-workout', async (req, res) => {
  try {
    const { date, timeSlots } = req.body;
    
    console.log('🏟️ מקבל בקשה למגרשים זמינים:', { date, timeSlots });
    
    if (!date || !timeSlots || !Array.isArray(timeSlots)) {
      return res.json({
        success: false,
        message: 'תאריך ורשימת זמנים נדרשים'
      });
    }
    
    // בדיקה שהתאריך לא בעבר
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      return res.json({
        success: false,
        message: 'לא ניתן לבדוק זמינות לתאריך בעבר'
      });
    }
    
    const fieldsByTime = {};
    
    // עבור כל זמן, נבדוק אילו מגרשים זמינים
    for (const timeSlot of timeSlots) {
      console.log(`⏰ בודק זמינות ל-${timeSlot}`);
      
      // קבלת כל המגרשים
      const fieldsResult = await pool.query(
        'SELECT f.idField, f.fieldName, f.sportType, st.sportName FROM Field f JOIN SportTypes st ON f.sportType = st.sportType ORDER BY f.idField'
      );
      
      const availableFields = [];
      
      for (const field of fieldsResult.rows) {
        // בדיקה אם המגרש תפוס בזמן זה
        const bookingCheck = await pool.query(
          'SELECT * FROM BookField WHERE idField = $1 AND bookingDate = $2 AND startTime = $3',
          [field.idfield, date, timeSlot]
        );
        
        if (bookingCheck.rows.length === 0) {
          // המגרש זמין
          availableFields.push({
            id: field.idfield,
            name: field.fieldname,
            sportType: field.sportname,
            sportTypeId: field.sporttype
          });
        } else {
          console.log(`❌ מגרש ${field.fieldname} תפוס ב-${timeSlot}`);
        }
      }
      
      fieldsByTime[timeSlot] = availableFields;
      console.log(`✅ נמצאו ${availableFields.length} מגרשים זמינים ל-${timeSlot}`);
    }
    
    console.log('📊 סיכום זמינות:', Object.keys(fieldsByTime).map(time => 
      `${time}: ${fieldsByTime[time].length} מגרשים`
    ));
    
    res.json({
      success: true,
      fieldsByTime: fieldsByTime,
      totalTimeSlots: timeSlots.length,
      totalAvailableFields: Object.values(fieldsByTime).reduce((sum, fields) => sum + fields.length, 0)
    });
    
  } catch (err) {
    console.error('❌ שגיאה בבדיקת זמינות:', err);
    res.json({
      success: false,
      message: 'שגיאה בבדיקת זמינות המגרשים',
      error: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 השרת רץ על http://localhost:${PORT}`);
});