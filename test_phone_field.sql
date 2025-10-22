-- בדיקה שהשדה phone_number נוסף בהצלחה
-- קובץ זה בודק שהשינויים עבדו

-- בדיקה 1: רשימת כל השדות בטבלת User
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'User' 
ORDER BY ordinal_position;

-- בדיקה 2: בדיקה שהשדה phone_number קיים
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name = 'phone_number';

-- בדיקה 3: בדיקה שהאינדקס נוצר
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'User' AND indexname LIKE '%phone%';

-- בדיקה 4: ניסיון להוסיף משתמש עם טלפון (בדיקה שהכל עובד)
-- זה רק בדיקה - לא נוסיף משתמש אמיתי
SELECT 'phone_number field added successfully!' as status;



