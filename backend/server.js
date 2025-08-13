// backend/server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// חיבור למסד נתונים
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'Wolfit',
  user: 'postgres',
  password: '9526',
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

// API לבדיקת התחברות
app.post('/api/login', async (req, res) => {
    try {
      const { userName, password } = req.body;
      
      // בדיקה שהשדות לא ריקים
      if (!userName || !password) {
        return res.json({
          success: false,
          message: 'שם משתמש וסיסמה נדרשים'
        });
      }
      
      // חיפוש המשתמש במסד נתונים
      const userResult = await pool.query(
        'SELECT idUser, userName, email FROM "User" WHERE userName = $1 AND password = $2',
        [userName, password]
      );
      
      if (userResult.rows.length === 0) {
        return res.json({
          success: false,
          message: 'שם משתמש או סיסמה שגויים'
        });
      }
      
      const user = userResult.rows[0];
      
      res.json({
        success: true,
        message: 'התחברות הצליחה!',
        user: {
          id: user.iduser,
          userName: user.username,
          email: user.email
        }
      });
      
    } catch (err) {
      console.error('שגיאה בהתחברות:', err);
      res.json({
        success: false,
        message: 'שגיאה בשרת',
        error: err.message
      });
    }
  });
  
  // API להרשמת משתמש חדש
  app.post('/api/register', async (req, res) => {
    try {
      const { userName, password, email, height, weight, birthdate, intensityLevel, selectedSports } = req.body;
      
      // בדיקה שכל השדות החובה קיימים
      if (!userName || !password || !email) {
        return res.json({
          success: false,
          message: 'שם משתמש, סיסמה ואימייל נדרשים'
        });
      }
      
      // בדיקה אם שם המשתמש כבר קיים
      const existingUser = await pool.query(
        'SELECT idUser FROM "User" WHERE userName = $1',
        [userName]
      );
      
      if (existingUser.rows.length > 0) {
        return res.json({
          success: false,
          message: 'שם המשתמש כבר קיים במערכת'
        });
      }
      
      // בדיקה אם האימייל כבר קיים
      const existingEmail = await pool.query(
        'SELECT idUser FROM "User" WHERE email = $1',
        [email]
      );
      
      if (existingEmail.rows.length > 0) {
        return res.json({
          success: false,
          message: 'האימייל כבר קיים במערכת'
        });
      }
      
      // הכנסת משתמש חדש
      const userResult = await pool.query(
        'INSERT INTO "User" (userName, password, email, height, weight, birthdate, intensityLevel) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING idUser',
        [userName, password, email, height, weight, birthdate, intensityLevel]
      );
      
      const userId = userResult.rows[0].iduser;
      
      // הכנסת העדפות ספורט (אם יש)
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
        message: 'המשתמש נרשם בהצלחה!',
        userId: userId
      });
      
    } catch (err) {
      console.error('שגיאה בהרשמה:', err);
      res.json({
        success: false,
        message: 'שגיאה בהרשמה',
        error: err.message
      });
    }
  });
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
app.listen(PORT, () => {
  console.log(`🚀 השרת רץ על http://localhost:${PORT}`);
});