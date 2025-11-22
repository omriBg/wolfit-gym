-- הוספת שדה טלפון לטבלת המשתמשים
-- קובץ זה מוסיף תמיכה באימות SMS

-- הוספת שדה phone_number לטבלת User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) UNIQUE;

-- הוספת אינדקס לביצועים טובים יותר
CREATE INDEX IF NOT EXISTS idx_user_phone ON "User"(phone_number);

-- הוספת הערה לטבלה
COMMENT ON COLUMN "User".phone_number IS 'מספר טלפון לאימות SMS - ייחודי לכל משתמש';

-- בדיקה שהשדה נוסף בהצלחה
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name = 'phone_number';

















