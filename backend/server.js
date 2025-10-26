// Wolfit Gym Backend Server
require('dotenv').config();

// הגדרות בסיסיות
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const helmet = require('helmet');
const Joi = require('joi');

// Database connection
const { pool, testConnection, waitForPoolReady } = require('./utils/database');
const { OptimalHungarianAlgorithm, CompleteOptimalWorkoutScheduler, SPORT_MAPPING } = require('./optimalWorkoutAlgorithm');

// Import workout configuration
const { WORKOUT_CONFIG } = require('./config');

// Redis services
const redisService = require('./utils/redis');
const fieldCacheService = require('./utils/fieldCache');

// Distributed locking system - מונע בקשות מקבילות בין אינסטנסים
const distributedLock = require('./utils/distributedLock');

// SMS service
const { sendSMSCode, validatePhoneNumber, cleanPhoneNumber } = require('./smsService');

const app = express();
const PORT = process.env.PORT || 10000;

// Trust proxy for rate limiting (fixes X-Forwarded-For error)
app.set('trust proxy', 1);

// Middleware
app.use(compression()); // דחיסת תגובות לשיפור ביצועים
app.use(helmet()); // הגנות אבטחה HTTP Headers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
// CORS configuration
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

// הערה: כבר הגדרנו את זה למעלה

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting מיוחד ליצירת אימונים
const workoutLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 דקות
  max: process.env.NODE_ENV === 'development' ? 200 : 50,
  message: {
    success: false,
    message: 'יותר מדי בקשות ליצירת אימון, נסה שוב מאוחר יותר'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// JWT Secret validation
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET לא מוגדר');
  process.exit(1);
}

if (JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET חייב להיות לפחות 32 תווים');
  process.exit(1);
}

console.log('🔍 בדיקת JWT_SECRET: קיים');
console.log('🔍 אורך JWT_SECRET:', JWT_SECRET.length);
console.log('✅ JWT_SECRET תקין, ממשיך...');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Authorization Middleware - בדיקת בעלות על משאב
const authorizeUserAccess = (req, res, next) => {
  const requestedUserId = parseInt(req.params.userId);
  const tokenUserId = req.user.userId;

  if (requestedUserId !== tokenUserId) {
    console.log(`❌ ניסיון גישה לא מורש: משתמש ${tokenUserId} מנסה לגשת למשתמש ${requestedUserId}`);
    return res.status(403).json({ 
      success: false, 
      message: 'Forbidden - אין הרשאה לגשת למשאב זה' 
    });
  }

  console.log(`✅ הרשאה אושרה: משתמש ${tokenUserId} גישה למשאב שלו`);
  next();
};

// Admin Authorization Middleware - בדיקת הרשאות מנהל
const authorizeAdmin = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    console.log(`🔍 בודק הרשאות מנהל עבור משתמש: ${userId}`);
    
    // בדיקה שהמשתמש קיים ובעל הרשאות מנהל
    const userCheck = await pool.query(
      'SELECT isadmin FROM "User" WHERE iduser = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      console.log(`❌ משתמש ${userId} לא נמצא במערכת`);
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא במערכת'
      });
    }
    
    const isAdmin = userCheck.rows[0].isadmin;
    
    if (!isAdmin) {
      console.log(`❌ ניסיון גישה לא מורש: משתמש ${userId} אינו מנהל`);
      return res.status(403).json({
        success: false,
        message: 'Forbidden - הרשאות מנהל נדרשות לגשת למשאב זה'
      });
    }
    
    console.log(`✅ הרשאות מנהל אושרו: משתמש ${userId} הוא מנהל`);
    next();
    
  } catch (error) {
    console.error('❌ שגיאה בבדיקת הרשאות מנהל:', error);
    return res.status(500).json({
      success: false,
      message: 'שגיאה בבדיקת הרשאות מנהל',
      error: error.message
    });
  }
};

console.log('🔍 יוצר middleware לאימות JWT...');
console.log('✅ Middleware לאימות JWT נוצר בהצלחה');

// ========================================
// 🛡️ INPUT VALIDATION SCHEMAS
// ========================================

// Validation Schema for User Registration
const registerSchema = Joi.object({
  userName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\u0590-\u05FF\s]+$/)
    .required()
    .messages({
      'string.min': 'שם המשתמש חייב להכיל לפחות 2 תווים',
      'string.max': 'שם המשתמש לא יכול להכיל יותר מ-50 תווים',
      'string.pattern.base': 'שם המשתמש יכול להכיל רק אותיות ורווחים',
      'any.required': 'שם המשתמש נדרש'
    }),
  
  email: Joi.string()
    .email()
    .max(100)
    .required()
    .messages({
      'string.email': 'כתובת אימייל לא תקינה',
      'string.max': 'כתובת אימייל ארוכה מדי',
      'any.required': 'כתובת אימייל נדרשת'
    }),
  
  height: Joi.number()
    .integer()
    .min(100)
    .max(250)
    .optional()
    .messages({
      'number.min': 'גובה חייב להיות לפחות 100 ס"מ',
      'number.max': 'גובה לא יכול להיות יותר מ-250 ס"מ',
      'number.integer': 'גובה חייב להיות מספר שלם'
    }),
  
  weight: Joi.number()
    .integer()
    .min(30)
    .max(300)
    .optional()
    .messages({
      'number.min': 'משקל חייב להיות לפחות 30 ק"ג',
      'number.max': 'משקל לא יכול להיות יותר מ-300 ק"ג',
      'number.integer': 'משקל חייב להיות מספר שלם'
    }),
  
  birthdate: Joi.string()
    .pattern(/^\d{2}\/\d{2}\/\d{4}$/)
    .optional()
    .messages({
      'string.pattern.base': 'תאריך לידה חייב להיות בפורמט DD/MM/YYYY'
    }),
  
  intensityLevel: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.min': 'רמת עצימות חייבת להיות בין 1-5',
      'number.max': 'רמת עצימות חייבת להיות בין 1-5',
      'number.integer': 'רמת עצימות חייבת להיות מספר שלם',
      'any.required': 'רמת עצימות נדרשת'
    }),
  
  googleId: Joi.string()
    .max(255)
    .optional(),
  
  selectedSports: Joi.array()
    .items(Joi.number().integer().min(1).max(9))
    .max(9)
    .optional()
    .messages({
      'array.max': 'לא ניתן לבחור יותר מ-9 סוגי ספורט',
      'number.min': 'מזהה ספורט לא תקין',
      'number.max': 'מזהה ספורט לא תקין'
    }),
  
  preferenceMode: Joi.string()
    .valid('simple', 'ranked')
    .optional(),
  
  phoneData: Joi.object({
    phoneNumber: Joi.string()
      .pattern(/^\+972\d{9}$/)
      .optional()
      .messages({
        'string.pattern.base': 'מספר טלפון חייב להיות בפורמט +972XXXXXXXXX'
      })
  }).optional(),
  
  wantsStrengthTraining: Joi.boolean().optional(),
  selectedBodyAreas: Joi.array().items(Joi.string()).optional(),
  selectedFitnessComponents: Joi.array().items(Joi.string()).optional()
});

// Validation Schema for User Preferences
const userPreferencesSchema = Joi.object({
  intensitylevel: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .optional(),
  
  intensityLevel: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .optional(),
  
  selectedSports: Joi.array()
    .items(Joi.alternatives().try(
      Joi.object({
        id: Joi.number().integer().min(1).max(9).required(),
        rank: Joi.number().integer().min(1).max(9).optional()
      }),
      Joi.number().integer().min(1).max(9)
    ))
    .max(9)
    .optional()
    .messages({
      'array.max': 'לא ניתן לבחור יותר מ-9 סוגי ספורט'
    }),
  
  wantsStrengthTraining: Joi.boolean().optional(),
  selectedBodyAreas: Joi.array().items(Joi.string()).optional(),
  selectedFitnessComponents: Joi.array().items(Joi.string()).optional()
  
});

// Validation Schema for Admin Operations
const adminAddHoursSchema = Joi.object({
  hours: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'number.min': 'מספר שעות חייב להיות לפחות 1',
      'number.max': 'מספר שעות לא יכול להיות יותר מ-1000',
      'number.integer': 'מספר שעות חייב להיות מספר שלם',
      'any.required': 'מספר שעות נדרש'
    }),
  
  reason: Joi.string()
    .max(500)
    .optional(),
  
  notes: Joi.string()
    .max(1000)
    .optional()
});

// Validation Middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      console.log('❌ שגיאות אימות קלט:', errorMessages);
      
      return res.status(400).json({
        success: false,
        message: 'נתונים לא תקינים',
        errors: errorMessages
      });
    }
    
    // החלפת הנתונים המקוריים בנתונים המאומתים
    req.body = value;
    next();
  };
};

console.log('✅ Input validation schemas created');

// Environment variables check
console.log('🔍 מגיע לבדיקת משתני סביבה...');

if (process.env.DATABASE_URL) {
  console.log('✅ DATABASE_URL קיים, משתמש ב-connection string');
} else if (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD) {
  console.log('✅ משתני סביבה נפרדים קיימים');
} else {
  console.error('❌ שגיאה קריטית: משתני סביבה חסרים למסד הנתונים:', [
    'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'
  ].filter(key => !process.env[key]));
  process.exit(1);
}

console.log('✅ כל משתני הסביבה קיימים, ממשיך...');

// Health Check Endpoints
console.log('🔍 מגיע ל-Health Check Endpoints...');

app.get('/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    res.json({
      status: dbStatus.success ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus.success ? 'connected' : 'disconnected',
        error: dbStatus.success ? null : dbStatus.error
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'disconnected',
        error: error.message
      }
    });
  }
});

