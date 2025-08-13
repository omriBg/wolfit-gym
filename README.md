# 🏋️‍♂️ Wolfit Gym - מערכת ניהול חדר כושר

אפליקציה מלאה לניהול חדר כושר הכוללת:
- מערכת הרשמה והתחברות
- הזמנת מגרשים ואימונים
- ניהול העדפות משתמשים
- ממשק משתמש מודרני וידידותי

## 🚀 הוראות הרצה מהירות

### התקנת תלויות
```bash
npm run install-all
```

### הרצה מקומית
```bash
npm run dev
```

### הרצה עם Docker
```bash
docker-compose up --build
```

## 📁 מבנה הפרויקט

```
wolfit-gym/
├── src/                 # React frontend
├── backend/             # Node.js API server
├── public/              # Static files
├── database_schema.sql  # Database structure
└── docs/               # Documentation
```

## 🛠️ טכנולוגיות

### Frontend
- React 19
- Material-UI
- GSAP Animations
- Anime.js

### Backend
- Node.js
- Express.js
- PostgreSQL
- CORS

### Database
- PostgreSQL
- User management
- Booking system
- Preferences system

## 🌐 העלאה לשרת

### אפשרויות מומלצות:
1. **Render.com** - הכי פשוט למתחילים
2. **Railway.app** - מהיר ופשוט
3. **Vercel + Supabase** - פרונט-אנד + מסד נתונים

### הוראות מפורטות:
- [הוראות העלאה מהירות](QUICK_DEPLOY.md)
- [הוראות העלאה מפורטות](DEPLOYMENT_README.md)
- [הוראות העלאה עם Docker](DOCKER_DEPLOY.md)

## 📊 API Endpoints

### Authentication
- `POST /api/login` - התחברות
- `POST /api/register` - הרשמה

### User Management
- `GET /api/user-preferences/:userId` - קבלת העדפות
- `PUT /api/save-user-preferences/:userId` - שמירת העדפות

### Booking System
- `POST /api/book-fields` - הזמנת מגרשים
- `POST /api/available-fields-for-workout` - בדיקת זמינות

### Health Check
- `GET /test` - בדיקת חיבור למסד נתונים

## 🔧 פיתוח

### Scripts זמינים
```bash
npm start          # הרצת React app
npm run dev        # הרצת frontend + backend
npm run build      # בניית production
npm test           # הרצת tests
```

### משתני סביבה
צור קובץ `.env` בתיקיית `backend/`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Wolfit
DB_USER=postgres
DB_PASSWORD=9526
PORT=3001
NODE_ENV=development
```

## 📝 רישיון

MIT License

## 🤝 תרומה

1. Fork את הפרויקט
2. צור branch חדש (`git checkout -b feature/amazing-feature`)
3. Commit את השינויים (`git commit -m 'Add amazing feature'`)
4. Push ל-branch (`git push origin feature/amazing-feature`)
5. פתח Pull Request

## 📞 תמיכה

לשאלות ותמיכה, פנה אלינו דרך GitHub Issues.
