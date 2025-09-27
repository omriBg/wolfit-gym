// Wolfit Gym Backend Server
require('dotenv').config();

// כפיית IPv4 עבור Supabase
process.env.NODE_OPTIONS = '--dns-result-order=ipv4first';
process.env.NODE_DNS_RESOLVER = 'ipv4first';

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// כפיית IPv4 נוספת
const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options.family = 4; // כפיית IPv4
  console.log('🔍 DNS lookup override for:', hostname, 'forcing IPv4');
  return originalLookup.call(this, hostname, options, callback);
};

// כפיית IPv4 נוספת
const originalResolve = dns.resolve;
dns.resolve = function(hostname, rrtype, callback) {
  if (typeof rrtype === 'function') {
    callback = rrtype;
    rrtype = 'A'; // כפיית IPv4
  }
  console.log('🔍 DNS resolve override for:', hostname, 'forcing IPv4');
  return originalResolve.call(this, hostname, rrtype, callback);
};

// כפיית IPv4 עבור מסד הנתונים
if (process.env.DATABASE_URL) {
  // הוספת sslmode=require ל-connection string
  if (!process.env.DATABASE_URL.includes('sslmode=')) {
    process.env.DATABASE_URL += '?sslmode=require';
  }
  console.log('🔧 Database URL configured for IPv4');
}

// כפיית IPv4 עבור מסד הנתונים
if (process.env.DB_FORCE_IPV4 === 'true') {
  console.log('🔧 DB_FORCE_IPV4 enabled - forcing IPv4 connection');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

// Database connection
const { pool, testConnection, waitForPoolReady } = require('./utils/database');

const app = express();
const PORT = process.env.PORT || 10000;

// Trust proxy for rate limiting (fixes X-Forwarded-For error)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://wolfit-gym.vercel.app',
    'https://wolfit-gym-frontend.vercel.app'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'יותר מדי ניסיונות התחברות, נסה שוב בעוד 15 דקות'
});

// בדיקת JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
console.log('🔍 בדיקת JWT_SECRET:', JWT_SECRET ? 'קיים' : 'חסר');
console.log('🔍 אורך JWT_SECRET:', JWT_SECRET ? JWT_SECRET.length : 0);

if (!JWT_SECRET) {
  console.error('❌ שגיאה קריטית: JWT_SECRET לא מוגדר במשתני הסביבה!');
  process.exit(1);
}

if (JWT_SECRET.length < 32) {
  console.error('❌ שגיאה קריטית: JWT_SECRET קצר מדי! צריך לפחות 32 תווים, יש:', JWT_SECRET.length);
  process.exit(1);
}

console.log('✅ JWT_SECRET תקין, ממשיך...');

// Middleware לאימות JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'לא מחובר - טוקן חסר'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'טוקן לא תקין או פג תוקף'
      });
    }
    req.user = user;
    next();
  });
};

// Health Check
app.get('/health', async (req, res) => {
  try {
    console.log('🔍 Testing database connection...');
    const dbTest = await testConnection();
    const status = dbTest.success ? 'healthy' : 'unhealthy';
    const statusCode = dbTest.success ? 200 : 503;
    
    console.log('🔍 Database test result:', dbTest.success ? 'SUCCESS' : 'FAILED');
    if (!dbTest.success) {
      console.log('❌ Database error:', dbTest.error);
    }
    
    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbTest.success ? 'connected' : 'disconnected',
        error: dbTest.success ? null : dbTest.error
      }
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'error',
        error: error.message
      }
    });
  }
});

