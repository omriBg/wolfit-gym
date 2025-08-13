# 🐳 הוראות העלאה עם Docker

## אפשרויות עם Docker:

### 1. Railway.app (מומלץ עם Docker)

#### שלב 1: יצירת חשבון
1. היכנס ל-https://railway.app
2. הירשם עם GitHub

#### שלב 2: יצירת פרויקט
1. לחץ על "New Project"
2. בחר "Deploy from GitHub repo"
3. בחר את הפרויקט שלך

#### שלב 3: הוספת מסד נתונים
1. לחץ על "New"
2. בחר "Database" → "PostgreSQL"
3. Railway ייצור אוטומטית את משתני הסביבה

#### שלב 4: הגדרת הפרויקט
Railway יזהה את ה-Dockerfile ויריץ אותו אוטומטית.

### 2. Google Cloud Run

#### שלב 1: התקנת Google Cloud CLI
```bash
# macOS
brew install google-cloud-sdk

# או הורד מ-https://cloud.google.com/sdk/docs/install
```

#### שלב 2: הגדרת הפרויקט
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### שלב 3: בניית והעלאה
```bash
# בניית Image
docker build -t gcr.io/YOUR_PROJECT_ID/wolfit-gym .

# העלאה ל-Container Registry
docker push gcr.io/YOUR_PROJECT_ID/wolfit-gym

# הפעלה ב-Cloud Run
gcloud run deploy wolfit-gym \
  --image gcr.io/YOUR_PROJECT_ID/wolfit-gym \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### 3. AWS ECS

#### שלב 1: התקנת AWS CLI
```bash
# macOS
brew install awscli

# או הורד מ-https://aws.amazon.com/cli/
```

#### שלב 2: הגדרת AWS
```bash
aws configure
```

#### שלב 3: בניית והעלאה
```bash
# בניית Image
docker build -t wolfit-gym .

# העלאה ל-ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker tag wolfit-gym:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/wolfit-gym:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/wolfit-gym:latest
```

### 4. הרצה מקומית עם Docker Compose

#### שלב 1: התקנת Docker
הורד והתקן Docker Desktop מ-https://www.docker.com/products/docker-desktop

#### שלב 2: הרצה
```bash
# בנייה והרצה
docker-compose up --build

# הרצה ברקע
docker-compose up -d --build

# עצירה
docker-compose down
```

#### שלב 3: גישה לאפליקציה
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Database: localhost:5432

## הוראות כלליות:

### עדכון משתני סביבה
בכל הפלטפורמות, וודא שמשתני הסביבה הבאים מוגדרים:
```
NODE_ENV=production
PORT=3001
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=Wolfit
DB_USER=your-username
DB_PASSWORD=your-password
```

### בדיקת השרת
לאחר ההעלאה, בדוק שהשרת עובד:
```
https://your-app-url/test
```

## קישורים שימושיים:
- [Railway Documentation](https://docs.railway.app)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Docker Documentation](https://docs.docker.com/)
