// backend/server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://wolfit-gym-frontend.onrender.com', 'https://wolfit-gym.onrender.com']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting middleware (בסיסי)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 דקות
const RATE_LIMIT_MAX_REQUESTS = 100; // מקסימום בקשות לחלון זמן

const rateLimitMiddleware = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitMap.has(clientIP)) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const clientData = rateLimitMap.get(clientIP);
  
  if (now > clientData.resetTime) {
    // חלון זמן חדש
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'יותר מדי בקשות. נסה שוב מאוחר יותר'
    });
  }
  
  clientData.count++;
  next();
};

// החלת rate limiting על כל הבקשות
app.use(rateLimitMiddleware);

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

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
    
    // אימות מאובטח של הנתונים מ-Google
    let googleData;
    try {
      // בדיקה שהטוקן תקין (ללא אימות חתימה - זה נעשה בצד הלקוח)
      googleData = jwt.decode(credential);
      
      if (!googleData || !googleData.sub || !googleData.email) {
        throw new Error('נתוני Google לא תקינים');
      }
      
      // בדיקה שהטוקן לא פג תוקף
      const now = Math.floor(Date.now() / 1000);
      if (googleData.exp && googleData.exp < now) {
        throw new Error('טוקן Google פג תוקף');
      }
      
      // בדיקה שהטוקן מיועד לאפליקציה שלנו
      const expectedClientId = process.env.GOOGLE_CLIENT_ID || "386514389479-impprp7mgpalddmuflkvev582v8idjug.apps.googleusercontent.com";
      if (googleData.aud !== expectedClientId) {
        console.warn('⚠️ ניסיון התחברות עם Client ID לא תקין:', googleData.aud);
        throw new Error('טוקן Google לא תקין');
      }
      
    } catch (jwtError) {
      console.error('❌ שגיאה באימות Google token:', jwtError.message);
      return res.json({
        success: false,
        message: 'נתוני Google לא תקינים או פגי תוקף'
      });
    }
    
    // לוג מאובטח - לא נשמור נתונים רגישים
    console.log('🔍 התחברות Google:', {
      googleId: googleData.sub,
      email: googleData.email ? googleData.email.replace(/(.{2}).*(@.*)/, '$1***$2') : 'N/A',
      name: googleData.name ? googleData.name.substring(0, 2) + '***' : 'N/A',
      timestamp: new Date().toISOString()
    });
    
    // בדיקה אם המשתמש קיים
    const existingUser = await pool.query(
      'SELECT * FROM "User" WHERE googleId = $1 OR email = $2',
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

// API להרשמת משתמש חדש (כולל Google OAuth)
app.post('/api/register', async (req, res) => {
  try {
    const { 
      userName, 
      email, 
      password, 
      height, 
      weight, 
      birthdate, 
      intensityLevel, 
      selectedSports,
      googleData 
    } = req.body;
    
    // לוג מאובטח - לא נשמור נתונים רגישים
    console.log('📝 בקשה להרשמה:', { 
      userName: userName ? userName.substring(0, 2) + '***' : 'N/A',
      email: email ? email.replace(/(.{2}).*(@.*)/, '$1***$2') : 'N/A',
      hasPassword: !!password,
      hasGoogleData: !!googleData,
      selectedSports: selectedSports?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    // בדיקות בסיסיות
    if (!email) {
      return res.json({
        success: false,
        message: 'כתובת אימייל נדרשת'
      });
    }
    
    // אם זה משתמש Google, נבדוק שיש נתוני Google
    if (googleData) {
      if (!googleData.googleId || !googleData.email) {
        return res.json({
          success: false,
          message: 'נתוני Google חסרים'
        });
      }
      
      // וידוא שהאימייל תואם
      if (googleData.email !== email) {
        return res.json({
          success: false,
          message: 'כתובת האימייל לא תואמת לנתוני Google'
        });
      }
    } else {
      // משתמש רגיל - נדרש סיסמה ושם משתמש
      if (!password || !userName) {
        return res.json({
          success: false,
          message: 'שם משתמש וסיסמה נדרשים'
        });
      }
    }
    
    // בדיקה שהאימייל לא קיים כבר
    const existingEmail = await pool.query(
      'SELECT idUser FROM "User" WHERE email = $1',
      [email]
    );
    
    if (existingEmail.rows.length > 0) {
      return res.json({
        success: false,
        message: 'כתובת אימייל זו כבר רשומה במערכת'
      });
    }
    
    // בדיקה שהשם משתמש לא קיים (אם סופק)
    if (userName) {
      const existingUserName = await pool.query(
        'SELECT idUser FROM "User" WHERE userName = $1',
        [userName]
      );
      
      if (existingUserName.rows.length > 0) {
        return res.json({
          success: false,
          message: 'שם משתמש זה כבר תפוס'
        });
      }
    }
    
    // הצפנת סיסמה אם קיימת
    let hashedPassword = null;
    if (password) {
      const saltRounds = 12;
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }
    
    // יצירת המשתמש
    const insertQuery = `
      INSERT INTO "User" (
        userName, 
        password, 
        email, 
        height, 
        weight, 
        birthdate, 
        intensityLevel,
        googleId,
        profilePicture,
        authProvider
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING idUser, userName, email, profilePicture
    `;
    
    const userValues = [
      userName || null,
      hashedPassword,
      email,
      height || null,
      weight || null,
      birthdate || null,
      intensityLevel || 'medium',
      googleData?.googleId || null,
      googleData?.picture || null,
      googleData ? 'google' : 'local'
    ];
    
    const userResult = await pool.query(insertQuery, userValues);
    const newUser = userResult.rows[0];
    
    console.log('✅ נוצר משתמש חדש:', {
      id: newUser.iduser,
      email: newUser.email,
      authProvider: googleData ? 'google' : 'local'
    });
    
    // הוספת העדפות ספורט אם סופקו
    if (selectedSports && selectedSports.length > 0) {
      for (let i = 0; i < selectedSports.length; i++) {
        const sportType = selectedSports[i];
        await pool.query(
          'INSERT INTO UserPreferences (idUser, sportType, preferenceRank) VALUES ($1, $2, $3)',
          [newUser.iduser, sportType, i + 1]
        );
      }
      console.log(`✅ נוספו ${selectedSports.length} העדפות ספורט`);
    }
    
    res.json({
      success: true,
      message: 'ההרשמה הושלמה בהצלחה!',
      user: {
        id: newUser.iduser,
        userName: newUser.username || googleData?.name,
        email: newUser.email,
        profilePicture: newUser.profilepicture || googleData?.picture
      }
    });
    
  } catch (err) {
    console.error('❌ שגיאה בהרשמה:', err);
    res.json({
      success: false,
      message: 'שגיאה בהרשמה',
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
    
    // קבלת התאריך והשעה הנוכחיים
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
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
      
      return {
        id: row.idfield + '_' + row.bookingdate + '_' + row.starttime, // יצירת מזהה ייחודי
        date: row.bookingdate,
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


app.listen(PORT, () => {
  console.log(`🚀 השרת רץ על http://localhost:${PORT}`);
});