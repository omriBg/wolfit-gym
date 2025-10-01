-- טבלת שעות משתמשים (פשוטה)
CREATE TABLE IF NOT EXISTS UserHours (
    id SERIAL PRIMARY KEY,
    userId INTEGER REFERENCES "User"(idUser) ON DELETE CASCADE,
    availableHours INTEGER DEFAULT 0, -- כמה רבעי שעה זמינים עכשיו
    lastUpdated TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    createdBy VARCHAR(50) DEFAULT 'admin'
);

-- היסטוריה (אופציונלי)
CREATE TABLE IF NOT EXISTS UserHoursHistory (
    id SERIAL PRIMARY KEY,
    userId INTEGER REFERENCES "User"(idUser) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL, -- 'ADD', 'USE', 'REFUND'
    hours INTEGER NOT NULL,
    reason TEXT,
    createdBy VARCHAR(50) DEFAULT 'admin',
    createdAt TIMESTAMP DEFAULT NOW()
);

-- אינדקסים לביצועים טובים יותר
CREATE INDEX IF NOT EXISTS idx_userhours_user ON UserHours(userId);
CREATE INDEX IF NOT EXISTS idx_userhourshistory_user ON UserHoursHistory(userId);
CREATE INDEX IF NOT EXISTS idx_userhourshistory_createdat ON UserHoursHistory(createdAt);