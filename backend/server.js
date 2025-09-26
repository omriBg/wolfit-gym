// backend/server.js
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const timeout = require('connect-timeout');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { OptimalHungarianAlgorithm, CompleteOptimalWorkoutScheduler, SPORT_MAPPING } = require('./optimalWorkoutAlgorithm');
const { sendWorkoutBookingEmail, sendWorkoutCancellationEmail } = require('./emailService');
const { startReminderService } = require('./reminderService');

// Import utilities
const { pool, testConnection, queryWithTimeout, withTransaction } = require('./utils/database');
const { 
  globalErrorHandler, 
  handleUnhandledRejection, 
  handleUncaughtException, 
  handleNotFound, 
  catchAsync,
  AppError,
  logger 
} = require('./utils/errorHandler');
const { 
  basicHealthCheck, 
  detailedHealthCheck, 
  readinessCheck, 
  livenessCheck, 
  updateStats 
} = require('./utils/healthCheck');

require('dotenv').config();

// Handle unhandled promise rejections
process.on('unhandledRejection', handleUnhandledRejection);
process.on('uncaughtException', handleUncaughtException);

const app = express();
const PORT = process.env.PORT || 3001;

// Request timeout middleware
app.use(timeout('30s'));

// Compression middleware
app.use(compression());

// Middleware אבטחה בסיסי
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    updateStats(isError);
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId || 'anonymous'
    });
  });
  
  next();
});

// Rate limiting - הגבלת בקשות (מותאם לפיתוח)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: process.env.NODE_ENV === 'development' ? 10000 : 1000, // הרבה יותר מקל בפיתוח
  message: {
    success: false,
    message: 'יותר מדי בקשות, נסה שוב מאוחר יותר'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // דלג על בקשות health check
  skip: (req) => {
    return req.path.startsWith('/health') ||
           req.path.startsWith('/ready') ||
           req.path.startsWith('/live');
  }
});

// Rate limiting מיוחד להתחברות
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: 5, // מקסימום 5 ניסיונות התחברות לכל IP ב-15 דקות
  message: {
    success: false,
    message: 'יותר מדי ניסיונות התחברות, נסה שוב מאוחר יותר'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// הגדרות CORS מאובטחות
const corsOptions = {
  origin: function (origin, callback) {
    // רשימת דומיינים מורשים
    const allowedOrigins = [
      'http://localhost:3000',  // React development
      'http://localhost:3001',  // Backend development
      'https://your-production-domain.com',  // Production domain
      'https://www.your-production-domain.com'  // Production domain with www
    ];
    
    // בדיקה אם הדומיין מורשה או אם זה בקשה מהשרת עצמו (Postman, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      console.log(`✅ CORS: דומיין מורשה: ${origin || 'no origin (server request)'}`);
      callback(null, true);
    } else {
      console.warn(`🚫 CORS: דומיין לא מורשה מנסה לגשת: ${origin}`);
      callback(new Error('לא מורשה על ידי מדיניות CORS'));
    }
  },
  credentials: true,  // מאפשר שליחת cookies ו-headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// JWT Secret - חובה להיות מוגדר במשתני סביבה
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ שגיאה קריטית: JWT_SECRET לא מוגדר במשתני הסביבה!');
  process.exit(1);
}

// Middleware לאימות JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('🔍 בדיקת אימות:', {
    url: req.originalUrl,
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    tokenLength: token ? token.length : 0
  });

  if (!token) {
    console.log('❌ טוקן חסר עבור:', req.originalUrl);
    return res.status(401).json({
      success: false,
      message: 'לא מחובר - טוקן חסר'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ טוקן לא תקין עבור:', req.originalUrl, err.message);
      return res.status(403).json({
        success: false,
        message: 'טוקן לא תקין או פג תוקף'
      });
    }
    console.log('✅ טוקן תקין עבור:', req.originalUrl, 'משתמש:', user.userId);
    req.user = user;
    next();
  });
};

// בדיקה שכל הנתונים החיוניים מוגדרים
const requiredDbVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredDbVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error('שגיאה קריטית: משתני סביבה חסרים למסד הנתונים', { missingVars });
  process.exit(1);
}

