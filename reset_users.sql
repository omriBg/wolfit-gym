-- איפוס משתמשים והתחלה מחדש עם Google OAuth
-- ⚠️ זה ימחק את כל המשתמשים הקיימים!

-- מחיקת כל הנתונים הקשורים למשתמשים
DELETE FROM UserPreferences;
DELETE FROM BookField;
DELETE FROM "User";

-- איפוס ה-Sequences (מזהים אוטומטיים)
ALTER SEQUENCE "User_idUser_seq" RESTART WITH 1;
ALTER SEQUENCE UserPreferences_id_seq RESTART WITH 1;
ALTER SEQUENCE BookField_idBooking_seq RESTART WITH 1;

-- הוספת השדות החדשים לטבלת User (אם לא קיימים)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS googleId VARCHAR(255) UNIQUE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS profilePicture VARCHAR(500);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS authProvider VARCHAR(20) DEFAULT 'google';

-- הפיכת שדות לאופציונליים
ALTER TABLE "User" ALTER COLUMN password DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN userName DROP NOT NULL;

-- הוספת אינדקסים לביצועים טובים יותר
CREATE INDEX IF NOT EXISTS idx_user_google_id ON "User"(googleId);
CREATE INDEX IF NOT EXISTS idx_user_auth_provider ON "User"(authProvider);

-- הודעת הצלחה
SELECT 'מסד הנתונים אופס בהצלחה! מוכן ל-Google OAuth' as message;
