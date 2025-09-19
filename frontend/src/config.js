// קובץ הגדרות כללי לאפליקציה
// כאן נגדיר את כתובת השרת - ניתן לשנות בקלות בין שרת מקומי לשרת ייצור

// הגדרות שרת
export const SERVER_CONFIG = {
  // שרת מקומי - לפתחות
  LOCAL: 'http://localhost:3001',
  
  // שרת ייצור - לפרודקשן
  PRODUCTION: 'https://wolfit-gym-backend-ijvq.onrender.com'
};

// בחר כאן איזה שרת להשתמש:
// true = שרת מקומי, false = שרת ייצור
const USE_LOCAL_SERVER = true;

// כתובת השרת הנוכחית
export const API_BASE_URL = USE_LOCAL_SERVER ? SERVER_CONFIG.LOCAL : SERVER_CONFIG.PRODUCTION;

// הודעת דיבוג
console.log(`🌐 משתמש בשרת: ${API_BASE_URL}`);