// Google Login API
app.post('/api/google-login', loginLimiter, async (req, res) => {
  try {
    console.log('🔍 Google Login Request:', req.body);
    
    if (!req.body || !req.body.credential) {
      console.error('❌ No credential in request body');
      return res.status(400).json({
        success: false,
        message: 'נתוני Google חסרים'
      });
    }
    
    const { credential } = req.body;
    
    // פענוח הנתונים מ-Google
    console.log('📦 Decoding credential:', credential);
    let googleData;
    try {
      googleData = jwt.decode(credential);
      console.log('📦 Decoded Google data:', googleData);
    } catch (error) {
      console.error('❌ Error decoding Google token:', error);
      return res.status(400).json({
        success: false,
        message: 'שגיאה בפענוח נתוני Google'
      });
    }
    
    if (!googleData || !googleData.sub || !googleData.email) {
      console.error('❌ נתוני Google לא תקינים:', { googleData });
      return res.status(400).json({
        success: false,
        message: 'נתוני Google לא תקינים'
      });
    }
    
    // בדיקה אם המשתמש קיים במסד הנתונים
    console.log('🔍 Checking if user exists:', {
      googleId: googleData.sub,
      email: googleData.email
    });
    
    // המתנה ל-pool להיות מוכן
    const readyPool = await waitForPoolReady();
    
    const existingUser = await readyPool.query(
      'SELECT * FROM "User" WHERE googleid = $1 OR email = $2',
      [googleData.sub, googleData.email]
    );
    
    let user;
    if (existingUser.rows.length > 0) {
      // משתמש קיים - התחברות ישירה
      user = existingUser.rows[0];
      console.log('✅ משתמש קיים:', user.email);
    } else {
      // משתמש חדש - יצירת רשומה חדשה
      console.log('🆕 יוצר משתמש חדש:', googleData.email);
      const newUser = await readyPool.query(
        'INSERT INTO "User" (googleid, email, name, picture) VALUES ($1, $2, $3, $4) RETURNING *',
        [googleData.sub, googleData.email, googleData.name, googleData.picture]
      );
      user = newUser.rows[0];
      console.log('✅ משתמש חדש נוצר:', user.email);
    }
    
    // יצירת JWT token
    const token = jwt.sign(
      { 
        userId: user.iduser,
        email: user.email,
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('✅ Google login successful for:', user.email);
    
    res.json({
      success: true,
      message: 'התחברות הצליחה',
      token,
      user: {
        id: user.iduser,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    });
    
  } catch (error) {
    console.error('❌ Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בהתחברות',
      error: error.message
    });
  }
});

// Verify Token API
app.get('/api/verify-token', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'טוקן תקין',
      user: req.user
    });
  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה באימות טוקן'
    });
  }
});

// API לטעינת העדפות משתמש
app.get('/api/user-preferences/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'מזהה משתמש לא תקין'
      });
    }
    
    // המתנה ל-pool להיות מוכן
    const readyPool = await waitForPoolReady();
    
    const userResult = await readyPool.query(
      'SELECT * FROM "User" WHERE idUser = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }
    
    const preferencesResult = await readyPool.query(
      'SELECT sporttype FROM UserPreferences WHERE idUser = $1 ORDER BY preferenceRank',
      [userId]
    );
    
    const selectedSports = preferencesResult.rows.map(row => row.sporttype);
    
    res.json({
      success: true,
      user: userResult.rows[0],
      preferences: {
        intensityLevel: userResult.rows[0].intensitylevel,
        selectedSports: selectedSports
      }
    });
    
  } catch (error) {
    console.error('❌ Error loading user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת העדפות'
    });
  }
});

