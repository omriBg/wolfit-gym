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

// Redis services
const redisService = require('./utils/redis');
const fieldCacheService = require('./utils/fieldCache');

const app = express();
const PORT = process.env.PORT || 10000;

// Trust proxy for rate limiting (fixes X-Forwarded-For error)
app.set('trust proxy', 1);

// Middleware
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

console.log('🔍 יוצר middleware לאימות JWT...');
console.log('✅ Middleware לאימות JWT נוצר בהצלחה');

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
            ('ריקוד'),
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

// הוספת משתמש חדש
app.post('/api/register', async (req, res) => {
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
      preferenceMode
    } = req.body;

    // בדיקה אם המשתמש כבר קיים
    const existingUser = await pool.query(
      'SELECT * FROM "User" WHERE email = $1 OR googleid = $2',
      [email, googleId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'משתמש עם אימייל או Google ID זה כבר קיים'
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
        intensitylevel, googleid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        userName,
        email,
        heightNum,
        weightNum,
        formattedBirthdate,
        intensityLevel.toString() || 'medium',
        googleId || null
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
app.get('/api/user-preferences/:userId', authenticateToken, async (req, res) => {
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
          ('ריקוד'),
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
        }
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
app.put('/api/save-user-preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { intensityLevel, selectedSports } = req.body;
    
    console.log('📝 נתונים שהתקבלו:', { 
      userId,
      intensityLevel,
      selectedSports,
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
      [intensityLevel.toString(), userId]
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
      
      // בדיקה אם המשתמש כבר הזמין אימון בזמן זה או בטווח של רבע שעה לפני ואחרי
      let isUserBooked = false;
      for (const bookedTime of userBookedTimes) {
        if (!bookedTime) continue;
        
        const [hours, minutes] = bookedTime.split(':');
        const bookedMinutes = parseInt(hours) * 60 + parseInt(minutes);
        const beforeMinutes = bookedMinutes - 15;
        const afterMinutes = bookedMinutes + 15;
        
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
        `SELECT * FROM bookfield 
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
        'SELECT idfield FROM field WHERE idfield = $1',
        [idField]
      );
      
      if (fieldCheck.rows.length === 0) {
        console.warn(`⚠️ מגרש ${idField} לא נמצא, מדלג...`);
        continue;
      }
      
      // בדיקה שהמגרש לא תפוס כבר
      const existingBooking = await pool.query(
        'SELECT * FROM bookfield WHERE idfield = $1 AND bookingdate = $2 AND starttime = $3',
        [idField, date, startTime]
      );
      
      if (existingBooking.rows.length > 0) {
        console.warn(`⚠️ מגרש ${idField} תפוס ב-${date} ${startTime}, מדלג...`);
        continue;
      }
      
      // הכנסת ההזמנה
      await pool.query(
        'INSERT INTO bookfield (idfield, bookingdate, starttime, iduser) VALUES ($1, $2, $3, $4)',
        [idField, date, startTime, userId]
      );
      
      // ביטול ה-cache אחרי הזמנה חדשה
      await fieldCacheService.invalidateCache(date, startTime);
      
      console.log(`✅ נשמרה הזמנה: מגרש ${idField}, תאריך ${date}, שעה ${startTime}`);
    }
    
    res.json({
      success: true,
      message: `האימון נשמר בהצלחה! נשמרו ${bookings.length} הזמנות`,
      savedCount: bookings.length
    });
    
  } catch (err) {
    console.error('❌ שגיאה בשמירת האימון:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשמירת האימון',
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
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת',
      error: err.message
    });
  }
});

// API לביטול אימון
app.delete('/api/cancel-workout/:userId/:date/:fieldId/:startTime', authenticateToken, async (req, res) => {
  try {
    const { userId, date, fieldId, startTime } = req.params;
    
    // המרת השעה חזרה לפורמט המקורי (הוספת נקודותיים)
    const formattedTime = startTime.replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3');
    
    console.log('🗑️ מקבל בקשה לביטול אימון:', { userId, date, fieldId, startTime });
    
    if (!userId || !date || !fieldId || !startTime) {
      return res.json({
        success: false,
        message: 'חסרים פרטים לביטול האימון'
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
    
    // בדיקה שהאימון קיים ושייך למשתמש
    const bookingCheck = await pool.query(
      'SELECT * FROM bookfield WHERE iduser = $1 AND bookingdate = $2 AND idfield = $3 AND starttime = $4',
      [userId, date, fieldId, formattedTime]
    );
    
    if (bookingCheck.rows.length === 0) {
      return res.json({
        success: false,
        message: 'לא נמצא אימון מתאים לביטול'
      });
    }
    
    // בדיקה שהתאריך לא בעבר
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      return res.json({
        success: false,
        message: 'לא ניתן לבטל אימון מהעבר'
      });
    }
    
    // אם זה היום, נבדוק שהשעה לא עברה
    if (date === today) {
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0];
      if (startTime < currentTime) {
        return res.json({
          success: false,
          message: 'לא ניתן לבטל אימון שכבר התחיל'
        });
      }
    }
    
    // מחיקת האימון
    await pool.query(
      'DELETE FROM bookfield WHERE iduser = $1 AND bookingdate = $2 AND idfield = $3 AND starttime = $4',
      [userId, date, fieldId, formattedTime]
    );
    
    console.log('✅ האימון בוטל בהצלחה');
    
    res.json({
      success: true,
      message: 'האימון בוטל בהצלחה'
    });
    
  } catch (err) {
    console.error('❌ שגיאה בביטול האימון:', err);
    res.status(500).json({
      success: false,
      message: 'שגיאה בביטול האימון',
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
    await redisService.connect();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    console.log('⚠️ Server will continue without Redis caching');
  }
}

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log('🚀 Server running on http://0.0.0.0:' + PORT);
  await initRedis();
});

console.log('✅ Health check ready');