app.get('/ready', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    const poolStats = pool ? {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    } : null;
  
    res.json({
      ready: dbStatus.success && pool,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus.success,
        pool: !!pool,
        memory: process.memoryUsage().heapUsed < 100 * 1024 * 1024 // 100MB
      },
      details: {
        database: dbStatus.success ? 'Connected' : 'Disconnected',
        pool: poolStats,
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
      }
    });
  } catch (error) {
    res.status(500).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

console.log('✅ Health Check Endpoints נוצרו בהצלחה');

// Google Login API
app.post('/api/google-login', async (req, res) => {  // הסרנו את loginLimiter כרגע לצורך דיבוג
  try {
    console.log('=== התחלת תהליך התחברות Google ===');
    console.log('📝 Request Body:', req.body);
    console.log('📝 Request Headers:', req.headers);
    
    const { credential } = req.body;
    if (!credential) {
      console.error('❌ Credential חסר בבקשה');
      return res.status(400).json({
        success: false,
        message: 'Credential נדרש'
      });
    }
    
    console.log('📦 מנסה לפענח credential');
    
    // פענוח ה-credential מ-Google
    let googleData;
    try {
      googleData = jwt.decode(credential);
      console.log('✅ Credential פוענח בהצלחה:', {
        sub: googleData?.sub,
        email: googleData?.email,
        name: googleData?.name
      });
    } catch (error) {
      console.error('❌ שגיאה בפענוח Credential:', error);
      return res.status(400).json({
        success: false,
        message: 'Credential לא תקין',
        error: error.message
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
    console.log('=== התחלת בדיקת משתמש קיים ===');
    console.log('🔍 מחפש משתמש לפי:', {
      googleId: googleData.sub,
      email: googleData.email
    });

    // המתנה ל-pool להיות מוכן
    console.log('⏳ מחכה שהדאטהבייס יהיה מוכן...');
    let readyPool;
    try {
      readyPool = await waitForPoolReady();
      console.log('✅ הדאטהבייס מוכן');

      // בדיקת מבנה הדאטהבייס
      const tables = await readyPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      console.log('📊 טבלאות קיימות:', tables.rows.map(row => row.table_name));
      
      // בדיקת מבנה טבלת User
      const columns = await readyPool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'User'
      `);
      console.log('📊 עמודות בטבלת User:', columns.rows);
    } catch (error) {
      console.error('❌ שגיאה בהתחברות לדאטהבייס:', error);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בהתחברות לדאטהבייס',
        error: error.message
      });
    }
    
    // בדיקה ויצירת טבלאות חסרות
    try {
      // בדיקה אם טבלת User קיימת
      const userTableCheck = await readyPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'User'
        );
      `);
      
      // אם הטבלה לא קיימת, ניצור אותה
      if (!userTableCheck.rows[0].exists) {
        console.log('⚠️ טבלת User חסרה, יוצר אותה....');
        await readyPool.query(`
          CREATE TABLE IF NOT EXISTS "User" (
            iduser SERIAL PRIMARY KEY,
            name VARCHAR(50),
            email VARCHAR(100) UNIQUE NOT NULL,
            height INTEGER,
            weight INTEGER,
            birthdate DATE,
            intensitylevel VARCHAR(20) DEFAULT 'medium',
            googleid VARCHAR(255) UNIQUE,
            picture VARCHAR(500)
          );
        `);
        console.log('✅ טבלת User נוצרה בהצלחה');
      }

      // בדיקה אם טבלת SportTypes קיימת
      const sportTypesCheck = await readyPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'sporttypes'
        );
      `);
      
      // אם הטבלה לא קיימת, ניצור אותה
      if (!sportTypesCheck.rows[0].exists) {
        console.log('⚠️ טבלת SportTypes חסרה, יוצר אותה...');
        await readyPool.query(`
          CREATE TABLE IF NOT EXISTS sporttypes (
            sporttype SERIAL PRIMARY KEY,
            sportname VARCHAR(50) NOT NULL
          );

          INSERT INTO sporttypes (sportname) VALUES 
            ('כדורגל'),
            ('כדורסל'),
            ('טיפוס'),
            ('חדר כושר'),
            ('קורדינציה'),
            ('טניס'),
            ('פינגפונג'),
            ('אגרוף'),
            ('אופניים')
          ON CONFLICT DO NOTHING;
        `);
        console.log('✅ טבלת SportTypes נוצרה בהצלחה');
      }

      // בדיקה אם טבלת UserPreferences קיימת
      const preferencesCheck = await readyPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'userpreferences'
        );
      `);
      
      // אם הטבלה לא קיימת, ניצור אותה
      if (!preferencesCheck.rows[0].exists) {
        console.log('⚠️ טבלת UserPreferences חסרה, יוצר אותה...');
        await readyPool.query(`
          CREATE TABLE IF NOT EXISTS userpreferences (
            id SERIAL PRIMARY KEY,
            iduser INTEGER REFERENCES "User"(iduser) ON DELETE CASCADE,
            sporttype INTEGER REFERENCES sporttypes(sporttype),
            preferencerank INTEGER
          );
        `);
        console.log('✅ טבלת UserPreferences נוצרה בהצלחה');
      }

      // בדיקה והוספת עמודות חסרות
      try {
        // בדיקת עמודות חסרות בטבלת User
        const columnsCheck = await readyPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'User';
        `);
        
        const existingColumns = columnsCheck.rows.map(row => row.column_name);
        console.log('📊 עמודות קיימות בטבלת User:', existingColumns);

        // הוספת עמודת googleid אם חסרה
        if (!existingColumns.includes('googleid')) {
          console.log('⚠️ עמודת googleid חסרה, מוסיף אותה...');
          await readyPool.query(`
            ALTER TABLE "User"
            ADD COLUMN googleid VARCHAR(255) UNIQUE;
          `);
          console.log('✅ עמודת googleid נוספה בהצלחה');
        }

        // הוספת עמודת picture אם חסרה
        if (!existingColumns.includes('picture')) {
          console.log('⚠️ עמודת picture חסרה, מוסיף אותה...');
          await readyPool.query(`
            ALTER TABLE "User"
            ADD COLUMN picture VARCHAR(500);
          `);
          console.log('✅ עמודת picture נוספה בהצלחה');
        }

        // הוספת עמודת isAdmin אם חסרה
        if (!existingColumns.includes('isadmin')) {
          console.log('⚠️ עמודת isAdmin חסרה, מוסיף אותה...');
          await readyPool.query(`
            ALTER TABLE "User"
            ADD COLUMN isadmin BOOLEAN DEFAULT FALSE;
          `);
          console.log('✅ עמודת isAdmin נוספה בהצלחה');
        }

        // עדכון המשתמש הקיים עם ה-googleid אם צריך
        if (googleData && googleData.sub) {
          console.log('🔄 מעדכן googleid למשתמש קיים...');
          await readyPool.query(`
            UPDATE "User"
            SET googleid = $1, picture = $2
            WHERE email = $3 AND (googleid IS NULL OR googleid != $1)
          `, [googleData.sub, googleData.picture, googleData.email]);
          console.log('✅ פרטי המשתמש עודכנו בהצלחה');
        }
      } catch (error) {
        console.error('❌ שגיאה בבדיקת/הוספת עמודות:', error);
        throw error;  // נזרוק את השגיאה למעלה לטיפול הכללי
      }

    } catch (error) {
      console.error('❌ שגיאה בבדיקת/הוספת עמודות:', error);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בעדכון מבנה הדאטהבייס',
        error: error.message
      });
    }
    
    // חיפוש המשתמש
    console.log('🔍 מחפש את המשתמש בדאטהבייס...');
    let existingUser;
    try {
      existingUser = await readyPool.query(`
        SELECT * FROM "User" 
        WHERE email = $1 OR googleid = $2
      `, [googleData.email, googleData.sub]);
      
      console.log('🔍 תוצאות חיפוש משתמש:', {
        found: existingUser.rows.length > 0,
        rows: existingUser.rows
      });
    } catch (error) {
      console.error('❌ שגיאה בחיפוש המשתמש:', error);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בחיפוש המשתמש',
        error: error.message
      });
    }
    
    if (existingUser.rows.length > 0) {
      // משתמש קיים - התחברות ישירה
      const user = existingUser.rows[0];
      console.log('✅ משתמש קיים:', user.email);
      
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
        
      console.log('✅ Google login successful for user:', user.email);
        
      res.json({
        success: true,
        token,
        user: {
          id: user.iduser,
          email: user.email,
          name: user.name,
          picture: user.picture
        }
      });
    } else {
      // משתמש חדש - שליחה למסך הרשמה
      console.log('🆕 משתמש חדש - שליחה למסך הרשמה:', googleData.email);
      
      res.json({
        success: false,
        isNewUser: true,
        message: 'משתמש חדש - אנא הירשם תחילה',
        googleData: {
          googleId: googleData.sub,
          email: googleData.email,
          name: googleData.name,
          picture: googleData.picture
        }
      });
    }

  } catch (error) {
    console.error('❌ Google login error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Google login failed',
      details: error.message 
    });
  }
});

console.log('✅ Google Login API ready');

// SMS Authentication APIs
console.log('🔍 יוצר SMS Authentication APIs...');

// שליחת קוד SMS
app.post('/api/send-sms-code', async (req, res) => {
  try {
    console.log('📱 מקבל בקשה לשליחת קוד SMS:', req.body);
    
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'מספר טלפון נדרש'
      });
    }
    
    // בדיקת פורמט טלפון
    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.valid) {
      return res.status(400).json({
        success: false,
        message: phoneValidation.error
      });
    }
    
    const formattedPhone = phoneValidation.formatted;
    console.log('📱 מספר טלפון מעוצב:', formattedPhone);
    
    // שליחת קוד SMS
    const smsResult = await sendSMSCode(formattedPhone);
    
    if (!smsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליחת SMS: ' + smsResult.error
      });
    }
    
    console.log('✅ קוד SMS נשלח בהצלחה:', smsResult.messageId);
    
    res.json({
      success: true,
      message: 'קוד SMS נשלח בהצלחה',
      messageId: smsResult.messageId
    });
    
  } catch (error) {
    console.error('❌ שגיאה בשליחת קוד SMS:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליחת קוד SMS',
      error: error.message
    });
  }
});

// אימות קוד SMS והתחברות
app.post('/api/verify-sms-code', async (req, res) => {
  try {
    console.log('🔐 מקבל בקשה לאימות קוד SMS:', req.body);
    
    const { phoneNumber, smsCode } = req.body;
    
    if (!phoneNumber || !smsCode) {
      return res.status(400).json({
        success: false,
        message: 'מספר טלפון וקוד SMS נדרשים'
      });
    }
    
    // בדיקת פורמט טלפון
    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.valid) {
      return res.status(400).json({
        success: false,
        message: phoneValidation.error
      });
    }
    
    const formattedPhone = phoneValidation.formatted;
    console.log('📱 מספר טלפון מעוצב:', formattedPhone);
    console.log('🔐 קוד SMS:', smsCode);
    
    // בדיקה אם המשתמש קיים במסד הנתונים
    console.log('🔍 מחפש משתמש לפי מספר טלפון:', formattedPhone);
    
    const existingUser = await pool.query(
      'SELECT * FROM "User" WHERE phone_number = $1',
      [formattedPhone]
    );
    
    if (existingUser.rows.length > 0) {
      // משתמש קיים - התחברות ישירה
      const user = existingUser.rows[0];
      console.log('✅ משתמש קיים:', user.email || user.name);
      
      // יצירת JWT token (בדיוק כמו Google!)
      const token = jwt.sign(
        { 
          userId: user.iduser,
          email: user.email,
          name: user.name 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
        
      console.log('✅ SMS login successful for user:', user.email || user.name);
        
      res.json({
        success: true,
        token,
        user: {
          id: user.iduser,
          email: user.email,
          name: user.name,
          picture: user.picture
        }
      });
    } else {
      // משתמש חדש - שליחה למסך הרשמה
      console.log('🆕 משתמש חדש - שליחה למסך הרשמה:', formattedPhone);
      
      res.json({
        success: false,
        isNewUser: true,
        message: 'משתמש חדש - אנא הירשם תחילה',
        phoneData: {
          phoneNumber: formattedPhone
        }
      });
    }

  } catch (error) {
    console.error('❌ SMS verification error:', error);
    res.status(500).json({
      success: false,
      error: 'SMS verification failed',
      details: error.message 
    });
  }
});

console.log('✅ SMS Authentication APIs ready');

// עדכון משתמשים קיימים עם מספר טלפון פיקטיבי
app.post('/api/update-existing-users', async (req, res) => {
  try {
    console.log('🔄 מעדכן משתמשים קיימים עם מספר טלפון פיקטיבי...');
    
    // עדכון משתמשים בלי מספר טלפון
    const result = await pool.query(`
      UPDATE "User" 
      SET phone_number = '+972' || LPAD(CAST(EXTRACT(EPOCH FROM NOW()) AS TEXT), 10, '0')
      WHERE phone_number IS NULL
    `);
    
    console.log(`✅ עודכנו ${result.rowCount} משתמשים`);
    
    res.json({
      success: true,
      message: `עודכנו ${result.rowCount} משתמשים עם מספר טלפון פיקטיבי`,
      updatedCount: result.rowCount
    });
    
  } catch (error) {
    console.error('❌ שגיאה בעדכון משתמשים:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בעדכון משתמשים',
      error: error.message
    });
  }
});

// הוספת משתמש חדש
app.post('/api/register', validateRequest(registerSchema), async (req, res) => {
  try {
    console.log('📝 מקבל בקשה לרישום:', req.body);
    
    const {
      userName,
      email,
      height,
      weight,
      birthdate,
      intensityLevel,
      googleId,
      selectedSports,
      preferenceMode,
      phoneData,
      wantsStrengthTraining,
      selectedBodyAreas,
      selectedFitnessComponents,
    } = req.body;

    console.log('📱 נתוני טלפון:', phoneData);
    console.log('📱 phoneData.phoneNumber:', phoneData?.phoneNumber);

    // קבלת מספר טלפון - אם אין, ניצור מספר פיקטיבי
    const phoneNumber = phoneData?.phoneNumber || '+972' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    console.log('📱 מספר טלפון שיישמר:', phoneNumber);

    // בדיקה אם המשתמש כבר קיים
    const existingUser = await pool.query(
      'SELECT * FROM "User" WHERE email = $1 OR googleid = $2 OR phone_number = $3',
      [email, googleId, phoneNumber]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'משתמש עם אימייל, Google ID או מספר טלפון זה כבר קיים'
      });
    }

    // המרת תאריך לפורמט הנכון
    let formattedBirthdate = null;
    if (birthdate) {
      const [day, month, year] = birthdate.split('/');
      formattedBirthdate = `${year}-${month}-${day}`;
    }

    // המרת ערכים למספרים
    const heightNum = height ? parseInt(height) : null;
    const weightNum = weight ? parseInt(weight) : null;

    console.log('📝 נתונים מעובדים:', {
      userName,
      email,
      height: heightNum,
      weight: weightNum,
      birthdate: formattedBirthdate,
      intensityLevel,
      googleId
    });

    // יצירת משתמש חדש
    const newUser = await pool.query(
      `INSERT INTO "User" (
        name, email, height, weight, birthdate,
        intensitylevel, googleid, phone_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        userName,
        email,
        heightNum,
        weightNum,
        formattedBirthdate,
        intensityLevel.toString() || 'medium',
        googleId || null,
        phoneNumber
      ]
    );

    // הוספת העדפות ספורט
    if (selectedSports && selectedSports.length > 0) {
      for (let i = 0; i < selectedSports.length; i++) {
        await pool.query(
          'INSERT INTO userpreferences (iduser, sporttype, preferencerank) VALUES ($1, $2, $3)',
          [newUser.rows[0].iduser, selectedSports[i], i + 1]
        );
      }
    }

    // שמירת נתוני אימון כוח
    if (wantsStrengthTraining !== undefined) {
      console.log('💪 שומר נתוני אימון כוח בהרשמה...');
      
      // יצירת רשומה בטבלת strength_training_preferences
      await pool.query(`
        INSERT INTO strength_training_preferences (user_id, wants_strength_training) 
        VALUES ($1, $2)
      `, [newUser.rows[0].iduser, wantsStrengthTraining]);
      
      console.log('✅ נתוני אימון כוח נשמרו בהרשמה');
    }
    
    // שמירת אזורי גוף נבחרים
    if (selectedBodyAreas && selectedBodyAreas.length > 0) {
      console.log('🏋️ שומר אזורי גוף נבחרים בהרשמה:', selectedBodyAreas);
      
      for (const bodyArea of selectedBodyAreas) {
        // מציאת ה-ID של אזור הגוף
        const bodyAreaResult = await pool.query(
          'SELECT id FROM body_areas WHERE name = $1',
          [bodyArea]
        );
        
        if (bodyAreaResult.rows.length > 0) {
          await pool.query(
            'INSERT INTO user_body_areas (user_id, body_area_id) VALUES ($1, $2)',
            [newUser.rows[0].iduser, bodyAreaResult.rows[0].id]
          );
        }
      }
      
      console.log('✅ אזורי גוף נשמרו בהרשמה');
    }
    
    // שמירת מרכיבי כשירות נבחרים
    if (selectedFitnessComponents && selectedFitnessComponents.length > 0) {
      console.log('🎯 שומר מרכיבי כשירות נבחרים בהרשמה:', selectedFitnessComponents);
      
      for (const component of selectedFitnessComponents) {
        // מציאת ה-ID של מרכיב הכשירות
        const componentResult = await pool.query(
          'SELECT id FROM fitness_components WHERE name = $1',
          [component]
        );
        
        if (componentResult.rows.length > 0) {
          await pool.query(
            'INSERT INTO user_fitness_components (user_id, fitness_component_id) VALUES ($1, $2)',
            [newUser.rows[0].iduser, componentResult.rows[0].id]
          );
        }
      }
      
      console.log('✅ מרכיבי כשירות נשמרו בהרשמה');
    }

    // יצירת JWT token
    const token = jwt.sign(
      {
        userId: newUser.rows[0].iduser,
        email: newUser.rows[0].email,
        name: newUser.rows[0].name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: newUser.rows[0].iduser,
        email: newUser.rows[0].email,
        name: newUser.rows[0].name,
        picture: newUser.rows[0].picture
      }
    });

  } catch (error) {
    console.error('❌ שגיאה ברישום:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה ברישום המשתמש'
    });
  }
});

