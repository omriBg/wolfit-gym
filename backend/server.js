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
  console.log('🔧 Using Supabase Transaction Pooler (IPv4 compatible)');
  console.log('🔧 Database URL configured for IPv4');
}

// כפיית IPv4 עבור מסד הנתונים
if (process.env.DB_FORCE_IPV4 === 'true') {
  console.log('🔧 DB_FORCE_IPV4 enabled - forcing IPv4 connection');
}

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
      status: dbStatus ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus ? 'connected' : 'disconnected',
        error: dbStatus ? null : 'Connection failed'
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
      ready: dbStatus && pool,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        pool: !!pool,
        memory: process.memoryUsage().heapUsed < 100 * 1024 * 1024 // 100MB
      },
      details: {
        database: dbStatus ? 'Connected' : 'Disconnected',
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

  } catch (error) {
    console.error('❌ Google login error:', error);
    res.status(500).json({
      success: false,
      error: 'Google login failed',
      details: error.message 
    });
  }
});

console.log('✅ Google Login API ready');

// Root route
app.get('/', (req, res) => {
    res.json({
    message: 'Wolfit Gym Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      'POST /api/google-login': 'Google OAuth login',
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