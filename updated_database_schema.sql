-- טבלת שעות משתמשים
CREATE TABLE IF NOT EXISTS UserHours (
    id SERIAL PRIMARY KEY,
    userId INTEGER REFERENCES "User"(idUser) ON DELETE CASCADE,
    availableHours INTEGER DEFAULT 0,
    lastUpdated TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    createdBy VARCHAR(50) DEFAULT 'admin'
);

-- טבלת היסטוריית שעות
CREATE TABLE IF NOT EXISTS UserHoursHistory (
    id SERIAL PRIMARY KEY,
    userId INTEGER REFERENCES "User"(idUser) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL,
    hours INTEGER NOT NULL,
    reason TEXT,
    createdBy VARCHAR(50) DEFAULT 'admin',
    createdAt TIMESTAMP DEFAULT NOW()
);

-- אינדקסים לביצועים טובים יותר
CREATE INDEX IF NOT EXISTS idx_userhours_userid ON UserHours(userId);
CREATE INDEX IF NOT EXISTS idx_userhourshistory_userid ON UserHoursHistory(userId);