// קבלת העדפות ספורט של משתמש
app.get('/api/user-preferences/:userId', authenticateToken, authorizeUserAccess, async (req, res) => {
  try {
    console.log('=== התחלת בקשת העדפות משתמש ===');
    console.log('🔑 פרטי משתמש מהטוקן:', req.user);
    console.log('📝 פרמטרים מהבקשה:', req.params);
    const { userId } = req.params;
    if (!userId) {
      console.error('❌ לא התקבל מזהה משתמש');
      return res.status(400).json({
        success: false,
        message: 'מזהה משתמש נדרש'
      });
    }
    console.log('🔍 מחפש משתמש:', userId);
    
    console.log('🔍 מתחיל לבדוק את חיבור הדאטהבייס...');
    const dbCheck = await pool.query('SELECT NOW()');
    console.log('✅ חיבור לדאטהבייס תקין');
    
    // בדיקת חיבור לדאטהבייס
    const dbConfig = {
      host: process.env.DB_HOST || process.env.DATABASE_URL,
      database: process.env.DB_NAME,
      user: process.env.DB_USER
    };
    console.log('📊 הגדרות דאטהבייס:', {
      ...dbConfig,
      password: '***hidden***'
    });

    // בדיקת טבלאות ויצירתן אם צריך
    console.log('🔍 בודק אילו טבלאות קיימות...');
    
    // בדיקת טבלת SportTypes
    const sportTypesExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sporttypes'
      );
    `);
    
    if (!sportTypesExists.rows[0].exists) {
      console.log('📝 יוצר טבלת SportTypes...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sporttypes (
          sporttype SERIAL PRIMARY KEY,
          sportname VARCHAR(50) NOT NULL
        );
        
        INSERT INTO sporttypes (sportname) VALUES 
          ('כדורגל'),
          ('כדורסל'),
          ('טיפוס'),
          ('חדר כושר'),
          ('קורדינציה'),
          ('טניס'),
          ('פינגפונג'),
          ('אגרוף'),
          ('אופניים')
        ON CONFLICT DO NOTHING;
      `);
    }
    
    // בדיקת טבלת UserPreferences
    const userPrefsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'userpreferences'
      );
    `);
    
    if (!userPrefsExists.rows[0].exists) {
      console.log('📝 יוצר טבלת UserPreferences...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS userpreferences (
          id SERIAL PRIMARY KEY,
          iduser INTEGER REFERENCES "User"(iduser) ON DELETE CASCADE,
          sporttype INTEGER REFERENCES sporttypes(sporttype),
          preferencerank INTEGER
        );
      `);
    }
    
    // בדיקה שהכל נוצר
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📊 טבלאות קיימות:', tablesCheck.rows.map(row => row.table_name));

    // בדיקת תוכן הטבלאות
    console.log('🔍 בודק תוכן טבלאות...');
    
    try {
      const userCount = await pool.query('SELECT COUNT(*) FROM "User"');
      console.log('👥 מספר משתמשים:', userCount.rows[0].count);
    } catch (error) {
      console.error('❌ שגיאה בבדיקת טבלת User:', error.message);
    }
    
    try {
      const prefsCount = await pool.query('SELECT COUNT(*) FROM userpreferences');
      console.log('📋 מספר העדפות:', prefsCount.rows[0].count);
    } catch (error) {
      console.error('❌ שגיאה בבדיקת טבלת userpreferences:', error.message);
    }
    
    try {
      const sportsCount = await pool.query('SELECT COUNT(*) FROM sporttypes');
      console.log('🎯 מספר סוגי ספורט:', sportsCount.rows[0].count);
    } catch (error) {
      console.error('❌ שגיאה בבדיקת טבלת sporttypes:', error.message);
    }
    
    // שליפת נתוני משתמש
    console.log('🔍 מנסה לשלוף נתוני משתמש עבור ID:', userId);
    let userResult;
    try {
      userResult = await pool.query(
        'SELECT intensitylevel, height, weight, birthdate FROM "User" WHERE iduser = $1',
      [userId]
    );
    console.log('📊 נתוני משתמש:', userResult.rows[0]);
    } catch (error) {
      console.error('❌ שגיאה בשליפת נתוני משתמש:', {
        message: error.message,
        code: error.code,
        detail: error.detail
      });
      throw error;
    }
    
    if (userResult.rows.length === 0) {
      return res.json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // שליפת כל סוגי הספורט
    console.log('🔍 שולף את כל סוגי הספורט מהדאטהבייס...');
    let allSportsResult;
    try {
      allSportsResult = await pool.query(
        'SELECT sporttype as id, sportname as name FROM sporttypes ORDER BY sporttype'
      );
      console.log('📊 נמצאו', allSportsResult.rows.length, 'סוגי ספורט');
      console.log('📊 סוגי ספורט:', allSportsResult.rows);
    } catch (dbError) {
      console.error('❌ שגיאה בשליפת סוגי ספורט:', dbError);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת סוגי ספורט',
        error: dbError.message
      });
    }

    // שליפת העדפות ספורט של המשתמש
    console.log('🔍 שולף העדפות ספורט למשתמש:', userId);
    let preferencesResult;
    try {
      // בדיקה אם הטבלה קיימת
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'userpreferences'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        // אם הטבלה לא קיימת, ניצור אותה
        await pool.query(`
          CREATE TABLE IF NOT EXISTS userpreferences (
            id SERIAL PRIMARY KEY,
            iduser INTEGER REFERENCES "User"(iduser) ON DELETE CASCADE,
            sporttype INTEGER REFERENCES sporttypes(sporttype),
            preferencerank INTEGER
          );
        `);
        console.log('✅ טבלת UserPreferences נוצרה');
      }

      preferencesResult = await pool.query(
      `SELECT 
          up.sporttype as id, 
          up.preferencerank as rank, 
          st.sportname as name
         FROM userpreferences up 
         JOIN sporttypes st ON up.sporttype = st.sporttype 
         WHERE up.iduser = $1 
         ORDER BY up.preferencerank`,
      [userId]
    );
      console.log('📊 נמצאו', preferencesResult.rows.length, 'העדפות ספורט');
    } catch (dbError) {
      console.error('❌ שגיאה בשליפת העדפות ספורט:', dbError);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת העדפות ספורט',
        error: dbError.message
      });
    }

    // המרת התוצאות למבנה הנכון
    console.log('📊 תוצאות גולמיות מהדאטהבייס:', preferencesResult.rows);
    
    const selectedSports = preferencesResult.rows.map(row => {
      const sport = {
        id: row.id || row.sporttype,  // תומך בשני הפורמטים
      name: row.name,
        rank: row.rank || row.preferencerank,  // תומך בשני הפורמטים
        selected: true
      };
      console.log('🎯 ממפה ספורט:', row, '➡️', sport);
      return sport;
    });
    
    // יצירת מערך של כל הספורטים עם סימון אם הם נבחרים
    const allSportsWithSelection = allSportsResult.rows.map(sport => {
      const sportId = sport.id || sport.sporttype;  // תומך בשני הפורמטים
      const isSelected = selectedSports.some(selected => selected.id === sportId);
      const mappedSport = {
        id: sportId,
        name: sport.name || sport.sportname,  // תומך בשני הפורמטים
        selected: isSelected,
        rank: isSelected ? selectedSports.find(s => s.id === sportId).rank : null
      };
      console.log('🎯 ממפה ספורט:', sport, '➡️', mappedSport);
      return mappedSport;
    });
    
    // הכנת התשובה
    // קבלת נתוני אימון כוח
    let strengthTrainingData = {
      wantsStrengthTraining: false,
      selectedBodyAreas: [],
      selectedFitnessComponents: []
    };

    try {
      // בדיקת העדפות אימון כוח
      console.log('🔍 בודק העדפות אימון כוח עבור משתמש:', userId);
      const strengthPrefs = await pool.query(
        'SELECT wants_strength_training FROM strength_training_preferences WHERE user_id = $1',
        [userId]
      );
      console.log('🔍 תוצאות strength_training_preferences:', strengthPrefs.rows);

      if (strengthPrefs.rows.length > 0) {
        strengthTrainingData.wantsStrengthTraining = strengthPrefs.rows[0].wants_strength_training;
        console.log('✅ נמצאו העדפות אימון כוח:', strengthTrainingData.wantsStrengthTraining);
      } else {
        console.log('ℹ️ אין העדפות אימון כוח שמורות');
      }

      // קבלת אזורי גוף נבחרים
      console.log('🔍 בודק אזורי גוף עבור משתמש:', userId);
      const bodyAreas = await pool.query(`
        SELECT ba.name, ba.display_name_he 
        FROM user_body_areas uba 
        JOIN body_areas ba ON uba.body_area_id = ba.id 
        WHERE uba.user_id = $1
      `, [userId]);
      console.log('🔍 תוצאות user_body_areas:', bodyAreas.rows);

      strengthTrainingData.selectedBodyAreas = bodyAreas.rows.map(row => row.name);
      console.log('✅ אזורי גוף נבחרים:', strengthTrainingData.selectedBodyAreas);

      // קבלת מרכיבי כשירות נבחרים
      console.log('🔍 בודק מרכיבי כשירות עבור משתמש:', userId);
      const fitnessComponents = await pool.query(`
        SELECT fc.name, fc.display_name_he 
        FROM user_fitness_components ufc 
        JOIN fitness_components fc ON ufc.fitness_component_id = fc.id 
        WHERE ufc.user_id = $1
      `, [userId]);
      console.log('🔍 תוצאות user_fitness_components:', fitnessComponents.rows);

      strengthTrainingData.selectedFitnessComponents = fitnessComponents.rows.map(row => row.name);
      console.log('✅ מרכיבי כשירות נבחרים:', strengthTrainingData.selectedFitnessComponents);

      console.log('💪 נתוני אימון כוח:', strengthTrainingData);
      console.log('💪 wantsStrengthTraining:', strengthTrainingData.wantsStrengthTraining);
      console.log('💪 selectedBodyAreas:', strengthTrainingData.selectedBodyAreas);
      console.log('💪 selectedFitnessComponents:', strengthTrainingData.selectedFitnessComponents);
    } catch (strengthError) {
      console.warn('⚠️ שגיאה בקבלת נתוני אימון כוח:', strengthError.message);
      // ממשיכים בלי נתוני אימון כוח
    }

    const response = {
      success: true,
      data: {
        intensityLevel: parseInt(userResult.rows[0].intensitylevel) || 2,
        sports: allSportsWithSelection,
        selectedSports: selectedSports,
        preferenceMode: selectedSports.length > 0 ? 'ranked' : 'simple',
        userDetails: {
          height: userResult.rows[0].height,
          weight: userResult.rows[0].weight,
          birthdate: userResult.rows[0].birthdate
        },
        strengthTraining: strengthTrainingData
      }
    };
    
    console.log('📤 שולח תשובה ללקוח:', response);
    return res.json(response);

  } catch (error) {
    console.error('❌ שגיאה בשליפת העדפות:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת העדפות המשתמש'
    });
  }
});

