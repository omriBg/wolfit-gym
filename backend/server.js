// backend/server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { OptimalHungarianAlgorithm, CompleteOptimalWorkoutScheduler, SPORT_MAPPING } = require('./optimalWorkoutAlgorithm');
const { sendWorkoutBookingEmail } = require('./emailService');
const { startReminderService } = require('./reminderService');
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
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
    sslmode: 'require'
  } : false,
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

// API לשמירת העדפות משתמש
app.put('/api/save-user-preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { intensityLevel, selectedSports } = req.body;
    
    console.log('💾 מקבל בקשה לשמירת העדפות:', { userId, intensityLevel, selectedSports });
    
    if (!userId) {
      return res.json({
        success: false,
        message: 'מזהה משתמש נדרש'
      });
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
    
    // עדכון רמת עוצמה
    if (intensityLevel !== undefined) {
      await pool.query(
        'UPDATE "User" SET intensityLevel = $1 WHERE idUser = $2',
        [intensityLevel, userId]
      );
    }
    
    // מחיקת העדפות קיימות
    await pool.query(
      'DELETE FROM UserPreferences WHERE idUser = $1',
      [userId]
    );
    
    // הוספת העדפות חדשות
    if (selectedSports && Array.isArray(selectedSports)) {
      for (let i = 0; i < selectedSports.length; i++) {
        await pool.query(
          'INSERT INTO UserPreferences (idUser, sportType, preferenceRank) VALUES ($1, $2, $3)',
          [userId, selectedSports[i], i + 1]
        );
      }
    }
    
    console.log('✅ העדפות נשמרו בהצלחה');
    
    res.json({
      success: true,
      message: 'העדפות נשמרו בהצלחה'
    });
    
  } catch (err) {
    console.error('❌ שגיאה בשמירת העדפות:', err);
    res.json({
      success: false,
      message: 'שגיאה בשמירת העדפות',
      error: err.message
    });
  }
});