// בדיקת חיבור ראשונית למסד הנתונים
(async () => {
  try {
    const connectionTest = await testConnection();
    if (connectionTest.success) {
      logger.info('חיבור למסד הנתונים הוקם בהצלחה');
    } else {
      logger.warn('⚠️  מסד הנתונים לא זמין - השרת יפעל במצב מוגבל');
      logger.warn('להפעלה מלאה, התקן PostgreSQL או השתמש ב-Docker');
    }
  } catch (err) {
    logger.warn('⚠️  מסד הנתונים לא זמין - השרת יפעל במצב מוגבל');
    logger.warn('להפעלה מלאה, התקן PostgreSQL או השתמש ב-Docker');
  }
})();

// Health Check Endpoints
app.get('/health', catchAsync(async (req, res) => {
  const health = await basicHealthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
}));

app.get('/health/detailed', catchAsync(async (req, res) => {
  const health = await detailedHealthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
}));

app.get('/ready', catchAsync(async (req, res) => {
  const readiness = await readinessCheck();
  const statusCode = readiness.ready ? 200 : 503;
  res.status(statusCode).json(readiness);
}));

app.get('/live', (req, res) => {
  const liveness = livenessCheck();
  res.status(200).json(liveness);
});

// Legacy test endpoint
app.get('/test', catchAsync(async (req, res) => {
  const connectionTest = await testConnection();
  if (connectionTest.success) {
    res.json({
      success: true,
      message: 'חיבור למסד הנתונים הצליח!',
      timestamp: connectionTest.data.current_time
    });
  } else {
    throw new AppError('שגיאה בחיבור למסד הנתונים', 503);
  }
}));
// API לטעינת העדפות משתמש
app.get('/api/user-preferences/:userId', authenticateToken, catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  if (!userId || isNaN(userId)) {
    throw new AppError('מזהה משתמש לא תקין', 400);
  }
  
  const userResult = await queryWithTimeout(
    'SELECT intensityLevel FROM "User" WHERE idUser = $1',
    [userId]
  );
  
  if (userResult.rows.length === 0) {
    throw new AppError('משתמש לא נמצא', 404);
  }
  
  const preferencesResult = await queryWithTimeout(
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
}));

// API לשמירת העדפות משתמש
app.put('/api/save-user-preferences/:userId', authenticateToken, catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { intensityLevel, selectedSports } = req.body;
  
  if (!userId || isNaN(userId)) {
    throw new AppError('מזהה משתמש לא תקין', 400);
  }
  
  if (intensityLevel === undefined && !selectedSports) {
    throw new AppError('נתונים לשמירה חסרים', 400);
  }
  
  logger.info('מקבל בקשה לשמירת העדפות', { userId, intensityLevel, selectedSports });
  
  // ביצוע transaction עבור כל השינויים
  await withTransaction(async (client) => {
    // בדיקה שהמשתמש קיים
    const userCheck = await client.query(
      'SELECT idUser FROM "User" WHERE idUser = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      throw new AppError('משתמש לא נמצא', 404);
    }
    
    // עדכון רמת עוצמה
    if (intensityLevel !== undefined) {
      await client.query(
        'UPDATE "User" SET intensityLevel = $1 WHERE idUser = $2',
        [intensityLevel, userId]
      );
    }
    
    // מחיקת העדפות קיימות
    await client.query(
      'DELETE FROM UserPreferences WHERE idUser = $1',
      [userId]
    );
    
    // הוספת העדפות חדשות
    if (selectedSports && Array.isArray(selectedSports)) {
      for (let i = 0; i < selectedSports.length; i++) {
        if (selectedSports[i]) { // וידוא שהערך לא ריק
          await client.query(
            'INSERT INTO UserPreferences (idUser, sportType, preferenceRank) VALUES ($1, $2, $3)',
            [userId, selectedSports[i], i + 1]
          );
        }
      }
    }
  });
  
  logger.info('העדפות נשמרו בהצלחה', { userId });
  
  res.json({
    success: true,
    message: 'העדפות נשמרו בהצלחה'
  });
}));

// API להתחברות עם Google OAuth בלבד
// הסרנו את מערכת הסיסמאות הרגילות - רק Google OAuth נתמך

