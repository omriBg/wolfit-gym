// Wolfit Gym Backend Server
require('dotenv').config();

// כפיית IPv4 עבור Supabase
process.env.NODE_OPTIONS = '--dns-result-order=ipv4first';
process.env.NODE_DNS_RESOLVER = 'ipv4first';

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// כפיית IPv4 עבור מסד הנתונים - זמנית מושבת
console.log('⚠️ Database connection temporarily disabled for IPv4 fix');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

// Database connection
const { pool, testConnection } = require('./utils/database');

const app = express();
const PORT = process.env.PORT || 10000;

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
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'temporarily_disabled',
        message: 'Database temporarily disabled for IPv4 fix'
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
    
    // יצירת JWT token (ללא מסד נתונים זמנית)
    const token = jwt.sign(
      { 
        userId: googleData.sub,
        email: googleData.email,
        name: googleData.name 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('✅ Google login successful for:', googleData.email);
    
    res.json({
      success: true,
      message: 'התחברות הצליחה',
      token,
      user: {
        id: googleData.sub,
        email: googleData.email,
        name: googleData.name,
        picture: googleData.picture
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

// API לטעינת העדפות משתמש - מושבת זמנית
app.get('/api/user-preferences/:userId', authenticateToken, async (req, res) => {
  res.json({
    success: false,
    message: 'Database temporarily disabled - please try again later'
  });
});

// APIs שמשתמשים במסד נתונים - מושבים זמנית
app.put('/api/save-user-preferences/:userId', authenticateToken, async (req, res) => {
  res.json({
    success: false,
    message: 'Database temporarily disabled - please try again later'
  });
});

app.post('/api/save-workout', authenticateToken, async (req, res) => {
  res.json({
    success: false,
    message: 'Database temporarily disabled - please try again later'
  });
});

app.post('/api/available-fields-for-workout', authenticateToken, async (req, res) => {
  res.json({
    success: false,
    message: 'Database temporarily disabled - please try again later'
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Wolfit Gym Backend Server is working!',
    version: '1.0.0',
    endpoints: [
      'GET /health',
      'POST /api/google-login',
      'GET /api/verify-token',
      'GET /api/user-preferences/:userId',
      'PUT /api/save-user-preferences/:userId',
      'POST /api/save-workout',
      'POST /api/available-fields-for-workout'
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