// API להתחברות עם Google OAuth
app.post('/api/google-login', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.json({
        success: false,
        message: 'נתוני Google חסרים'
      });
    }
    
    // פענוח הנתונים מ-Google
    const googleData = jwt.decode(credential);
    
    if (!googleData) {
      return res.json({
        success: false,
        message: 'נתוני Google לא תקינים'
      });
    }
    
    console.log('🔍 נתוני Google:', {
      googleId: googleData.sub,
      email: googleData.email,
      name: googleData.name
    });
    
    // בדיקה אם המשתמש קיים
    const existingUser = await pool.query(
      'SELECT * FROM "User" WHERE "googleId" = $1 OR email = $2',
      [googleData.sub, googleData.email]
    );
    
    if (existingUser.rows.length > 0) {
      // משתמש קיים - התחברות ישירה
      const user = existingUser.rows[0];
      
      res.json({
        success: true,
        message: 'התחברות הצליחה!',
        user: {
          id: user.iduser,
          userName: user.username || googleData.name,
          email: user.email,
          profilePicture: user.profilepicture || googleData.picture
        }
      });
    } else {
      // משתמש חדש - צריך הרשמה
      res.json({
        success: false,
        message: 'משתמש לא קיים. אנא הירשם תחילה',
        isNewUser: true,
        googleData: {
          googleId: googleData.sub,
          name: googleData.name,
          email: googleData.email,
          picture: googleData.picture
        }
      });
    }
    
  } catch (err) {
    console.error('❌ שגיאה בהתחברות עם Google:', err);
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

// API לשמירת אימון
app.post('/api/save-workout', async (req, res) => {
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
      const { idField, bookingDate, startTime, idUser } = booking;
      
      // בדיקה שהמגרש קיים
      const fieldCheck = await pool.query(
        'SELECT idfield FROM Field WHERE idfield = $1',
        [idField]
      );
      
      if (fieldCheck.rows.length === 0) {
        console.warn(`⚠️ מגרש ${idField} לא נמצא, מדלג...`);
        continue;
      }
      
      // בדיקה שהמגרש לא תפוס כבר
      const existingBooking = await pool.query(
        'SELECT * FROM BookField WHERE idfield = $1 AND bookingdate = $2 AND starttime = $3',
        [idField, bookingDate, startTime]
      );
      
      if (existingBooking.rows.length > 0) {
        console.warn(`⚠️ מגרש ${idField} תפוס ב-${bookingDate} ${startTime}, מדלג...`);
        continue;
      }
      
      // הכנסת ההזמנה
      await pool.query(
        'INSERT INTO BookField (idfield, bookingdate, starttime, iduser) VALUES ($1, $2, $3, $4)',
        [idField, bookingDate, startTime, idUser]
      );
      
      console.log(`✅ נשמרה הזמנה: מגרש ${idField}, תאריך ${bookingDate}, שעה ${startTime}`);
    }
    
    // שליחת אימייל הזמנת אימון
    try {
      console.log('📧 שולח אימייל הזמנת אימון...');
      
      // קבלת פרטי המשתמש
      const userResult = await pool.query(
        'SELECT username, email FROM "User" WHERE idUser = $1',
        [userId]
      );
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        
        // קבלת פרטי האימון המלאים
        const workoutSlots = [];
        for (const booking of bookings) {
          const fieldResult = await pool.query(
            'SELECT f.fieldname, f.sporttype, st.sportname FROM Field f JOIN SportTypes st ON f.sporttype = st.sporttype WHERE f.idfield = $1',
            [booking.idField]
          );
          
          if (fieldResult.rows.length > 0) {
            const field = fieldResult.rows[0];
            workoutSlots.push({
              time: booking.startTime,
              field: {
                name: field.fieldname,
                sportType: field.sportname
              }
            });
          }
        }
        
        // מיון לפי זמן
        workoutSlots.sort((a, b) => a.time.localeCompare(b.time));
        
        const startTime = workoutSlots[0]?.time || bookings[0]?.startTime;
        const endTime = workoutSlots[workoutSlots.length - 1]?.time || bookings[bookings.length - 1]?.startTime;
        
        const workoutDetails = {
          date: date,
          startTime: startTime,
          endTime: endTime,
          slots: workoutSlots
        };
        
        const emailResult = await sendWorkoutBookingEmail(user.email, user.username, workoutDetails);
        
        if (emailResult.success) {
          console.log('✅ אימייל הזמנת אימון נשלח בהצלחה');
        } else {
          console.log('⚠️ שגיאה בשליחת אימייל:', emailResult.error);
        }
      }
    } catch (emailError) {
      console.error('❌ שגיאה בשליחת אימייל הזמנת אימון:', emailError);
      // לא נעצור את התהליך בגלל שגיאת אימייל
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
    const { date, timeSlots, userId } = req.body;
    
    console.log('🏟️ מקבל בקשה למגרשים זמינים:', { date, timeSlots, userId });
    
    if (!date || !timeSlots || !Array.isArray(timeSlots)) {
      return res.json({
        success: false,
        message: 'תאריך ורשימת זמנים נדרשים'
      });
    }
    
    if (!userId) {
      return res.json({
        success: false,
        message: 'מזהה משתמש נדרש'
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
    
    // קבלת הזמנות קיימות של המשתמש לתאריך זה
    console.log('🔍 בודק הזמנות קיימות של המשתמש...');
    const existingBookings = await pool.query(
      'SELECT starttime FROM BookField WHERE iduser = $1 AND bookingdate = $2',
      [userId, date]
    );
    
    const userBookedTimes = existingBookings.rows.map(row => row.starttime);
    console.log(`📅 משתמש הזמין כבר ב-${date}:`, userBookedTimes);
    
    const fieldsByTime = {};
    
    // עבור כל זמן, נבדוק אילו מגרשים זמינים
    for (const timeSlot of timeSlots) {
      console.log(`⏰ בודק זמינות ל-${timeSlot}`);
      
      // בדיקה אם המשתמש כבר הזמין אימון בזמן זה או בטווח של רבע שעה לפני ואחרי
      let isUserBooked = false;
      for (const bookedTime of userBookedTimes) {
        // חישוב רבע שעה לפני ואחרי הזמן הקיים
        const [hours, minutes] = bookedTime.split(':');
        const bookedMinutes = parseInt(hours) * 60 + parseInt(minutes);
        const beforeMinutes = bookedMinutes - 15;
        const afterMinutes = bookedMinutes + 15;
        
        // המרה חזרה לפורמט זמן
        const beforeHours = Math.floor(beforeMinutes / 60);
        const beforeMins = beforeMinutes % 60;
        const beforeTime = `${beforeHours.toString().padStart(2, '0')}:${beforeMins.toString().padStart(2, '0')}`;
        
        const afterHours = Math.floor(afterMinutes / 60);
        const afterMins = afterMinutes % 60;
        const afterTime = `${afterHours.toString().padStart(2, '0')}:${afterMins.toString().padStart(2, '0')}`;
        
        // בדיקה אם הזמן הנוכחי נמצא בטווח
        if (timeSlot === bookedTime || timeSlot === beforeTime || timeSlot === afterTime) {
          isUserBooked = true;
          console.log(`❌ משתמש כבר הזמין אימון ב-${bookedTime}, לא ניתן להזמין ב-${timeSlot}`);
          break;
        }
      }
      
      if (isUserBooked) {
        fieldsByTime[timeSlot] = [];
        continue;
      }
      
      // קבלת כל המגרשים
      const fieldsResult = await pool.query(
        'SELECT f.idfield, f.fieldname, f.sporttype, st.sportname FROM Field f JOIN SportTypes st ON f.sporttype = st.sporttype ORDER BY f.idfield'
      );
      
      const availableFields = [];
      
      for (const field of fieldsResult.rows) {
        // בדיקה אם המגרש תפוס בזמן זה
        const bookingCheck = await pool.query(
          'SELECT * FROM BookField WHERE idfield = $1 AND bookingdate = $2 AND starttime = $3',
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
// API לקבלת שעות תפוסות של משתמש לתאריך מסוים
app.get('/api/user-booked-times/:userId/:date', async (req, res) => {
  try {
    const { userId, date } = req.params;
    
    console.log(`🔍 מחפש שעות תפוסות עבור משתמש ${userId} בתאריך ${date}`);
    
    if (!userId || !date) {
      return res.json({
        success: false,
        message: 'מזהה משתמש ותאריך נדרשים'
      });
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
    
    // קבלת הזמנות קיימות של המשתמש לתאריך זה
    const existingBookings = await pool.query(
      'SELECT starttime FROM BookField WHERE iduser = $1 AND bookingdate = $2',
      [userId, date]
    );
    
    const bookedTimes = existingBookings.rows.map(row => row.starttime);
    console.log(`📅 משתמש הזמין ב-${date}:`, bookedTimes);
    
    // יצירת רשימת שעות תפוסות כולל רבע שעה לפני ואחרי
    const blockedTimes = new Set();
    
    for (const bookedTime of bookedTimes) {
      // חישוב רבע שעה לפני ואחרי הזמן הקיים
      const [hours, minutes] = bookedTime.split(':');
      const bookedMinutes = parseInt(hours) * 60 + parseInt(minutes);
      const beforeMinutes = bookedMinutes - 15;
      const afterMinutes = bookedMinutes + 15;
      
      // המרה חזרה לפורמט זמן
      const beforeHours = Math.floor(beforeMinutes / 60);
      const beforeMins = beforeMinutes % 60;
      const beforeTime = `${beforeHours.toString().padStart(2, '0')}:${beforeMins.toString().padStart(2, '0')}`;
      
      const afterHours = Math.floor(afterMinutes / 60);
      const afterMins = afterMinutes % 60;
      const afterTime = `${afterHours.toString().padStart(2, '0')}:${afterMins.toString().padStart(2, '0')}`;
      
      // הוספה לרשימת השעות התפוסות
      blockedTimes.add(beforeTime);
      blockedTimes.add(bookedTime);
      blockedTimes.add(afterTime);
    }
    
    const blockedTimesArray = Array.from(blockedTimes).sort();
    console.log(`🚫 שעות תפוסות כולל רבע שעה לפני ואחרי:`, blockedTimesArray);
    
    res.json({
      success: true,
      blockedTimes: blockedTimesArray,
      message: `נמצאו ${blockedTimesArray.length} שעות תפוסות`
    });
    
  } catch (err) {
    console.error('❌ שגיאה בקבלת שעות תפוסות:', err);
    res.json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message
    });
  }
});

// API לקבלת אימונים עתידיים של משתמש
app.get('/api/future-workouts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🏃 מחפש אימונים עתידיים עבור משתמש ${userId}`);
    
    if (!userId) {
      return res.json({
        success: false,
        message: 'מזהה משתמש נדרש'
      });
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
    
    // קבלת התאריך והשעה הנוכחיים בזמן מקומי
    const now = new Date();
    const currentDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
    
    console.log(`📅 מחפש אימונים מתאריך ${currentDate} שעה ${currentTime}`);
    
    // שאילתה לקבלת כל האימונים העתידיים (כולל אימונים שהתחילו אבל לא הסתיימו)
    const workoutsQuery = `
      SELECT 
        bf.idfield,
        bf.bookingdate,
        bf.starttime,
        f.idfield,
        f.fieldname,
        f.sporttype,
        st.sportname
      FROM bookfield bf
      JOIN field f ON bf.idfield = f.idfield
      JOIN sporttypes st ON f.sporttype = st.sporttype
      WHERE bf.iduser = $1 
        AND (
          bf.bookingdate > $2 
          OR (bf.bookingdate = $2 AND bf.starttime > $3)
        )
      ORDER BY bf.bookingdate, bf.starttime
    `;
    
    const result = await pool.query(workoutsQuery, [userId, currentDate, currentTime]);
    
    console.log(`🔍 נמצאו ${result.rows.length} אימונים עתידיים`);
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        workouts: [],
        message: 'אין אימונים עתידיים'
      });
    }
    
    // עיבוד התוצאות לפורמט נוח
    const workouts = result.rows.map(row => {
      // חישוב משך האימון (רבע שעה)
      const startTime = row.starttime;
      const [hours, minutes] = startTime.split(':');
      const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
      const endMinutes = startMinutes + 15; // רבע שעה
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      
      // המרת התאריך לפורמט מקומי
      let localDate;
      if (row.bookingdate instanceof Date) {
        // אם זה אובייקט Date, נמיר אותו לפורמט מקומי
        localDate = `${row.bookingdate.getFullYear()}-${(row.bookingdate.getMonth() + 1).toString().padStart(2, '0')}-${row.bookingdate.getDate().toString().padStart(2, '0')}`;
      } else {
        // אם זה מחרוזת, ננסה לפרסר אותה
        const date = new Date(row.bookingdate);
        localDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      }
      
      return {
        id: row.idfield + '_' + row.bookingdate + '_' + row.starttime, // יצירת מזהה ייחודי
        date: localDate,
        startTime: startTime,
        endTime: endTime,
        duration: 15, // רבע שעה
        fieldId: row.idfield,
        fieldName: row.fieldname,
        sportType: row.sportname,
        sportTypeId: row.sporttype
      };
    });
    
    // מיון האימונים לפי מגרש
    const workoutsByField = {};
    workouts.forEach(workout => {
      const key = workout.fieldName;
      if (!workoutsByField[key]) {
        workoutsByField[key] = [];
      }
      workoutsByField[key].push(workout);
    });
    
    console.log('📊 חלוקת אימונים לפי מגרש:', Object.keys(workoutsByField));
    
    res.json({
      success: true,
      workouts: workouts,
      workoutsByField: workoutsByField,
      totalWorkouts: workouts.length,
      message: `נמצאו ${workouts.length} אימונים עתידיים`
    });
    
  } catch (err) {
    console.error('❌ שגיאה בקבלת אימונים עתידיים:', err);
    res.json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message
    });
  }
});

// API ליצירת תוכנית אימון אופטימלית
app.post('/api/generate-optimal-workout', async (req, res) => {
  try {
    const { userId, date, timeSlots, userPreferences } = req.body;
    
    console.log('🎯 מקבל בקשה ליצירת אימון אופטימלי:', { userId, date, timeSlots: timeSlots?.length, userPreferences });
    
    if (!userId || !date || !timeSlots || !Array.isArray(timeSlots)) {
      return res.json({
        success: false,
        message: 'נתונים חסרים: userId, date, timeSlots נדרשים'
      });
    }
    
    // בדיקה שהתאריך לא בעבר
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      return res.json({
        success: false,
        message: 'לא ניתן ליצור אימון לתאריך בעבר'
      });
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
    
    // קבלת הזמנות קיימות של המשתמש לתאריך זה
    console.log('🔍 בודק הזמנות קיימות של המשתמש...');
    const existingBookings = await pool.query(
      'SELECT starttime FROM BookField WHERE iduser = $1 AND bookingdate = $2',
      [userId, date]
    );
    
    const userBookedTimes = existingBookings.rows.map(row => row.starttime);
    console.log(`📅 משתמש הזמין כבר ב-${date}:`, userBookedTimes);
    
    // קבלת מגרשים זמינים (שימוש בקוד הקיים)
    const fieldsByTime = {};
    
    for (const timeSlot of timeSlots) {
      console.log(`⏰ בודק זמינות ל-${timeSlot}`);
      
      // בדיקה אם המשתמש כבר הזמין אימון בזמן זה או בטווח של רבע שעה לפני ואחרי
      let isUserBooked = false;
      for (const bookedTime of userBookedTimes) {
        // חישוב רבע שעה לפני ואחרי הזמן הקיים
        const [hours, minutes] = bookedTime.split(':');
        const bookedMinutes = parseInt(hours) * 60 + parseInt(minutes);
        const beforeMinutes = bookedMinutes - 15;
        const afterMinutes = bookedMinutes + 15;
        
        // המרה חזרה לפורמט זמן
        const beforeHours = Math.floor(beforeMinutes / 60);
        const beforeMins = beforeMinutes % 60;
        const beforeTime = `${beforeHours.toString().padStart(2, '0')}:${beforeMins.toString().padStart(2, '0')}`;
        
        const afterHours = Math.floor(afterMinutes / 60);
        const afterMins = afterMinutes % 60;
        const afterTime = `${afterHours.toString().padStart(2, '0')}:${afterMins.toString().padStart(2, '0')}`;
        
        // בדיקה אם הזמן הנוכחי נמצא בטווח
        if (timeSlot === bookedTime || timeSlot === beforeTime || timeSlot === afterTime) {
          isUserBooked = true;
          console.log(`❌ משתמש כבר הזמין אימון ב-${bookedTime}, לא ניתן להזמין ב-${timeSlot}`);
          break;
        }
      }
      
      if (isUserBooked) {
        fieldsByTime[timeSlot] = [];
        continue;
      }
      
      const fieldsResult = await pool.query(
        'SELECT f.idfield, f.fieldname, f.sporttype, st.sportname FROM Field f JOIN SportTypes st ON f.sporttype = st.sporttype ORDER BY f.idfield'
      );
      
      const availableFields = [];
      
      for (const field of fieldsResult.rows) {
        const bookingCheck = await pool.query(
          'SELECT * FROM BookField WHERE idfield = $1 AND bookingdate = $2 AND starttime = $3',
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
      
      fieldsByTime[timeSlot] = availableFields;
    }
    
    // בדיקה שיש מגרשים זמינים
    const totalFields = Object.values(fieldsByTime).flat().length;
    if (totalFields === 0) {
      return res.json({
        success: false,
        message: 'אין מגרשים זמינים לתאריך ושעות שנבחרו'
      });
    }
    
    console.log('🏟️ מגרשים זמינים נטענו:', Object.keys(fieldsByTime).map(time => 
      `${time}: ${fieldsByTime[time].length} מגרשים`
    ));
    
    // יצירת תוכנית אימון אופטימלית
    console.log('🚀 מתחיל אלגוריתם הונגרי אופטימלי...');
    
    const scheduler = new CompleteOptimalWorkoutScheduler(
      timeSlots, 
      fieldsByTime, 
      userPreferences || []
    );
    
    const workoutPlan = scheduler.solve();
    
    console.log('✅ תוכנית אימון אופטימלית נוצרה:', {
      successfulSlots: workoutPlan.successfulSlots,
      totalSlots: workoutPlan.totalSlots,
      totalScore: workoutPlan.totalScore
    });
    
    res.json({
      success: true,
      workoutPlan: workoutPlan,
      message: `נוצרה תוכנית אימון אופטימלית עם ${workoutPlan.successfulSlots}/${workoutPlan.totalSlots} זמנים מוצלחים`
    });
    
  } catch (err) {
    console.error('❌ שגיאה ביצירת אימון אופטימלי:', err);
    console.error('❌ Stack trace:', err.stack);
    console.error('❌ נתוני הבקשה:', { userId, date, timeSlots: timeSlots?.length, userPreferences });
    res.json({
      success: false,
      message: 'שגיאה ביצירת האימון האופטימלי',
      error: err.message,
      details: err.stack
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 השרת רץ על http://localhost:${PORT}`);
  
  // הפעלת שירות תזכורות
  startReminderService();
});