// קבלת כל סוגי הספורט
app.get('/api/sports', async (req, res) => {
  try {
    const sports = await pool.query(
      'SELECT * FROM sporttypes ORDER BY sporttype'
    );
    
    res.json({
      success: true,
      sports: sports.rows
    });
  } catch (error) {
    console.error('❌ שגיאה בשליפת סוגי ספורט:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת סוגי הספורט'
    });
  }
});

// שמירת העדפות משתמש
app.put('/api/save-user-preferences/:userId', authenticateToken, authorizeUserAccess, validateRequest(userPreferencesSchema), async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      intensitylevel, 
      intensityLevel, 
      selectedSports, 
      wantsStrengthTraining, 
      selectedBodyAreas, 
      selectedFitnessComponents 
    } = req.body;
    
    // Handle both camelCase and lowercase field names
    const intensity = intensitylevel || intensityLevel;
    
    console.log('📝 נתונים שהתקבלו:', { 
      userId,
      intensitylevel,
      intensityLevel,
      intensity,
      selectedSports,
      wantsStrengthTraining,
      selectedBodyAreas,
      selectedFitnessComponents,
      body: req.body 
    });

    // בדיקה שהמשתמש קיים
    const userCheck = await pool.query(
      'SELECT intensitylevel FROM "User" WHERE iduser = $1',
      [userId]
    );
    console.log('🔍 נתוני משתמש לפני עדכון:', userCheck.rows[0]);

    // עדכון רמת עצימות
    await pool.query(
      'UPDATE "User" SET intensitylevel = $1 WHERE iduser = $2 RETURNING *',
      [intensity.toString(), userId]
    );

    // בדיקה שהעדכון הצליח
    const afterUpdate = await pool.query(
      'SELECT intensitylevel FROM "User" WHERE iduser = $1',
      [userId]
    );
    console.log('✅ נתוני משתמש אחרי עדכון:', afterUpdate.rows[0]);
    
    // בדיקה אם הטבלה קיימת
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'userpreferences'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // אם הטבלה לא קיימת, ניצור אותה
      await pool.query(`
        CREATE TABLE IF NOT EXISTS userpreferences (
          id SERIAL PRIMARY KEY,
          iduser INTEGER REFERENCES "User"(iduser) ON DELETE CASCADE,
          sporttype INTEGER REFERENCES sporttypes(sporttype),
          preferencerank INTEGER
        );
      `);
      console.log('✅ טבלת UserPreferences נוצרה');
    }
    
    // מחיקת העדפות קיימות
    console.log('🗑️ מוחק העדפות קיימות למשתמש:', userId);
    await pool.query(
      'DELETE FROM userpreferences WHERE iduser = $1',
      [userId]
    );
    
    // שמירת העדפות חדשות
    if (selectedSports && selectedSports.length > 0) {
      console.log('📝 שומר העדפות חדשות:', selectedSports);
      
      // אם זה מערך של אובייקטים
      if (typeof selectedSports[0] === 'object') {
        for (let i = 0; i < selectedSports.length; i++) {
          await pool.query(
            'INSERT INTO userpreferences (iduser, sporttype, preferencerank) VALUES ($1, $2, $3)',
            [userId, selectedSports[i].id, selectedSports[i].rank || (i + 1)]
          );
        }
      } 
      // אם זה מערך של מספרים
      else {
        for (let i = 0; i < selectedSports.length; i++) {
          await pool.query(
            'INSERT INTO userpreferences (iduser, sporttype, preferencerank) VALUES ($1, $2, $3)',
            [userId, selectedSports[i], i + 1]
          );
        }
      }
      
      console.log('✅ העדפות נשמרו בהצלחה');
    }

    // שמירת נתוני אימון כוח
    if (wantsStrengthTraining !== undefined) {
      console.log('💪 שומר נתוני אימון כוח...');
      
      // עדכון או יצירת רשומה בטבלת strength_training_preferences
      await pool.query(`
        INSERT INTO strength_training_preferences (user_id, wants_strength_training) 
        VALUES ($1, $2)
        ON CONFLICT (user_id) 
        DO UPDATE SET wants_strength_training = $2, updated_at = CURRENT_TIMESTAMP
      `, [userId, wantsStrengthTraining]);
      
      console.log('✅ נתוני אימון כוח נשמרו');
    }
    
    // שמירת אזורי גוף נבחרים
    if (selectedBodyAreas && selectedBodyAreas.length > 0) {
      console.log('🏋️ שומר אזורי גוף נבחרים:', selectedBodyAreas);
      
      // מחיקת אזורי גוף קיימים
      await pool.query('DELETE FROM user_body_areas WHERE user_id = $1', [userId]);
      
      // הוספת אזורי גוף חדשים
      for (const bodyArea of selectedBodyAreas) {
        // מציאת ה-ID של אזור הגוף
        const bodyAreaResult = await pool.query(
          'SELECT id FROM body_areas WHERE name = $1',
          [bodyArea]
        );
        
        if (bodyAreaResult.rows.length > 0) {
          await pool.query(
            'INSERT INTO user_body_areas (user_id, body_area_id) VALUES ($1, $2)',
            [userId, bodyAreaResult.rows[0].id]
          );
        }
      }
      
      console.log('✅ אזורי גוף נשמרו');
    }
    
    // שמירת מרכיבי כשירות נבחרים
    if (selectedFitnessComponents && selectedFitnessComponents.length > 0) {
      console.log('🎯 שומר מרכיבי כשירות נבחרים:', selectedFitnessComponents);
      
      // מחיקת מרכיבי כשירות קיימים
      await pool.query('DELETE FROM user_fitness_components WHERE user_id = $1', [userId]);
      
      // הוספת מרכיבי כשירות חדשים
      for (const component of selectedFitnessComponents) {
        // מציאת ה-ID של מרכיב הכשירות
        const componentResult = await pool.query(
          'SELECT id FROM fitness_components WHERE name = $1',
          [component]
        );
        
        if (componentResult.rows.length > 0) {
          await pool.query(
            'INSERT INTO user_fitness_components (user_id, fitness_component_id) VALUES ($1, $2)',
            [userId, componentResult.rows[0].id]
          );
        }
      }
      
      console.log('✅ מרכיבי כשירות נשמרו');
    }

    // בדיקה שהכל נשמר
    const savedPreferences = await pool.query(
      'SELECT sporttype, preferencerank FROM userpreferences WHERE iduser = $1 ORDER BY preferencerank',
      [userId]
    );
    console.log('📊 העדפות שנשמרו:', savedPreferences.rows);
    
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