// API לשמירת העדפות משתמש
app.put('/api/save-user-preferences/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { intensityLevel, selectedSports } = req.body;
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'מזהה משתמש לא תקין'
      });
    }
    
    if (intensityLevel === undefined && !selectedSports) {
      return res.status(400).json({
        success: false,
        message: 'נתונים לשמירה חסרים'
      });
    }
    
    // המתנה ל-pool להיות מוכן
    const readyPool = await waitForPoolReady();
    
    const client = await readyPool.connect();
    
    try {
      // בדיקה שהמשתמש קיים
      const userCheck = await client.query(
        'SELECT idUser FROM "User" WHERE idUser = $1',
        [userId]
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'משתמש לא נמצא'
        });
      }
      
      // עדכון רמת אינטנסיביות
      if (intensityLevel !== undefined) {
        await client.query(
          'UPDATE "User" SET intensityLevel = $1 WHERE idUser = $2',
          [intensityLevel, userId]
        );
      }
      
      // עדכון העדפות ספורט
      if (selectedSports && Array.isArray(selectedSports)) {
        // מחיקת העדפות קיימות
        await client.query(
          'DELETE FROM UserPreferences WHERE idUser = $1',
          [userId]
        );
        
        // הוספת העדפות חדשות
        for (let i = 0; i < selectedSports.length; i++) {
          if (selectedSports[i]) { // וידוא שהערך לא ריק
            await client.query(
              'INSERT INTO UserPreferences (idUser, sportType, preferenceRank) VALUES ($1, $2, $3)',
              [userId, selectedSports[i], i + 1]
            );
          }
        }
      }
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
    res.json({
      success: true,
      message: 'העדפות נשמרו בהצלחה'
    });
    
  } catch (error) {
    console.error('❌ Error saving user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשמירת העדפות'
    });
  }
});

// API לשמירת אימון
app.post('/api/save-workout', authenticateToken, async (req, res) => {
  try {
    const { bookings, userId, date } = req.body;
    
    console.log('💾 מקבל בקשה לשמירת אימון:', { userId, date, bookings: bookings?.length });
    
    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
      return res.json({
        success: false,
        message: 'נתוני הזמנות חסרים'
      });
    }
    
    if (!userId) {
      return res.json({
        success: false,
        message: 'מזהה משתמש חסר'
      });
    }
    
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      return res.json({
        success: false,
        message: 'לא ניתן להזמין לתאריך בעבר'
      });
    }
    
    if (date === today) {
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
      const pastBookings = bookings.filter(booking => booking.startTime < currentTime);
      
      if (pastBookings.length > 0) {
        return res.json({
          success: false,
          message: 'לא ניתן להזמין לזמן שכבר עבר'
        });
      }
    }
    
    // המתנה ל-pool להיות מוכן
    const readyPool = await waitForPoolReady();
    
    const client = await readyPool.connect();
    
    try {
      // בדיקה שהמשתמש קיים
      const userCheck = await client.query(
        'SELECT idUser FROM "User" WHERE idUser = $1',
        [userId]
      );
      
      if (userCheck.rows.length === 0) {
        return res.json({
          success: false,
          message: 'משתמש לא נמצא'
        });
      }
      
      let successCount = 0;
      
      for (const booking of bookings) {
        const { idField, startTime, endTime } = booking;
        
        // בדיקת התנגשות עם הזמנות קיימות
        const conflictCheck = await client.query(
          'SELECT * FROM BookField WHERE idField = $1 AND bookingdate = $2 AND starttime = $3',
          [idField, date, startTime]
        );
        
        if (conflictCheck.rows.length > 0) {
          const conflict = conflictCheck.rows[0];
          return res.json({
            success: false,
            message: `המגרש תפוס ב-${startTime} על ידי משתמש אחר`
          });
        }
        
        // בדיקה שהמגרש קיים
        const fieldCheck = await client.query(
          'SELECT idField FROM Field WHERE idField = $1',
          [idField]
        );
        
        if (fieldCheck.rows.length === 0) {
          console.warn(`⚠️ מגרש ${idField} לא נמצא, מדלג...`);
          continue;
        }
        
        // בדיקה שהמשתמש לא הזמין כבר באותו זמן
        const existingBooking = await client.query(
          'SELECT * FROM BookField WHERE iduser = $1 AND bookingdate = $2 AND starttime = $3',
          [userId, date, startTime]
        );
        
        if (existingBooking.rows.length > 0) {
          console.warn(`⚠️ משתמש ${userId} כבר הזמין ב-${startTime}, מדלג...`);
          continue;
        }
        
        // שמירת ההזמנה
        await client.query(
          'INSERT INTO BookField (iduser, idField, bookingdate, starttime, endtime) VALUES ($1, $2, $3, $4, $5)',
          [userId, idField, date, startTime, endTime]
        );
        
        successCount++;
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: `נשמרו ${successCount} הזמנות מתוך ${bookings.length}`,
        savedCount: successCount,
        totalCount: bookings.length
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error saving workout:', error);
    res.json({
      success: false,
      message: 'שגיאה בשמירת האימון',
      error: error.message
    });
  }
});

