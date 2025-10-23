-- סכמת מסד נתונים למדדי כושר
-- Fitness Metrics Database Schema

-- טבלת מרכיבי כושר
CREATE TABLE IF NOT EXISTS FitnessComponents (
    componentId SERIAL PRIMARY KEY,
    componentName VARCHAR(50) NOT NULL UNIQUE,
    componentNameEn VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- טבלת מדדי כושר לכל ספורט
CREATE TABLE IF NOT EXISTS SportFitnessMetrics (
    id SERIAL PRIMARY KEY,
    sportType INTEGER REFERENCES SportTypes(sportType) ON DELETE CASCADE,
    componentId INTEGER REFERENCES FitnessComponents(componentId) ON DELETE CASCADE,
    metricValue INTEGER NOT NULL CHECK (metricValue >= 0 AND metricValue <= 3),
    -- 0 = לא רלוונטי, 1 = נמוך, 2 = בינוני, 3 = גבוה
    UNIQUE(sportType, componentId)
);

-- הכנסת מרכיבי הכושר
INSERT INTO FitnessComponents (componentName, componentNameEn, description) VALUES 
    ('כוח', 'Strength', 'יכולת השרירים לייצר כוח מקסימלי'),
    ('מהירות', 'Speed', 'יכולת תנועה מהירה'),
    ('כוח מתפרץ', 'Explosive Power', 'יכולת לייצר כוח מקסימלי בזמן קצר'),
    ('סבולת שריר', 'Muscular Endurance', 'יכולת השרירים לעבוד לאורך זמן'),
    ('סבולת לב-ריאה', 'Cardiovascular Endurance', 'יכולת הלב והריאות לספק חמצן'),
    ('גמישות', 'Flexibility', 'טווח התנועה של המפרקים'),
    ('קואורדינציה', 'Coordination', 'יכולת תיאום בין חלקי הגוף'),
    ('שיווי משקל', 'Balance', 'יכולת שמירה על יציבות'),
    ('אגיליטי (זריזות)', 'Agility', 'יכולת שינוי כיוון מהיר'),
    ('דיוק מוטורי', 'Motor Precision', 'יכולת ביצוע תנועות מדויקות')
ON CONFLICT (componentName) DO NOTHING;

-- הכנסת נתוני מדדי הכושר לכל ספורט
-- אופני ספינינג (נניח שזה ID 10)
INSERT INTO SportFitnessMetrics (sportType, componentId, metricValue) VALUES 
    (10, 1, 2), -- כוח: בינוני
    (10, 2, 2), -- מהירות: בינוני
    (10, 3, 1), -- כוח מתפרץ: נמוך
    (10, 4, 3), -- סבולת שריר: גבוה
    (10, 5, 3), -- סבולת לב-ריאה: גבוה
    (10, 6, 1), -- גמישות: נמוך
    (10, 7, 2), -- קואורדינציה: בינוני
    (10, 8, 2), -- שיווי משקל: בינוני
    (10, 9, 0), -- אגיליטי: לא רלוונטי
    (10, 10, 0) -- דיוק מוטורי: לא רלוונטי
ON CONFLICT (sportType, componentId) DO UPDATE SET metricValue = EXCLUDED.metricValue;

-- כדורסל (נניח שזה ID 2)
INSERT INTO SportFitnessMetrics (sportType, componentId, metricValue) VALUES 
    (2, 1, 3), -- כוח: גבוה
    (2, 2, 3), -- מהירות: גבוה
    (2, 3, 3), -- כוח מתפרץ: גבוה
    (2, 4, 2), -- סבולת שריר: בינוני
    (2, 5, 2), -- סבולת לב-ריאה: בינוני
    (2, 6, 2), -- גמישות: בינוני
    (2, 7, 3), -- קואורדינציה: גבוה
    (2, 8, 3), -- שיווי משקל: גבוה
    (2, 9, 2), -- אגיליטי: בינוני
    (2, 10, 2) -- דיוק מוטורי: בינוני
ON CONFLICT (sportType, componentId) DO UPDATE SET metricValue = EXCLUDED.metricValue;

-- כדורגל (נניח שזה ID 1)
INSERT INTO SportFitnessMetrics (sportType, componentId, metricValue) VALUES 
    (1, 1, 3), -- כוח: גבוה
    (1, 2, 3), -- מהירות: גבוה
    (1, 3, 3), -- כוח מתפרץ: גבוה
    (1, 4, 2), -- סבולת שריר: בינוני
    (1, 5, 3), -- סבולת לב-ריאה: גבוה
    (1, 6, 2), -- גמישות: בינוני
    (1, 7, 3), -- קואורדינציה: גבוה
    (1, 8, 3), -- שיווי משקל: גבוה
    (1, 9, 2), -- אגיליטי: בינוני
    (1, 10, 2) -- דיוק מוטורי: בינוני
ON CONFLICT (sportType, componentId) DO UPDATE SET metricValue = EXCLUDED.metricValue;

-- טניס (נניח שזה ID 3)
INSERT INTO SportFitnessMetrics (sportType, componentId, metricValue) VALUES 
    (3, 1, 2), -- כוח: בינוני
    (3, 2, 3), -- מהירות: גבוה
    (3, 3, 2), -- כוח מתפרץ: בינוני
    (3, 4, 2), -- סבולת שריר: בינוני
    (3, 5, 2), -- סבולת לב-ריאה: בינוני
    (3, 6, 2), -- גמישות: בינוני
    (3, 7, 3), -- קואורדינציה: גבוה
    (3, 8, 3), -- שיווי משקל: גבוה
    (3, 9, 3), -- אגיליטי: גבוה
    (3, 10, 3) -- דיוק מוטורי: גבוה
ON CONFLICT (sportType, componentId) DO UPDATE SET metricValue = EXCLUDED.metricValue;

-- טיפוס (נניח שזה ID 3)
INSERT INTO SportFitnessMetrics (sportType, componentId, metricValue) VALUES 
    (3, 1, 3), -- כוח: גבוה
    (3, 2, 1), -- מהירות: נמוך
    (3, 3, 2), -- כוח מתפרץ: בינוני
    (3, 4, 3), -- סבולת שריר: גבוה
    (3, 5, 2), -- סבולת לב-ריאה: בינוני
    (3, 6, 2), -- גמישות: בינוני
    (3, 7, 3), -- קואורדינציה: גבוה
    (3, 8, 3), -- שיווי משקל: גבוה
    (3, 9, 2), -- אגיליטי: בינוני
    (3, 10, 1) -- דיוק מוטורי: נמוך
ON CONFLICT (sportType, componentId) DO UPDATE SET metricValue = EXCLUDED.metricValue;

-- זריזות וקואורדינציה (נניח שזה ID 5)
INSERT INTO SportFitnessMetrics (sportType, componentId, metricValue) VALUES 
    (5, 1, 1), -- כוח: נמוך
    (5, 2, 3), -- מהירות: גבוה
    (5, 3, 1), -- כוח מתפרץ: נמוך
    (5, 4, 2), -- סבולת שריר: בינוני
    (5, 5, 2), -- סבולת לב-ריאה: בינוני
    (5, 6, 1), -- גמישות: נמוך
    (5, 7, 3), -- קואורדינציה: גבוה
    (5, 8, 2), -- שיווי משקל: בינוני
    (5, 9, 3), -- אגיליטי: גבוה
    (5, 10, 3) -- דיוק מוטורי: גבוה
ON CONFLICT (sportType, componentId) DO UPDATE SET metricValue = EXCLUDED.metricValue;

-- פינגפונג (נניח שזה ID 7)
INSERT INTO SportFitnessMetrics (sportType, componentId, metricValue) VALUES 
    (7, 1, 1), -- כוח: נמוך
    (7, 2, 3), -- מהירות: גבוה
    (7, 3, 1), -- כוח מתפרץ: נמוך
    (7, 4, 2), -- סבולת שריר: בינוני
    (7, 5, 2), -- סבולת לב-ריאה: בינוני
    (7, 6, 1), -- גמישות: נמוך
    (7, 7, 3), -- קואורדינציה: גבוה
    (7, 8, 2), -- שיווי משקל: בינוני
    (7, 9, 3), -- אגיליטי: גבוה
    (7, 10, 3) -- דיוק מוטורי: גבוה
ON CONFLICT (sportType, componentId) DO UPDATE SET metricValue = EXCLUDED.metricValue;

-- חדר כושר (נניח שזה ID 4)
INSERT INTO SportFitnessMetrics (sportType, componentId, metricValue) VALUES 
    (4, 1, 3), -- כוח: גבוה
    (4, 2, 1), -- מהירות: נמוך
    (4, 3, 2), -- כוח מתפרץ: בינוני
    (4, 4, 3), -- סבולת שריר: גבוה
    (4, 5, 2), -- סבולת לב-ריאה: בינוני
    (4, 6, 1), -- גמישות: נמוך
    (4, 7, 1), -- קואורדינציה: נמוך
    (4, 8, 1), -- שיווי משקל: נמוך
    (4, 9, 1), -- אגיליטי: נמוך
    (4, 10, 0) -- דיוק מוטורי: לא רלוונטי
ON CONFLICT (sportType, componentId) DO UPDATE SET metricValue = EXCLUDED.metricValue;

-- אגרוף (נניח שזה ID 8 - במקום ריקוד)
INSERT INTO SportFitnessMetrics (sportType, componentId, metricValue) VALUES 
    (8, 1, 3), -- כוח: גבוה
    (8, 2, 3), -- מהירות: גבוה
    (8, 3, 3), -- כוח מתפרץ: גבוה
    (8, 4, 2), -- סבולת שריר: בינוני
    (8, 5, 3), -- סבולת לב-ריאה: גבוה
    (8, 6, 2), -- גמישות: בינוני
    (8, 7, 3), -- קואורדינציה: גבוה
    (8, 8, 3), -- שיווי משקל: גבוה
    (8, 9, 3), -- אגיליטי: גבוה
    (8, 10, 3) -- דיוק מוטורי: גבוה
ON CONFLICT (sportType, componentId) DO UPDATE SET metricValue = EXCLUDED.metricValue;

-- יצירת אינדקסים לביצועים טובים יותר
CREATE INDEX IF NOT EXISTS idx_sport_fitness_metrics_sport ON SportFitnessMetrics(sportType);
CREATE INDEX IF NOT EXISTS idx_sport_fitness_metrics_component ON SportFitnessMetrics(componentId);
CREATE INDEX IF NOT EXISTS idx_fitness_components_name ON FitnessComponents(componentName);