// Verify token route
app.get('/api/verify-token', authenticateToken, async (req, res) => {
  try {
    // אם הגענו לכאן, הטוקן תקין (בגלל ה-middleware)
    const user = await pool.query(
      'SELECT iduser as id, email, name, picture FROM "User" WHERE iduser = $1',
      [req.user.userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    res.json({
      success: true,
      user: user.rows[0]
    });
  } catch (error) {
    console.error('❌ שגיאה באימות טוקן:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה באימות טוקן'
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Wolfit Gym Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      'POST /api/google-login': 'Google OAuth login',
      'POST /api/register': 'User registration',
      'GET /health': 'Health check',
      'GET /ready': 'Readiness check',
      'POST /api/generate-optimal-workout': 'Generate optimal workout plan'
    }
  });
});

// API ליצירת תוכנית אימון אופטימלית
app.post('/api/generate-optimal-workout', workoutLimiter, authenticateToken, async (req, res) => {
  try {
    const { userId, date, timeSlots, userPreferences } = req.body;
    
    console.log('🎯 מקבל בקשה ליצירת אימון אופטימלי:', { userId, date, timeSlots: timeSlots?.length, userPreferences });
    
    if (!userId || !date || !timeSlots) {
      return res.json({
        success: false,
        message: 'נתונים חסרים: userId, date, timeSlots נדרשים'
      });
    }

    // וידוא שיש לנו מערך של זמנים
    const timeSlotsArray = Array.isArray(timeSlots) ? timeSlots : [timeSlots];
    console.log('📅 זמנים לבדיקה:', timeSlotsArray);
    
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
      'SELECT iduser FROM "User" WHERE iduser = $1',
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
      'SELECT starttime FROM bookfield WHERE iduser = $1 AND bookingdate = $2',
      [userId, date]
    );
    
    const userBookedTimes = existingBookings.rows.map(row => row.starttime);
    console.log(`📅 משתמש הזמין כבר ב-${date}:`, userBookedTimes);
    
    // קבלת מגרשים זמינים
    const fieldsByTime = {};
    
    for (const timeSlot of timeSlots) {
      console.log(`⏰ בודק זמינות ל-${timeSlot}`);
      
      // בדיקה אם המשתמש כבר הזמין אימון בזמן זה או בטווח של לבנות אימון לפני ואחרי
      let isUserBooked = false;
      for (const bookedTime of userBookedTimes) {
        if (!bookedTime) continue;
        
        const [hours, minutes] = bookedTime.split(':');
        const bookedMinutes = parseInt(hours) * 60 + parseInt(minutes);
        const beforeMinutes = bookedMinutes - WORKOUT_CONFIG.SLOT_DURATION;
        const afterMinutes = bookedMinutes + WORKOUT_CONFIG.SLOT_DURATION;
        
        const beforeHours = Math.floor(beforeMinutes / 60);
        const beforeMins = beforeMinutes % 60;
        const beforeTime = `${beforeHours.toString().padStart(2, '0')}:${beforeMins.toString().padStart(2, '0')}`;
        
        const afterHours = Math.floor(afterMinutes / 60);
        const afterMins = afterMinutes % 60;
        const afterTime = `${afterHours.toString().padStart(2, '0')}:${afterMins.toString().padStart(2, '0')}`;
        
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
      
      // שימוש ב-cache service לקבלת מגרשים זמינים
      const availableFields = await fieldCacheService.getAvailableFields(date, timeSlot);
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

// API לשמירת אימון
app.post('/api/save-workout', authenticateToken, async (req, res) => {
  let lockAcquired = false;
  let lockValue = null;
  try {
    const { bookings, userId, date } = req.body;
    
    console.log('📋 מקבל בקשה לשמירת אימון:', {
      bookings: JSON.stringify(bookings),
      userId,
      date,
      firstBooking: bookings?.[0]
    });
    
    // בדיקה וקבלת נעילה מבוזרת למשתמש - מונע בקשות מקבילות בין אינסטנסים
    const lockResult = await distributedLock.acquireUserLock(userId);
    if (!lockResult.success) {
      return res.json({
        success: false,
        message: 'הזמנה בתהליך, אנא המתן לסיום ההזמנה הקודמת...',
        requiresNewWorkout: true
      });
    }
    lockAcquired = true;
    lockValue = lockResult.lockValue;
    console.log(`🔒 נעילה מבוזרת נרכשה עבור משתמש ${userId}`);
    
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
      const pastBookings = bookings.filter(booking => booking.starttime < currentTime);
      if (pastBookings.length > 0) {
        return res.json({
          success: false,
          message: `לא ניתן להזמין מגרשים לשעות שעברו: ${pastBookings.map(b => b.starttime).join(', ')}`
        });
      }
    }
    
    // בדיקה שהמשתמש קיים
    const userCheck = await pool.query(
      'SELECT iduser FROM "User" WHERE iduser = $1',
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
      const { starttime } = booking;
      
      // חישוב לבנות אימון לפני ואחרי
      const [hours, minutes] = starttime.split(':');
      const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
      const beforeMinutes = startMinutes - WORKOUT_CONFIG.SLOT_DURATION; // לבנות אימון לפני
      const afterMinutes = startMinutes + WORKOUT_CONFIG.SLOT_DURATION;  // לבנות אימון אחרי
      
      // המרה חזרה לפורמט זמן
      const beforeHours = Math.floor(beforeMinutes / 60);
      const beforeMins = beforeMinutes % 60;
      const beforeTime = `${beforeHours.toString().padStart(2, '0')}:${beforeMins.toString().padStart(2, '0')}`;
      
      const afterHours = Math.floor(afterMinutes / 60);
      const afterMins = afterMinutes % 60;
      const afterTime = `${afterHours.toString().padStart(2, '0')}:${afterMins.toString().padStart(2, '0')}`;
      
      console.log(`⏰ בודק התנגשות עבור ${starttime} (טווח: ${beforeTime} - ${afterTime})`);
      
      // בדיקה אם יש הזמנה קיימת של אותו משתמש באותו תאריך בטווח הזמן
      const conflictCheck = await pool.query(
        `SELECT * FROM bookfield 
         WHERE iduser = $1 
         AND bookingdate = $2 
         AND (
           starttime = $3 OR 
           starttime = $4 OR 
           starttime = $5
         )`,
        [userId, date, beforeTime, starttime, afterTime]
      );
      
      if (conflictCheck.rows.length > 0) {
        const conflict = conflictCheck.rows[0];
        return res.json({
          success: false,
          message: `יש לך כבר אימון מוזמן ב-${date} בשעה ${conflict.starttime}. לא ניתן להזמין אימון בטווח של לבנות אימון לפני ואחרי (${beforeTime} - ${afterTime})`
        });
      }
    }
    
    console.log('✅ לא נמצאו התנגשויות עם הזמנות קיימות');
    
    // בדיקה נוספת שכל המגרשים עדיין זמינים (למקרה של race condition)
    console.log('🔍 בודק זמינות מגרשים לפני שמירה...');
    const unavailableFields = [];
    
    for (const booking of bookings) {
      const { idfield, starttime, bookingdate } = booking;
      
      const availabilityCheck = await pool.query(
        'SELECT * FROM bookfield WHERE idfield = $1 AND bookingdate = $2 AND starttime = $3',
        [idfield, bookingdate, starttime]
      );
      
      if (availabilityCheck.rows.length > 0) {
        unavailableFields.push({
          field: idfield,
          time: starttime,
          reason: 'המגרש תפוס כבר'
        });
      }
    }
    
    if (unavailableFields.length > 0) {
      console.warn('⚠️ נמצאו מגרשים לא זמינים:', unavailableFields);
      return res.json({
        success: false,
        message: `חלק מהמגרשים לא זמינים יותר: ${unavailableFields.map(uf => `מגרש ${uf.field} ב-${uf.time}`).join(', ')}. אנא נסה ליצור אימון חדש.`,
        unavailableFields: unavailableFields,
        requiresNewWorkout: true
      });
    }
    
    console.log('✅ כל המגרשים עדיין זמינים');
    
    // בדיקה שיש מספיק שעות זמינות
    const { quarters } = req.body;
    if (!quarters || quarters <= 0) {
      return res.json({
        success: false,
        message: 'מספר לבנות אימון חייב להיות חיובי'
      });
    }

    // קבלת שעות נוכחיות עם נעילה (FOR UPDATE) - מונע race conditions
    console.log(`🔒 נעילת שורה עבור משתמש ${userId} - מונע הזמנות מקבילות`);
    const currentHours = await pool.query(
      'SELECT availableHours FROM UserHours WHERE userId = $1 FOR UPDATE',
      [userId]
    );

    const currentAvailable = currentHours.rows.length > 0 ? currentHours.rows[0].availablehours : 0;
    console.log(`📊 שעות זמינות נוכחיות: ${currentAvailable}, נדרשות: ${quarters}`);

    if (currentAvailable < quarters) {
      console.log(`❌ אין מספיק שעות זמינות: ${currentAvailable} < ${quarters}`);
      return res.json({
        success: false,
        message: `אין מספיק שעות זמינות. יש ${currentAvailable} לבנות אימון, נדרשים ${quarters} לבנות אימון`,
        requiresNewWorkout: true
      });
    }

    // שמירת כל ההזמנות - אם יש בעיה עם מגרש אחד, לא נשמור כלום
    console.log('💾 מתחיל לשמור את כל ההזמנות...');
    
    // תחילה נבדוק שכל המגרשים קיימים
    for (const booking of bookings) {
      const { idfield } = booking;
      
      const fieldCheck = await pool.query(
        'SELECT idfield FROM field WHERE idfield = $1',
        [idfield]
      );
      
      if (fieldCheck.rows.length === 0) {
        console.warn(`⚠️ מגרש ${idfield} לא נמצא במערכת`);
        return res.json({
          success: false,
          message: `מגרש ${idfield} לא נמצא במערכת. אנא נסה ליצור אימון חדש.`,
          requiresNewWorkout: true
        });
      }
    }
    
    // עכשיו ננסה לשמור את כל ההזמנות
    const savedBookings = [];
    
    try {
      for (const booking of bookings) {
        const { idfield, starttime, bookingdate } = booking;
        
        // בדיקה מחדש שהמגרש לא תפוס (למקרה של race condition)
        const existingBooking = await pool.query(
          'SELECT * FROM bookfield WHERE idfield = $1 AND bookingdate = $2 AND starttime = $3',
          [idfield, bookingdate, starttime]
        );
        
        if (existingBooking.rows.length > 0) {
          console.warn(`⚠️ מגרש ${idfield} תפוס ב-${bookingdate} ${starttime}`);
          return res.json({
            success: false,
            message: `המגרש תפוס כבר ב-${bookingdate} בשעה ${starttime}. אנא נסה ליצור אימון חדש.`,
            requiresNewWorkout: true
          });
        }
        
        // הכנסת ההזמנה
        console.log('💾 שומר הזמנה:', { idfield, bookingdate, starttime, userId });
        await pool.query(
          'INSERT INTO bookfield (idfield, bookingdate, starttime, iduser) VALUES ($1, $2, $3, $4)',
          [idfield, bookingdate, starttime, userId]
        );
        
        savedBookings.push(booking);
        console.log(`✅ נשמרה הזמנה: מגרש ${idfield}, תאריך ${date}, שעה ${starttime}`);
        
        // ביטול ה-cache אחרי הזמנה חדשה
        await fieldCacheService.invalidateCache(date, starttime);
        console.log(`🔄 Cache invalidated for ${date} at ${starttime}`);
      }
      
    } catch (err) {
      console.error(`❌ שגיאה בשמירת הזמנות:`, err);
      
      // אם יש שגיאה, נחזיר הודעה למשתמש ליצור אימון חדש
      if (err.code === '23505') { // PostgreSQL unique violation error code
        return res.json({
          success: false,
          message: `חלק מהמגרשים תפוסים כבר. אנא נסה ליצור אימון חדש.`,
          requiresNewWorkout: true
        });
      } else {
        return res.json({
          success: false,
          message: `שגיאה טכנית בשמירת ההזמנות: ${err.message}. אנא נסה שוב.`,
          requiresNewWorkout: true
        });
      }
    }

    // הורדת השעות מהמשתמש
    const newAvailableHours = currentAvailable - quarters;
    if (currentHours.rows.length > 0) {
      await pool.query(
        'UPDATE userhours SET availablehours = $1, lastupdated = NOW() WHERE userid = $2',
        [newAvailableHours, userId]
      );
    } else {
      await pool.query(
        'INSERT INTO userhours (userid, availablehours, createdby) VALUES ($1, $2, $3)',
        [userId, 0, 'system']
      );
    }

    // הוספה להיסטוריה
    await pool.query(
      'INSERT INTO UserHoursHistory (userId, action, hours, reason, createdBy) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'USE', quarters, `הזמנת אימון בתאריך ${date}`, 'system']
    );
    
    // אם הגענו לכאן, כל ההזמנות נשמרו בהצלחה
    console.log(`✅ כל ההזמנות נשמרו בהצלחה! סה"כ: ${savedBookings.length} הזמנות`);
    
    res.json({
      success: true,
      message: `האימון נשמר בהצלחה! נשמרו ${savedBookings.length} הזמנות`,
      savedCount: savedBookings.length,
      savedBookings: savedBookings
    });
    
  } catch (err) {
    console.error('❌ שגיאה בשמירת האימון:', err);
    console.error('❌ Stack trace:', err.stack);
    console.error('❌ נתוני הבקשה:', { 
      bookings: req.body.bookings?.length, 
      userId: req.body.userId, 
      date: req.body.date,
      firstBooking: req.body.bookings?.[0]
    });
    res.status(500).json({
      success: false,
      message: 'שגיאה בשמירת האימון',
      error: err.message
    });
  } finally {
    // שחרור נעילה מבוזרת תמיד - גם במקרה של שגיאה
    if (lockAcquired && lockValue) {
      await distributedLock.releaseUserLock(req.body.userId, lockValue);
    }
  }
});

// API לקבלת אימונים עתידיים של משתמש
app.get('/api/future-workouts/:userId', authenticateToken, authorizeUserAccess, async (req, res) => {
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
      'SELECT iduser FROM "User" WHERE iduser = $1',
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
    const currentDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const currentTime = now.toTimeString().split(' ')[0];
    
    console.log(`📅 מחפש אימונים מתאריך ${currentDate} שעה ${currentTime}`);
    
    // שאילתה לקבלת כל האימונים העתידיים (כולל אימונים שהתחילו אבל לא הסתיימו)
    const workoutsQuery = `
      SELECT 
        bf.idfield,
        bf.bookingdate,
        bf.starttime,
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
      // חישוב משך האימון (לבנות אימון)
      const startTime = row.starttime;
      const [hours, minutes] = startTime.split(':');
      const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
      const endMinutes = startMinutes + WORKOUT_CONFIG.SLOT_DURATION; // לבנות אימון
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      
      // המרת התאריך לפורמט מקומי
      let localDate;
      if (row.bookingdate instanceof Date) {
        localDate = `${row.bookingdate.getFullYear()}-${(row.bookingdate.getMonth() + 1).toString().padStart(2, '0')}-${row.bookingdate.getDate().toString().padStart(2, '0')}`;
      } else {
        const date = new Date(row.bookingdate);
        localDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      }
      
      return {
        id: row.idfield + '_' + row.bookingdate + '_' + row.starttime, // יצירת מזהה ייחודי
        date: localDate,
        startTime: startTime,
        endTime: endTime,
        duration: WORKOUT_CONFIG.SLOT_DURATION, // לבנות אימון
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
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message
    });
  }
});

// API לביטול אימון
app.delete('/api/cancel-workout/:userId/:date/:fieldId/:startTime', authenticateToken, authorizeUserAccess, async (req, res) => {
  let lockAcquired = false;
  let lockValue = null;
  const client = await pool.connect();
  
  try {
    const { userId, date, fieldId, startTime } = req.params;
    
    // בדיקה וקבלת נעילה מבוזרת למשתמש - מונע ביטולים מקבילים בין אינסטנסים
    const lockResult = await distributedLock.acquireUserLock(userId);
    if (!lockResult.success) {
      return res.json({
        success: false,
        message: 'ביטול אימון בתהליך, אנא המתן לסיום הביטול הקודם...'
      });
    }
    lockAcquired = true;
    lockValue = lockResult.lockValue;
    console.log(`🔒 נעילה מבוזרת נרכשה עבור ביטול אימון - משתמש ${userId}`);
    
    // המרת השעה חזרה לפורמט המקורי (הוספת נקודותיים)
    const formattedTime = startTime.replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3');
    
    console.log('🗑️ מקבל בקשה לביטול אימון:', { userId, date, fieldId, startTime });
    
    if (!userId || !date || !fieldId || !startTime) {
      return res.json({
        success: false,
        message: 'חסרים פרטים לביטול האימון'
      });
    }
    
    // התחלת transaction
    await client.query('BEGIN');
    
    // בדיקה שהמשתמש קיים
    const userCheck = await client.query(
      'SELECT iduser FROM "User" WHERE iduser = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }
    
    // בדיקה שהאימון קיים ושייך למשתמש
    const bookingCheck = await client.query(
      'SELECT * FROM bookfield WHERE iduser = $1 AND bookingdate = $2 AND idfield = $3 AND starttime = $4',
      [userId, date, fieldId, formattedTime]
    );
    
    if (bookingCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.json({
        success: false,
        message: 'לא נמצא אימון מתאים לביטול'
      });
    }
    
    // בדיקה שהתאריך לא בעבר
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      await client.query('ROLLBACK');
      return res.json({
        success: false,
        message: 'לא ניתן לבטל אימון מהעבר'
      });
    }
    
    // אם זה היום, נבדוק שהשעה לא עברה
    if (date === today) {
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0];
      if (formattedTime < currentTime) {
        await client.query('ROLLBACK');
        return res.json({
          success: false,
          message: 'לא ניתן לבטל אימון שכבר התחיל'
        });
      }
    }
    
    // חישוב לבנות אימון שצריך להחזיר
    const quarters = 1; // תמיד לבנות אימון

    // קבלת שעות נוכחיות עם נעילה (FOR UPDATE) - מונע race conditions
    console.log(`🔒 נעילת שורה עבור משתמש ${userId} - מונע ביטולים מקבילים`);
    const currentHours = await client.query(
      'SELECT availableHours FROM UserHours WHERE userId = $1 FOR UPDATE',
      [userId]
    );

    const currentAvailable = currentHours.rows.length > 0 ? currentHours.rows[0].availablehours : 0;
    const newAvailableHours = currentAvailable + quarters;

    // מחיקת האימון
    const deleteResult = await client.query(
      'DELETE FROM bookfield WHERE iduser = $1 AND bookingdate = $2 AND idfield = $3 AND starttime = $4',
      [userId, date, fieldId, formattedTime]
    );

    // וידוא שהמחיקה הצליחה
    if (deleteResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.json({
        success: false,
        message: 'האימון כבר בוטל או לא קיים'
      });
    }

    // החזרת השעות למשתמש
    if (currentHours.rows.length > 0) {
      await client.query(
        'UPDATE userhours SET availablehours = $1, lastupdated = NOW() WHERE userid = $2',
        [newAvailableHours, userId]
      );
    } else {
      await client.query(
        'INSERT INTO userhours (userid, availablehours, createdby) VALUES ($1, $2, $3)',
        [userId, quarters, 'system']
      );
    }

    // הוספה להיסטוריה
    await client.query(
      'INSERT INTO UserHoursHistory (userId, action, hours, reason, createdBy) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'REFUND', quarters, `ביטול אימון בתאריך ${date}`, 'system']
    );
    
    // אישור ה-transaction
    await client.query('COMMIT');
    
    console.log('✅ האימון בוטל והשעות הוחזרו בהצלחה');
    
    res.json({
      success: true,
      message: 'האימון בוטל והשעות הוחזרו בהצלחה',
      newTotalHours: newAvailableHours
    });
    
  } catch (err) {
    // rollback במקרה של שגיאה
    await client.query('ROLLBACK');
    console.error('❌ שגיאה בביטול האימון:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בביטול האימון',
      error: err.message
    });
  } finally {
    // שחרור נעילה מבוזרת תמיד - גם במקרה של שגיאה
    if (lockAcquired && lockValue) {
      await distributedLock.releaseUserLock(req.params.userId, lockValue);
    }
    // שחרור ה-client
    client.release();
  }
});

// API לקבלת שעות תפוסות של משתמש לתאריך מסוים
app.get('/api/user-booked-times/:userId/:date', authenticateToken, authorizeUserAccess, async (req, res) => {
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
      'SELECT iduser FROM "User" WHERE iduser = $1',
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
      'SELECT starttime FROM bookfield WHERE iduser = $1 AND bookingdate = $2',
      [userId, date]
    );
    
    const bookedTimes = existingBookings.rows.map(row => row.starttime);
    console.log(`📅 משתמש הזמין ב-${date}:`, bookedTimes);
    
    // יצירת רשימת שעות תפוסות כולל לבנות אימון לפני ואחרי
    const blockedTimes = new Set();
    
    for (const bookedTime of bookedTimes) {
      // חישוב לבנות אימון לפני ואחרי הזמן הקיים
      if (!bookedTime) {
        console.log('⚠️ bookedTime הוא undefined, מדלג...');
        continue;
      }
      const [hours, minutes] = bookedTime.split(':');
      const bookedMinutes = parseInt(hours) * 60 + parseInt(minutes);
      const beforeMinutes = bookedMinutes - WORKOUT_CONFIG.SLOT_DURATION;
      const afterMinutes = bookedMinutes + WORKOUT_CONFIG.SLOT_DURATION;
      
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
    console.log(`🚫 שעות תפוסות כולל לבנות אימון לפני ואחרי:`, blockedTimesArray);
    
    res.json({
      success: true,
      blockedTimes: blockedTimesArray,
      message: `נמצאו ${blockedTimesArray.length} שעות תפוסות`
    });
    
  } catch (err) {
    console.error('❌ שגיאה בקבלת שעות תפוסות:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message
    });
  }
});

// התחברות ל-Redis
async function initRedis() {
  try {
    const connected = await redisService.connect();
    if (connected) {
      console.log('✅ Redis connected successfully');
      console.log('🚀 Redis caching is ENABLED');
      console.log('🔒 Distributed locking is ENABLED');
    } else {
      console.log('⚠️ Redis connection failed - continuing without caching');
      console.log('🚫 Redis caching is DISABLED');
      console.log('⚠️ Distributed locking will use fallback mode');
    }
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    console.log('⚠️ Server will continue without Redis caching');
    console.log('🚫 Redis caching is DISABLED');
    console.log('⚠️ Distributed locking will use fallback mode');
  }
}

// API לבדיקת סטטוס Redis ו-Distributed Lock
app.get('/api/system-status', async (req, res) => {
  try {
    const redisStatus = redisService.getConnectionStatus();
    const redisHealthy = await distributedLock.isRedisHealthy();
    const lockCleanup = await distributedLock.cleanupExpiredLocks();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      redis: {
        connected: redisStatus.connected,
        url: redisStatus.url,
        token: redisStatus.token,
        healthy: redisHealthy
      },
      distributedLock: {
        enabled: redisStatus.connected,
        fallbackMode: !redisStatus.connected,
        cleanupCount: lockCleanup
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בבדיקת סטטוס המערכת',
      error: error.message
    });
  }
});

// API לבדיקת נעילה של משתמש ספציפי
app.get('/api/lock-status/:userId', authenticateToken, authorizeUserAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const lockInfo = await distributedLock.getLockInfo(userId);
    
    res.json({
      success: true,
      userId,
      lockInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בבדיקת סטטוס הנעילה',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log('🚀 Server running on http://0.0.0.0:' + PORT);
  await initRedis();
});

console.log('✅ Health check ready');

// ========================================
// 🎯 API ENDPOINTS לניהול שעות משתמשים
// ========================================

// קבלת שעות זמינות של משתמש
app.get('/api/user-hours/:userId', authenticateToken, authorizeUserAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🔍 מקבל שעות זמינות עבור משתמש: ${userId}`);
    
    // בדיקה שהמשתמש קיים
    const userCheck = await pool.query(
      'SELECT iduser, name as username FROM "User" WHERE iduser = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }
    
    // קבלת שעות זמינות
    const hoursResult = await pool.query(
      'SELECT availableHours, lastUpdated, notes FROM UserHours WHERE userId = $1',
      [userId]
    );
    
    const availableHours = hoursResult.rows.length > 0 ? hoursResult.rows[0].availablehours : 0;
    const lastUpdated = hoursResult.rows.length > 0 ? hoursResult.rows[0].lastupdated : null;
    const notes = hoursResult.rows.length > 0 ? hoursResult.rows[0].notes : null;
    
    console.log(`✅ משתמש ${userId} יש לו ${availableHours} שעות זמינות`);
    
    res.json({
      success: true,
      userId: parseInt(userId),
      username: userCheck.rows[0].userName,
      availableHours: availableHours,
      lastUpdated: lastUpdated,
      notes: notes
    });
    
  } catch (err) {
    console.error('❌ שגיאה בקבלת שעות משתמש:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message
    });
  }
});

// הוספת שעות למשתמש (למנהל בלבד)
app.post('/api/admin/add-hours/:userId', authenticateToken, authorizeAdmin, validateRequest(adminAddHoursSchema), async (req, res) => {
  try {
    const { userId } = req.params;
    const { hours, reason, notes } = req.body;
    
    if (!hours || hours <= 0) {
      return res.json({
        success: false,
        message: 'מספר שעות חייב להיות חיובי'
      });
    }
    
    console.log(`➕ מוסיף ${hours} שעות למשתמש ${userId}`);
    
    // בדיקה שהמשתמש קיים
    const userCheck = await pool.query(
      'SELECT iduser, name as username FROM "User" WHERE iduser = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }
    
    // בדיקה אם יש כבר רשומה למשתמש
    const existingHours = await pool.query(
      'SELECT availableHours FROM UserHours WHERE userId = $1',
      [userId]
    );
    
    let newAvailableHours;
    
    if (existingHours.rows.length > 0) {
      // עדכון שעות קיימות
      newAvailableHours = existingHours.rows[0].availablehours + hours;
      await pool.query(
        'UPDATE UserHours SET availableHours = $1, lastUpdated = NOW(), notes = $2 WHERE userId = $3',
        [newAvailableHours, notes || existingHours.rows[0].notes, userId]
      );
    } else {
      // יצירת רשומה חדשה
      newAvailableHours = hours;
      await pool.query(
        'INSERT INTO UserHours (userId, availableHours, notes, createdBy) VALUES ($1, $2, $3, $4)',
        [userId, hours, notes, 'admin']
      );
    }
    
    // הוספה להיסטוריה
    await pool.query(
      'INSERT INTO UserHoursHistory (userId, action, hours, reason, createdBy) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'ADD', hours, reason || 'הוספת שעות על ידי מנהל', 'admin']
    );
    
    console.log(`✅ נוספו ${hours} שעות למשתמש ${userId}. סה"כ: ${newAvailableHours}`);
    
    res.json({
      success: true,
      message: `נוספו ${hours} שעות למשתמש ${userCheck.rows[0].username}`,
      newTotalHours: newAvailableHours
    });
    
  } catch (err) {
    console.error('❌ שגיאה בהוספת שעות:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message
    });
  }
});

// הפחתת שעות ממשתמש (למנהל בלבד)
app.post('/api/admin/subtract-hours/:userId', authenticateToken, authorizeAdmin, validateRequest(adminAddHoursSchema), async (req, res) => {
  try {
    const { userId } = req.params;
    const { hours, reason, notes } = req.body;
    
    if (!hours || hours <= 0) {
      return res.json({
        success: false,
        message: 'מספר שעות חייב להיות חיובי'
      });
    }
    
    console.log(`➖ מפחית ${hours} שעות ממשתמש ${userId}`);
    
    // בדיקה שהמשתמש קיים
    const userCheck = await pool.query(
      'SELECT iduser, name as username FROM "User" WHERE iduser = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }
    
    // קבלת שעות נוכחיות
    const currentHours = await pool.query(
      'SELECT availableHours FROM UserHours WHERE userId = $1',
      [userId]
    );
    
    const currentAvailable = currentHours.rows.length > 0 ? currentHours.rows[0].availablehours : 0;
    
    if (currentAvailable < hours) {
      return res.json({
        success: false,
        message: `אין מספיק שעות. יש ${currentAvailable} שעות זמינות`
      });
    }
    
    const newAvailableHours = currentAvailable - hours;
    
    // עדכון השעות
    if (currentHours.rows.length > 0) {
      await pool.query(
        'UPDATE UserHours SET availableHours = $1, lastUpdated = NOW(), notes = $2 WHERE userId = $3',
        [newAvailableHours, notes || currentHours.rows[0].notes, userId]
      );
    } else {
      // יצירת רשומה חדשה (לא אמור לקרות)
      await pool.query(
        'INSERT INTO UserHours (userId, availableHours, notes, createdBy) VALUES ($1, $2, $3, $4)',
        [userId, 0, notes, 'admin']
      );
    }
    
    // הוספה להיסטוריה
    await pool.query(
      'INSERT INTO UserHoursHistory (userId, action, hours, reason, createdBy) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'SUBTRACT', hours, reason || 'הפחתת שעות על ידי מנהל', 'admin']
    );
    
    console.log(`✅ הופחתו ${hours} שעות ממשתמש ${userId}. נותרו: ${newAvailableHours}`);
    
    res.json({
      success: true,
      message: `הופחתו ${hours} שעות ממשתמש ${userCheck.rows[0].username}`,
      newTotalHours: newAvailableHours
    });
    
  } catch (err) {
    console.error('❌ שגיאה בהפחתת שעות:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message
    });
  }
});

// שימוש בשעות (בהזמנת אימון)
app.post('/api/use-hours/:userId', authenticateToken, authorizeUserAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const { hours, bookingId, reason } = req.body;
    
    if (!hours || hours <= 0) {
      return res.json({
        success: false,
        message: 'מספר שעות חייב להיות חיובי'
      });
    }
    
    console.log(`⏰ משתמש ${userId} משתמש ב-${hours} שעות`);
    
    // בדיקה שהמשתמש קיים
    const userCheck = await pool.query(
      'SELECT iduser, name as username FROM "User" WHERE iduser = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }
    
    // קבלת שעות נוכחיות עם נעילה (FOR UPDATE) - מונע race conditions
    console.log(`🔒 נעילת שורה עבור משתמש ${userId} - מונע שימוש מקביל בשעות`);
    const currentHours = await pool.query(
      'SELECT availableHours FROM UserHours WHERE userId = $1 FOR UPDATE',
      [userId]
    );
    
    const currentAvailable = currentHours.rows.length > 0 ? currentHours.rows[0].availablehours : 0;
    
    if (currentAvailable < hours) {
      return res.json({
        success: false,
        message: `אין מספיק שעות זמינות. יש ${currentAvailable} שעות, נדרשות ${hours} שעות`
      });
    }
    
    const newAvailableHours = currentAvailable - hours;
    
    // עדכון השעות
    if (currentHours.rows.length > 0) {
      await pool.query(
        'UPDATE userhours SET availablehours = $1, lastupdated = NOW() WHERE userid = $2',
        [newAvailableHours, userId]
      );
    } else {
      // יצירת רשומה חדשה (לא אמור לקרות)
      await pool.query(
        'INSERT INTO userhours (userid, availablehours, createdby) VALUES ($1, $2, $3)',
        [userId, 0, 'system']
      );
    }
    
    // הוספה להיסטוריה
    await pool.query(
      'INSERT INTO UserHoursHistory (userId, action, hours, reason, createdBy) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'USE', hours, reason || `הזמנת אימון ${bookingId || ''}`, 'system']
    );
    
    console.log(`✅ משתמש ${userId} השתמש ב-${hours} שעות. נותרו: ${newAvailableHours}`);
    
    res.json({
      success: true,
      message: `השתמשת ב-${hours} שעות`,
      newTotalHours: newAvailableHours
    });
    
  } catch (err) {
    console.error('❌ שגיאה בשימוש בשעות:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message
    });
  }
});

