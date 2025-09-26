# 🔒 מדריך אבטחה - WOLFit Gym

## ✅ תיקונים שבוצעו

### 1. **JWT Secret מאובטח**
**הבעיה:** סוד JWT חלש וברירת מחדל מסוכנת
```javascript
// לפני (מסוכן!)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// אחרי (מאובטח!)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ שגיאה קריטית: JWT_SECRET לא מוגדר במשתני הסביבה!');
  process.exit(1);
}
```

**מה זה אומר:**
- השרת לא יעבוד אם JWT_SECRET לא מוגדר
- אין ברירות מחדל מסוכנות
- חובה להשתמש בסוד חזק וייחודי

### 2. **הסרת מערכת סיסמאות רגילות - רק Google OAuth**
**הבעיה:** מערכת סיסמאות רגילות עם סיכונים אבטחתיים
```javascript
// לפני (מסוכן!)
password: password || ''  // סיסמה כטקסט פשוט

// אחרי (מאובטח!)
password: '', // סיסמה ריקה - רק Google OAuth
```

**מה זה אומר:**
- הסרנו לחלוטין את מערכת הסיסמאות הרגילות
- רק Google OAuth נתמך - יותר מאובטח
- אין סיכון של סיסמאות חלשות או גניבה
- Google מטפל בכל האבטחה של הסיסמאות

### 3. **הגדרות CORS מאובטחות**
**הבעיה:** CORS פתוח לכל הדומיינים
```javascript
// לפני (מסוכן!)
app.use(cors());

// אחרי (מאובטח!)
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://your-production-domain.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('לא מורשה על ידי מדיניות CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
```

**מה זה אומר:**
- רק דומיינים מורשים יכולים לגשת לשרת
- הגנה מפני CSRF attacks
- לוגים של ניסיונות גישה לא מורשים

### 4. **משתני סביבה מאובטחים**
**הבעיה:** נתונים רגישים בקוד עם ברירות מחדל
```javascript
// לפני (מסוכן!)
password: process.env.DB_PASSWORD || '9526'

// אחרי (מאובטח!)
const requiredDbVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredDbVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ שגיאה קריטית: משתני סביבה חסרים:', missingVars);
  process.exit(1);
}
```

**מה זה אומר:**
- השרת לא יעבוד אם נתונים חיוניים חסרים
- אין ברירות מחדל מסוכנות
- חובה להגדיר כל הנתונים הרגישים

### 5. **Rate Limiting ו-Helmet**
**הוספנו:**
```javascript
// הגבלת בקשות כללית
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: 100, // מקסימום 100 בקשות לכל IP
});

// הגבלת ניסיונות התחברות
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: 5, // מקסימום 5 ניסיונות התחברות
});

// אבטחת headers
app.use(helmet({
  contentSecurityPolicy: { /* הגדרות CSP */ }
}));
```

**מה זה אומר:**
- הגנה מפני brute force attacks
- הגנה מפני DDoS attacks
- אבטחת headers HTTP

## 🚀 הוראות הפעלה מאובטחת

### 1. **הכנת משתני סביבה**
```bash
# העתק את קובץ הדוגמה
cp backend/env.example backend/.env

# צור סוד JWT חזק
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ערוך את קובץ .env והחלף את כל הערכים
nano backend/.env
```

### 2. **עדכון דומיינים מורשים**
ערוך את `allowedOrigins` בקובץ `server.js`:
```javascript
const allowedOrigins = [
  'http://localhost:3000',  // React development
  'https://your-actual-domain.com',  // Production domain
];
```

### 3. **בדיקת אבטחה**
```bash
# הפעל את השרת
cd backend
npm start

# בדוק שהשרת עובד
curl http://localhost:3001/test
```

## ⚠️ אזהרות חשובות

1. **לעולם אל תעלה את קובץ `.env` לגיט!**
2. **השתמש בסיסמאות חזקות וייחודיות**
3. **בסביבת ייצור, השתמש בסודות שונים לחלוטין**
4. **הפעל את השרת רק עם HTTPS בסביבת ייצור**
5. **עדכן את דומיינים מורשים לפני העלאה לייצור**

## 🔍 בדיקות אבטחה נוספות

### בדיקת JWT
```bash
# נסה לגשת ללא טוקן
curl http://localhost:3001/api/verify-token

# נסה עם טוקן לא תקין
curl -H "Authorization: Bearer invalid-token" http://localhost:3001/api/verify-token
```

### בדיקת CORS
```bash
# נסה מגישה מדומיין לא מורשה
curl -H "Origin: https://malicious-site.com" http://localhost:3001/api/test
```

### בדיקת Rate Limiting
```bash
# נסה לשלוח הרבה בקשות
for i in {1..10}; do curl http://localhost:3001/api/login; done
```

## 📚 משאבים נוספים

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