// API לקבלת מגרשים זמינים
app.post('/api/available-fields-for-workout', authenticateToken, async (req, res) => {
  try {
    const { date, timeSlots, userId } = req.body;
    
    console.log('🏃 מקבל בקשה למגרשים זמינים:', { userId, date, timeSlots: timeSlots?.length });
    
    if (!date || !timeSlots || !Array.isArray(timeSlots)) {
      return res.json({
        success: false,
        message: 'נתונים חסרים: date ו-timeSlots נדרשים'
      });
    }
    
    if (!userId) {
      return res.json({
        success: false,
        message: 'מזהה משתמש חסר'
      });
    }
    
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      return res.json({
        success: false,
        message: 'לא ניתן להזמין לתאריך בעבר'
      });
    }
    
    // המתנה ל-pool להיות מוכן
    const readyPool = await waitForPoolReady();
    
    // בדיקה שהמשתמש קיים
    const userCheck = await readyPool.query(
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
    const existingBookings = await readyPool.query(
      'SELECT starttime FROM BookField WHERE iduser = $1 AND bookingdate = $2',
      [userId, date]
    );
    
    const userBookedTimes = existingBookings.rows.map(row => row.starttime);
    console.log(`📅 משתמש הזמין כבר ב-${date}:`, userBookedTimes);
    
    const fieldsByTime = {};
    
    for (const timeSlot of timeSlots) {
      console.log(`⏰ בודק זמינות ל-${timeSlot}`);
      
      // בדיקה אם המשתמש כבר הזמין אימון בזמן זה
      let isUserBooked = false;
      for (const bookedTime of userBookedTimes) {
        if (!bookedTime) {
          console.log('⚠️ bookedTime הוא undefined, מדלג...');
          continue;
        }
        
        if (timeSlot === bookedTime) {
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
      const allFields = await readyPool.query('SELECT * FROM Field ORDER BY idField');
      const availableFields = [];
      
      for (const field of allFields.rows) {
        // בדיקה אם המגרש תפוס בזמן זה
        const bookingCheck = await readyPool.query(
          'SELECT * FROM BookField WHERE idField = $1 AND bookingdate = $2 AND starttime = $3',
          [field.idfield, date, timeSlot]
        );
        
        if (bookingCheck.rows.length === 0) {
          // המגרש זמין
          availableFields.push({
            idField: field.idfield,
            fieldName: field.fieldname,
            fieldType: field.fieldtype,
            capacity: field.capacity
          });
        }
      }
      
      fieldsByTime[timeSlot] = availableFields;
    }
    
    res.json({
      success: true,
      fieldsByTime,
      userBookedTimes
    });
    
  } catch (error) {
    console.error('❌ Error getting available fields:', error);
    res.json({
      success: false,
      message: 'שגיאה בקבלת מגרשים זמינים',
      error: error.message
    });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Wolfit Gym Backend Server is working!',
    version: '1.0.0',
    endpoints: [
      'GET /health - Health check with database status',
      'POST /api/google-login - Google authentication with database',
      'POST /api/verify-token - Token verification',
      'GET /api/user-preferences/:userId - Load user preferences',
      'PUT /api/save-user-preferences/:userId - Save user preferences',
      'POST /api/save-workout - Save workout bookings',
      'POST /api/available-fields-for-workout - Get available fields'
    ]
  });
});

// Start server
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log('✅ Google Login API ready');
  console.log('✅ Health check ready');
});
