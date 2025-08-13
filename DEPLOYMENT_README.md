# הוראות העלאה לשרת - Wolfit Gym

## אפשרויות העלאה מומלצות:

### 1. Render.com (מומלץ למתחילים)

#### שלב 1: הכנת הפרויקט
1. וודא שכל הקבצים נשמרו
2. וודא שיש לך חשבון GitHub
3. העלה את הפרויקט ל-GitHub

#### שלב 2: יצירת חשבון ב-Render
1. היכנס ל-https://render.com
2. הירשם עם חשבון GitHub שלך
3. לחץ על "New +" ובחר "Web Service"

#### שלב 3: הגדרת השירות
1. **Connect Repository**: בחר את הפרויקט שלך מ-GitHub
2. **Name**: `wolfit-gym-backend`
3. **Environment**: `Node`
4. **Build Command**: `cd backend && npm install`
5. **Start Command**: `cd backend && npm start`
6. **Plan**: Free

#### שלב 4: הגדרת מסד נתונים
1. לחץ על "New +" ובחר "PostgreSQL"
2. **Name**: `wolfit-database`
3. **Database**: `wolfit`
4. **User**: `wolfit_user`
5. **Plan**: Free

#### שלב 5: הגדרת משתני סביבה
בשירות ה-Web, הוסף את המשתנים הבאים:
```
NODE_ENV=production
PORT=10000
DB_HOST=[העתק מ-PostgreSQL service]
DB_PORT=[העתק מ-PostgreSQL service]
DB_NAME=[העתק מ-PostgreSQL service]
DB_USER=[העתק מ-PostgreSQL service]
DB_PASSWORD=[העתק מ-PostgreSQL service]
```

#### שלב 6: הגדרת מסד הנתונים
1. היכנס ל-PostgreSQL service
2. לחץ על "Connect" ובחר "External Database"
3. העתק את פרטי החיבור
4. השתמש בכלי כמו pgAdmin או DBeaver כדי להתחבר
5. הרץ את הקובץ `database_schema.sql`

### 2. Railway.app (אלטרנטיבה)

#### שלב 1: יצירת חשבון
1. היכנס ל-https://railway.app
2. הירשם עם GitHub

#### שלב 2: יצירת פרויקט
1. לחץ על "New Project"
2. בחר "Deploy from GitHub repo"
3. בחר את הפרויקט שלך

#### שלב 3: הוספת מסד נתונים
1. לחץ על "New"
2. בחר "Database" -> "PostgreSQL"
3. Railway ייצור אוטומטית את משתני הסביבה

#### שלב 4: הגדרת הפרויקט
Railway יזהה אוטומטית שזה פרויקט Node.js ויריץ את הפקודות הנכונות.

### 3. Vercel + Supabase (לפרונט-אנד + מסד נתונים)

#### שלב 1: Supabase למסד נתונים
1. היכנס ל-https://supabase.com
2. צור פרויקט חדש
3. היכנס ל-SQL Editor
4. העתק והרץ את התוכן של `database_schema.sql`

#### שלב 2: Vercel לפרונט-אנד
1. היכנס ל-https://vercel.com
2. הירשם עם GitHub
3. לחץ על "New Project"
4. בחר את הפרויקט שלך
5. הגדר את משתני הסביבה עם כתובת ה-API של Supabase

## הוראות כלליות:

### עדכון כתובות API
אחרי ההעלאה, תצטרך לעדכן את כתובות ה-API בקוד הפרונט-אנד:

```javascript
// במקום localhost:3001
const API_BASE_URL = 'https://your-app-name.onrender.com';
```

### בדיקת השרת
לאחר ההעלאה, בדוק שהשרת עובד:
```
https://your-app-name.onrender.com/test
```

### פתרון בעיות נפוצות:
1. **שגיאת חיבור למסד נתונים**: וודא שמשתני הסביבה נכונים
2. **שגיאת CORS**: השרת כבר מוגדר עם CORS
3. **שגיאת פורט**: Render משתמש בפורט 10000

## קישורים שימושיים:
- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