// החזרת שעות (בביטול הזמנה)
app.post('/api/refund-hours/:userId', authenticateToken, authorizeUserAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const { hours, bookingId, reason } = req.body;
    
    if (!hours || hours <= 0) {
      return res.json({
        success: false,
        message: 'מספר שעות חייב להיות חיובי'
      });
    }
    
    console.log(`🔄 מחזיר ${hours} שעות למשתמש ${userId}`);
    
    // בדיקה שהמשתמש קיים
    const userCheck = await pool.query(
      'SELECT iduser, name as username FROM "User" WHERE iduser = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }
    
    // קבלת שעות נוכחיות
    const currentHours = await pool.query(
      'SELECT availableHours FROM UserHours WHERE userId = $1',
      [userId]
    );
    
    const currentAvailable = currentHours.rows.length > 0 ? currentHours.rows[0].availablehours : 0;
    const newAvailableHours = currentAvailable + hours;
    
    // עדכון השעות
    if (currentHours.rows.length > 0) {
      await pool.query(
        'UPDATE userhours SET availablehours = $1, lastupdated = NOW() WHERE userid = $2',
        [newAvailableHours, userId]
      );
    } else {
      // יצירת רשומה חדשה
      await pool.query(
        'INSERT INTO userhours (userid, availablehours, createdby) VALUES ($1, $2, $3)',
        [userId, hours, 'system']
      );
    }
    
    // הוספה להיסטוריה
    await pool.query(
      'INSERT INTO UserHoursHistory (userId, action, hours, reason, createdBy) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'REFUND', hours, reason || `ביטול הזמנה ${bookingId || ''}`, 'system']
    );
    
    console.log(`✅ הוחזרו ${hours} שעות למשתמש ${userId}. סה"כ: ${newAvailableHours}`);
    
    res.json({
      success: true,
      message: `הוחזרו ${hours} שעות לחשבון`,
      newTotalHours: newAvailableHours
    });
    
  } catch (err) {
    console.error('❌ שגיאה בהחזרת שעות:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message
    });
  }
});

