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
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later.',
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
app.post('/api/google-login', loginLimiter, async (req, res) => {
  try {
    console.log('🔍 Google Login Request:', req.body);
    
    const { credential } = req.body;
    if (!credential) {
      console.error('❌ Credential חסר');
      return res.status(400).json({
        success: false,
        message: 'Credential נדרש'
      });
    }
    
    console.log('📦 Decoding credential:', credential);
    
    // פענוח ה-credential מ-Google
    const googleData = jwt.decode(credential);
    console.log('📦 Decoded Google data:', googleData);
    
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
    console.log('⏳ Waiting for pool to be ready...');
    const readyPool = await waitForPoolReady();
    console.log('✅ Pool is ready, proceeding with database query');
    
    console.log('🔍 Executing database query...');
    const existingUser = await readyPool.query(
      'SELECT * FROM "User" WHERE googleid = $1 OR email = $2',
      [googleData.sub, googleData.email]
    );
    console.log('✅ Database query completed, found users:', existingUser.rows.length);
    
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

  } catch (error) {
    console.error('❌ שגיאה בשליפת העדפות:', error);
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
      'GET /ready': 'Readiness check'
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on http://0.0.0.0:' + PORT);
});

console.log('✅ Health check ready');