// API להתחברות עם Google OAuth
app.post('/api/google-login', loginLimiter, catchAsync(async (req, res) => {
  const { credential } = req.body;
  
  if (!credential) {
    throw new AppError('נתוני Google חסרים', 400);
  }
  
  // פענוח הנתונים מ-Google
  const googleData = jwt.decode(credential);
  
  if (!googleData || !googleData.sub || !googleData.email) {
    throw new AppError('נתוני Google לא תקינים', 400);
  }
  
  logger.info('מקבל בקשה להתחברות עם Google', {
    googleId: googleData.sub,
    email: googleData.email,
    name: googleData.name
  });
  
  // בדיקה אם המשתמש קיים
  const existingUser = await queryWithTimeout(
    'SELECT * FROM "User" WHERE googleid = $1 OR email = $2',
    [googleData.sub, googleData.email]
  );
  
  if (existingUser.rows.length > 0) {
    // משתמש קיים - התחברות ישירה
    const user = existingUser.rows[0];
    
    // יצירת JWT token
    const token = jwt.sign(
      { 
        userId: user.iduser,
        email: user.email,
        userName: user.username || googleData.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    logger.info('התחברות הצליחה', { userId: user.iduser, email: user.email });
    
    res.json({
      success: true,
      message: 'התחברות הצליחה!',
      token: token,
      user: {
        id: user.iduser,
        userName: user.username || googleData.name,
        email: user.email
      }
    });
  } else {
    // משתמש חדש - צריך הרשמה
    logger.info('משתמש חדש מנסה להתחבר', { email: googleData.email });
    
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
}));

// API לבדיקת טוקן ואימות משתמש
app.get('/api/verify-token', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    
    // קבלת פרטי המשתמש מהמסד נתונים
    const userResult = await pool.query(
      'SELECT iduser, username, email FROM "User" WHERE iduser = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }
    
    const user = userResult.rows[0];
    
    res.json({
      success: true,
      message: 'טוקן תקין',
      user: {
        id: user.iduser,
        userName: user.username,
        email: user.email
      }
    });
    
  } catch (err) {
    console.error('❌ שגיאה בבדיקת טוקן:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message
    });
  }
});

// API לרישום משתמש חדש
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
      googleId, 
      sportPreferences,
      selectedSports,
      sportsRanked
    } = req.body;
    
    console.log('📝 מקבל בקשה לרישום:', { userName, email, googleId });
    console.log('📝 כל הנתונים:', req.body);
    
    if (!userName || !email) {
      return res.json({
        success: false,
        message: 'שם משתמש ואימייל נדרשים'
      });
    }
    
    // בדיקה אם המשתמש כבר קיים
    const existingUser = await pool.query(
      'SELECT idUser FROM "User" WHERE email = $1 OR userName = $2',
      [email, userName]
    );
    
    if (existingUser.rows.length > 0) {
      return res.json({
        success: false,
        message: 'משתמש עם אימייל או שם משתמש זה כבר קיים'
      });
    }
    
    // פונקציה להמרת פורמט תאריך מ-DD/MM/YYYY ל-YYYY-MM-DD
    const convertDateFormat = (dateString) => {
      if (!dateString || dateString === '') {
        return null;
      }
      
      const [day, month, year] = dateString.split('/');
      if (day && month && year) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      return null;
    };
    
    // המרת פורמט תאריך מ-DD/MM/YYYY ל-YYYY-MM-DD
    console.log('🔍 תאריך מקורי:', birthdate);
    const formattedBirthdate = convertDateFormat(birthdate);
    console.log('🔍 תאריך מומר:', formattedBirthdate);
    
    // הכנסת המשתמש למסד הנתונים (ללא סיסמה - רק Google OAuth)
    console.log('💾 שומר משתמש במסד נתונים:', {
      userName, email, height, weight, birthdate: formattedBirthdate, intensityLevel, googleId
    });
    
    const result = await pool.query(
      `INSERT INTO "User" (username, email, password, height, weight, birthdate, intensitylevel, googleid) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING iduser, username, email`,
      [userName, email, '', // סיסמה ריקה - רק Google OAuth
       height && height !== '' ? parseInt(height) : null, 
       weight && weight !== '' ? parseInt(weight) : null, 
       formattedBirthdate, 
       intensityLevel, googleId]
    );
    
    const newUser = result.rows[0];
    
    // יצירת JWT token
    const token = jwt.sign(
      { 
        userId: newUser.iduser,
        email: newUser.email,
        userName: newUser.username
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // שמירת העדפות ספורט אם קיימות
    let sportsToSave = null;
    
    // בדיקה איזה פורמט של העדפות הגיע
    if (selectedSports && Array.isArray(selectedSports) && selectedSports.length > 0) {
      // פורמט פשוט - רק הספורטים שנבחרו
      sportsToSave = selectedSports;
      console.log('🏃 שומר העדפות ספורט פשוטות:', sportsToSave);
    } else if (sportsRanked && Array.isArray(sportsRanked) && sportsRanked.length > 0) {
      // פורמט מדורג - רק הספורטים שנבחרו (לא את כל הרשימה)
      // נצטרך לסנן רק את אלה שנבחרו ב-selectedSports
      if (selectedSports && Array.isArray(selectedSports)) {
        sportsToSave = selectedSports;
        console.log('🏃 שומר העדפות ספורט מדורגות (מסוננות):', sportsToSave);
      } else {
        // אם אין selectedSports, ניקח את כל sportsRanked
        sportsToSave = sportsRanked.map(sport => sport.id);
        console.log('🏃 שומר העדפות ספורט מדורגות (כל הרשימה):', sportsToSave);
      }
    } else if (sportPreferences && Array.isArray(sportPreferences) && sportPreferences.length > 0) {
      // פורמט ישן
      sportsToSave = sportPreferences;
      console.log('🏃 שומר העדפות ספורט (פורמט ישן):', sportsToSave);
    }
    
    if (sportsToSave && sportsToSave.length > 0) {
      for (let i = 0; i < sportsToSave.length; i++) {
        if (sportsToSave[i]) { // וידוא שהערך לא ריק
          await pool.query(
            'INSERT INTO UserPreferences (idUser, sportType, preferenceRank) VALUES ($1, $2, $3)',
            [newUser.iduser, sportsToSave[i], i + 1]
          );
          console.log(`✅ נשמרה העדפה: ${sportsToSave[i]} במקום ${i + 1}`);
        }
      }
    } else {
      console.log('⚠️ אין העדפות ספורט לשמירה');
    }
    
    console.log('✅ משתמש נרשם בהצלחה:', newUser.username);
    
    res.json({
      success: true,
      message: 'הרשמה הושלמה בהצלחה!',
      token: token,
      user: {
        id: newUser.iduser,
        userName: newUser.username,
        email: newUser.email
      }
    });
    
  } catch (err) {
    console.error('❌ שגיאה ברישום:', err);
    res.json({
      success: false,
      message: 'שגיאה ברישום',
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
app.post('/api/available-fields-for-workout', authenticateToken, async (req, res) => {
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
        if (!bookedTime) {
          console.log('⚠️ bookedTime הוא undefined, מדלג...');
          continue;
        }
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
app.get('/api/user-booked-times/:userId/:date', authenticateToken, async (req, res) => {
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
      if (!bookedTime) {
        console.log('⚠️ bookedTime הוא undefined, מדלג...');
        continue;
      }
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
app.get('/api/future-workouts/:userId', authenticateToken, async (req, res) => {
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

// Rate limiting מיוחד ליצירת אימונים (מותאם לפיתוח)
const workoutLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 דקות
  max: process.env.NODE_ENV === 'development' ? 200 : 50, // הרבה יותר מקל בפיתוח
  message: {
    success: false,
    message: 'יותר מדי בקשות ליצירת אימון, נסה שוב מאוחר יותר'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// API ליצירת תוכנית אימון אופטימלית
app.post('/api/generate-optimal-workout', workoutLimiter, authenticateToken, async (req, res) => {
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
        if (!bookedTime) {
          console.log('⚠️ bookedTime הוא undefined, מדלג...');
          continue;
        }
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
    console.error('❌ נתוני הבקשה:', { userId: req.body.userId, date: req.body.date, timeSlots: req.body.timeSlots?.length, userPreferences: req.body.userPreferences });
    res.json({
      success: false,
      message: 'שגיאה ביצירת האימון האופטימלי',
      error: err.message,
      details: err.stack
    });
  }
});

// API לביטול אימון
app.delete('/api/cancel-workout', authenticateToken, async (req, res) => {
  try {
    const { userId, bookings } = req.body;
    
    console.log('🗑️ מקבל בקשה לביטול אימון:', { userId, bookings: bookings?.length });
    
    if (!userId || !bookings || !Array.isArray(bookings) || bookings.length === 0) {
      return res.json({
        success: false,
        message: 'נתונים חסרים: userId ו-bookings נדרשים'
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
    
    let deletedCount = 0;
    const deletedBookings = [];
    
    // מחיקת כל ההזמנות
    for (const booking of bookings) {
      const { idField, bookingDate, startTime } = booking;
      
      console.log(`🗑️ מוחק הזמנה: מגרש ${idField}, תאריך ${bookingDate}, שעה ${startTime}`);
      
      // מחיקת ההזמנה
      const deleteResult = await pool.query(
        'DELETE FROM BookField WHERE idfield = $1 AND bookingdate = $2 AND starttime = $3 AND iduser = $4',
        [idField, bookingDate, startTime, userId]
      );
      
      if (deleteResult.rowCount > 0) {
        deletedCount++;
        deletedBookings.push({
          idField,
          bookingDate,
          startTime
        });
        console.log(`✅ נמחקה הזמנה: מגרש ${idField}, תאריך ${bookingDate}, שעה ${startTime}`);
      } else {
        console.log(`⚠️ לא נמצאה הזמנה למחיקה: מגרש ${idField}, תאריך ${bookingDate}, שעה ${startTime}`);
      }
    }
    
    console.log(`✅ בוטל אימון בהצלחה: נמחקו ${deletedCount} הזמנות מתוך ${bookings.length}`);
    
    // שליחת אימייל ביטול אימון
    if (deletedCount > 0) {
      try {
        // קבלת פרטי המשתמש
        const userResult = await pool.query(
          'SELECT username, email FROM "User" WHERE idUser = $1',
          [userId]
        );
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          
          // יצירת פרטי האימון שבוטל
          const firstBooking = deletedBookings[0];
          const lastBooking = deletedBookings[deletedBookings.length - 1];
          
          const workoutDetails = {
            date: firstBooking.bookingDate,
            startTime: firstBooking.startTime,
            endTime: lastBooking.startTime,
            slots: deletedBookings.map(booking => ({
              time: booking.startTime,
              field: { name: `מגרש ${booking.idField}` }
            }))
          };
          
          console.log('📧 שולח אימייל ביטול אימון...');
          const emailResult = await sendWorkoutCancellationEmail(
            user.email,
            user.username,
            workoutDetails
          );
          
          if (emailResult.success) {
            console.log('✅ אימייל ביטול אימון נשלח בהצלחה');
          } else {
            console.log('⚠️ שגיאה בשליחת אימייל ביטול:', emailResult.error);
          }
        }
      } catch (emailError) {
        console.error('❌ שגיאה בשליחת אימייל ביטול אימון:', emailError);
        // לא נעצור את התהליך בגלל שגיאת אימייל
      }
    }
    
    res.json({
      success: true,
      message: `האימון בוטל בהצלחה! נמחקו ${deletedCount} הזמנות`,
      deletedCount: deletedCount,
      totalRequested: bookings.length,
      deletedBookings: deletedBookings
    });
    
  } catch (err) {
    console.error('❌ שגיאה בביטול האימון:', err);
    res.json({
      success: false,
      message: 'שגיאה בביטול האימון',
      error: err.message
    });
  }
});

// Handle 404 errors
app.all('*', handleNotFound);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  logger.info(`מקבל ${signal}, מתחיל graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');
    
    // Close database connections
    try {
      const { closePool } = require('./utils/database');
      await closePool();
      logger.info('Database connections closed');
    } catch (err) {
      logger.error('Error closing database connections:', err);
    }
    
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Start server
const server = app.listen(PORT, () => {
  logger.info(`השרת רץ על http://localhost:${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
  
  // הפעלת שירות תזכורות
  startReminderService();
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle server errors
server.on('error', (err) => {
  logger.error('Server error:', err);
  process.exit(1);
});