// קבלת רשימת כל המשתמשים עם השעות שלהם (למנהל)
app.get('/api/admin/all-users-hours', authenticateToken, authorizeAdmin, async (req, res) => {
  console.log('=== התחלת קבלת רשימת משתמשים ===');
  console.log('🔑 מידע משתמש מהטוקן:', req.user);
  console.log('🔑 Headers:', req.headers);

  try {
    // 1. בדיקת חיבור בסיסית למסד הנתונים
    console.log('1️⃣ בדיקת חיבור למסד הנתונים...');
    try {
      const testResult = await pool.query('SELECT 1');
      console.log('✅ חיבור למסד הנתונים תקין:', testResult.rows);
    } catch (connErr) {
      console.error('❌ שגיאה בחיבור למסד הנתונים:', {
        message: connErr.message,
        code: connErr.code
      });
      throw connErr;
    }

    // 2. בדיקת טבלאות קיימות
    console.log('2️⃣ בדיקת טבלאות קיימות...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('📋 טבלאות במסד:', tables.rows.map(r => r.table_name));

    // 3. בדיקת מבנה טבלת User
    console.log('3️⃣ בדיקת מבנה טבלת User...');
    const userStructure = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'User'
      ORDER BY ordinal_position
    `);
    console.log('📋 מבנה טבלת User:', userStructure.rows);

    // 4. בדיקת מבנה טבלת userhours
    console.log('4️⃣ בדיקת מבנה טבלת userhours...');
    const userHoursStructure = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'userhours'
      ORDER BY ordinal_position
    `);
    console.log('📋 מבנה טבלת userhours:', userHoursStructure.rows);

    // 5. בדיקת נתונים בטבלאות
    console.log('5️⃣ בדיקת נתונים בטבלאות...');
    const userCount = await pool.query('SELECT COUNT(*) FROM "User"');
    console.log('👥 מספר משתמשים:', userCount.rows[0].count);

    try {
      const hoursCount = await pool.query('SELECT COUNT(*) FROM userhours');
      console.log('⏰ מספר רשומות שעות:', hoursCount.rows[0].count);
    } catch (hoursErr) {
      console.error('❌ שגיאה בבדיקת טבלת userhours:', {
        message: hoursErr.message,
        code: hoursErr.code
      });
    }

    console.log('6️⃣ מתחיל שליפת נתונים...');

    // בדיקת חיבור למסד הנתונים
    try {
      const testConnection = await pool.query('SELECT NOW()');
      console.log('✅ חיבור למסד הנתונים תקין:', testConnection.rows[0]);
    } catch (dbError) {
      console.error('❌ שגיאה בבדיקת חיבור למסד הנתונים:', dbError);
      throw dbError;
    }

    // בדיקת מבנה הטבלאות
    try {
      const tablesCheck = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      console.log('📋 טבלאות קיימות:', tablesCheck.rows.map(row => row.table_name));

      // בדיקת מבנה טבלת User
      const userColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'User'
      `);
      console.log('📋 עמודות בטבלת User:', userColumns.rows);

      // בדיקת מבנה טבלת userhours
      const userHoursColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'userhours'
      `);
      console.log('📋 עמודות בטבלת userhours:', userHoursColumns.rows);
    } catch (schemaError) {
      console.error('❌ שגיאה בבדיקת מבנה הטבלאות:', schemaError);
      throw schemaError;
    }
    
    console.log('🔍 מתחיל שליפת נתונים...');
    
    // בדיקה אם טבלת userhours קיימת
    const userHoursTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'userhours'
      );
    `);
    
    console.log('📋 טבלת userhours קיימת:', userHoursTableCheck.rows[0].exists);
    
    if (!userHoursTableCheck.rows[0].exists) {
      console.log('⚠️ טבלת userhours לא קיימת, יוצר אותה...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS userhours (
          userid INTEGER PRIMARY KEY REFERENCES "User"(iduser) ON DELETE CASCADE,
          availablehours INTEGER DEFAULT 0,
          lastupdated TIMESTAMP DEFAULT NOW(),
          notes TEXT,
          createdby VARCHAR(50) DEFAULT 'system'
        );
      `);
      console.log('✅ טבלת userhours נוצרה');
    }
    
    // בדיקת מבנה טבלת userhours
    const userHoursColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'userhours'
    `);
    console.log('📋 עמודות בטבלת userhours:', userHoursColumns.rows);
    
    // בדיקת נתונים בטבלת userhours
    const userHoursCount = await pool.query('SELECT COUNT(*) FROM userhours');
    console.log('📊 מספר רשומות בטבלת userhours:', userHoursCount.rows[0].count);
    
    // בדיקת כל הרשומות בטבלת userhours
    const allUserHours = await pool.query('SELECT * FROM userhours');
    console.log('📋 כל הרשומות בטבלת userhours:', JSON.stringify(allUserHours.rows, null, 2));
    
    // בדיקת כל המשתמשים
    const allUsers = await pool.query('SELECT * FROM "User"');
    console.log('👥 כל המשתמשים:', JSON.stringify(allUsers.rows, null, 2));
    
    // אם אין רשומות, נוסיף רשומות ברירת מחדל לכל המשתמשים
    if (parseInt(userHoursCount.rows[0].count) === 0) {
      console.log('⚠️ אין רשומות בטבלת userhours, יוצר רשומות ברירת מחדל...');
      const allUsers = await pool.query('SELECT iduser FROM "User"');
      for (const user of allUsers.rows) {
        await pool.query(`
          INSERT INTO userhours (userid, availablehours, createdby) 
          VALUES ($1, 0, 'system')
          ON CONFLICT (userid) DO NOTHING
        `, [user.iduser]);
      }
      console.log(`✅ נוצרו ${allUsers.rows.length} רשומות ברירת מחדל`);
    }
    
    console.log('🔍 מבצע שאילתה לקבלת משתמשים עם שעות...');
    const query = `
      SELECT 
        u.iduser,
        u.name as username,
        u.email,
        u.isadmin,
        COALESCE(uh.availablehours, 0) as "availableHours",
        uh.lastupdated as "lastUpdated",
        uh.notes
      FROM "User" u
      LEFT JOIN userhours uh ON u.iduser = uh.userid
      ORDER BY u.name
    `;
    console.log('📝 השאילתה:', query);
    
    const result = await pool.query(query);
    
    console.log(`✅ נמצאו ${result.rows.length} משתמשים`);
    console.log('📊 כל המשתמשים:', JSON.stringify(result.rows, null, 2));
    
    if (result.rows.length > 0) {
      console.log('🔍 דוגמה למשתמש ראשון:', result.rows[0]);
      console.log('🔍 שדות במשתמש ראשון:', Object.keys(result.rows[0]));
      console.log('🔍 availableHours במשתמש ראשון:', result.rows[0].availableHours);
      console.log('🔍 typeof availableHours:', typeof result.rows[0].availableHours);
    }
    
    res.json({
      success: true,
      users: result.rows
    });
    
    } catch (err) {
    console.error('❌ שגיאה בקבלת רשימת משתמשים:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail,
      table: err.table,
      constraint: err.constraint,
      query: err.query,
      position: err.position
    });
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message,
      details: {
        code: err.code,
        detail: err.detail,
        table: err.table
      }
    });
  }
});

// קבלת היסטוריית שעות של משתמש
app.get('/api/user-hours-history/:userId', authenticateToken, authorizeUserAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📜 מקבל היסטוריית שעות עבור משתמש: ${userId}`);
    
    const result = await pool.query(`
      SELECT 
        action,
        hours,
        reason,
        createdBy,
        createdAt
      FROM UserHoursHistory 
      WHERE userId = $1 
      ORDER BY createdAt DESC
      LIMIT 50
    `, [userId]);
    
    console.log(`✅ נמצאו ${result.rows.length} רשומות היסטוריה`);
    
    res.json({
      success: true,
      history: result.rows
    });
    
  } catch (err) {
    console.error('❌ שגיאה בקבלת היסטוריית שעות:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message
    });
  }
});

