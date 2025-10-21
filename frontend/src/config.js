// קובץ הגדרות כללי לאפליקציה
// כאן נגדיר את כתובת השרת - ניתן לשנות בקלות בין שרת מקומי לשרת ייצור

// הגדרות שרת
export const SERVER_CONFIG = {
  // שרת מקומי - לפתחות
  LOCAL: 'http://localhost:3001',
  
  // שרת ייצור - לפרודקשן
  PRODUCTION: 'https://wolfit-gym-backend.onrender.com'
};

// הגדרות יחידת זמן אימון
export const WORKOUT_CONFIG = {
  SLOT_DURATION: 10, // דקות - ניתן לשנות ל-10, 15, 20 וכו'
  MIN_WORKOUT_DURATION: 30, // משך אימון מינימלי
  MAX_WORKOUT_DURATION: 180, // משך אימון מקסימלי
};

// בחר כאן איזה שרת להשתמש:
// true = שרת מקומי, false = שרת ייצור
const USE_LOCAL_SERVER = false;

// כתובת השרת הנוכחית
export const API_BASE_URL = USE_LOCAL_SERVER ? SERVER_CONFIG.LOCAL : SERVER_CONFIG.PRODUCTION;

// הודעת דיבוגג
console.log(`🌐 משתמש בשרת: ${API_BASE_URL}`);
console.log(`⏰ יחידת זמן אימון: ${WORKOUT_CONFIG.SLOT_DURATION} דקות`);