// חיפוש משתמש לפי אימייל (למנהל)
app.get('/api/admin/search-user', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { email } = req.query;
    
    console.log(`🔍 מחפש משתמש לפי אימייל: ${email}`);
    
    if (!email || email.trim() === '') {
      return res.json({
        success: false,
        message: 'אימייל נדרש לחיפוש'
      });
    }
    
    const result = await pool.query(`
      SELECT 
        u.iduser,
        u.name as username,
        u.email,
        u.isadmin,
        COALESCE(uh.availablehours, 0) as availableHours,
        uh.lastupdated as lastUpdated,
        uh.notes
      FROM "User" u
      LEFT JOIN userhours uh ON u.iduser = uh.userid
      WHERE LOWER(u.email) LIKE LOWER($1)
      ORDER BY u.name
    `, [`%${email.trim()}%`]);
    
    console.log(`✅ נמצאו ${result.rows.length} משתמשים תואמים`);
    
    res.json({
      success: true,
      users: result.rows,
      searchTerm: email,
      totalFound: result.rows.length
    });
    
  } catch (err) {
    console.error('❌ שגיאה בחיפוש משתמש:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message
    });
  }
});

// ניהול הרשאות מנהל (למנהל בלבד)
app.post('/api/admin/set-admin/:userId', authenticateToken, authorizeAdmin, validateRequest(Joi.object({
  isAdmin: Joi.boolean().required().messages({
    'any.required': 'שדה isAdmin נדרש'
  }),
  reason: Joi.string().max(500).optional()
})), async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin, reason } = req.body;
    
    console.log(`🔧 מעדכן הרשאות מנהל עבור משתמש ${userId}: ${isAdmin}`);
    
    // בדיקה שהמשתמש קיים
    const userCheck = await pool.query(
      'SELECT iduser, name, email, isadmin FROM "User" WHERE iduser = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.json({
        success: false,
        message: 'משתמש לא נמצא במערכת'
      });
    }
    
    const user = userCheck.rows[0];
    
    // עדכון הרשאות מנהל
    await pool.query(
      'UPDATE "User" SET isadmin = $1 WHERE iduser = $2',
      [isAdmin, userId]
    );
    
    // הוספה להיסטוריה
    await pool.query(
      'INSERT INTO UserHoursHistory (userId, action, hours, reason, createdBy) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'ADMIN_UPDATE', 0, reason || `הרשאות מנהל עודכנו ל-${isAdmin}`, 'admin']
    );
    
    console.log(`✅ הרשאות מנהל עודכנו עבור ${user.name} (${user.email}): ${isAdmin}`);
    
    res.json({
      success: true,
      message: `הרשאות מנהל עודכנו עבור ${user.name}`,
      user: {
        id: user.iduser,
        name: user.name,
        email: user.email,
        isAdmin: isAdmin
      }
    });
    
  } catch (err) {
    console.error('❌ שגיאה בעדכון הרשאות מנהל:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message
    });
  }
});
