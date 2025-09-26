-- Updated Database Schema for Wolfit Gym Application
-- This schema matches the current codebase requirements

-- Create User table (updated to match code expectations)
CREATE TABLE IF NOT EXISTS "User" (
    idUser SERIAL PRIMARY KEY,
    userName VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    email VARCHAR(100) UNIQUE NOT NULL,
    height INTEGER,
    weight INTEGER,
    birthdate DATE,
    intensityLevel VARCHAR(20) DEFAULT 'medium',
    googleId VARCHAR(255) UNIQUE,
    profilePicture VARCHAR(500),
    authProvider VARCHAR(20) DEFAULT 'local'
);

-- Create SportTypes table (updated with more comprehensive sports)
CREATE TABLE IF NOT EXISTS SportTypes (
    sportType SERIAL PRIMARY KEY,
    sportName VARCHAR(50) NOT NULL
);

-- Create UserPreferences table (updated structure)
CREATE TABLE IF NOT EXISTS UserPreferences (
    id SERIAL PRIMARY KEY,
    idUser INTEGER REFERENCES "User"(idUser) ON DELETE CASCADE,
    sportType INTEGER REFERENCES SportTypes(sportType),
    preferenceRank INTEGER
);

-- Create Field table
CREATE TABLE IF NOT EXISTS Field (
    idField SERIAL PRIMARY KEY,
    fieldName VARCHAR(100) NOT NULL,
    sportType INTEGER REFERENCES SportTypes(sportType)
);

-- Create BookField table (updated structure)
CREATE TABLE IF NOT EXISTS BookField (
    idBooking SERIAL PRIMARY KEY,
    idField INTEGER REFERENCES Field(idField),
    bookingDate DATE NOT NULL,
    startTime TIME NOT NULL,
    idUser INTEGER REFERENCES "User"(idUser),
    UNIQUE(idField, bookingDate, startTime)
);

-- Insert comprehensive sport types (matching the old project but in Hebrew)
INSERT INTO SportTypes (sportName) VALUES 
    ('כדורגל'),
    ('כדורסל'),
    ('טיפוס'),
    ('אימון כוח'),
    ('קואורדינציה'),
    ('טניס'),
    ('פינג פונג'),
    ('ריקוד'),
    ('אופניים'),
    ('שחייה'),
    ('יוגה'),
    ('פילאטיס'),
    ('ריצה'),
    ('קיקבוקס')
ON CONFLICT DO NOTHING;

-- Insert comprehensive fields (41 fields as in the old project)
INSERT INTO Field (fieldName, sportType) VALUES 
    -- Soccer fields (2)
    ('מגרש כדורגל A', 1),
    ('מגרש כדורגל B', 1),
    -- Basketball courts (2)
    ('מגרש כדורסל 1', 2),
    ('מגרש כדורסל 2', 2),
    -- Climbing walls (5)
    ('קיר טיפוס למתחילים', 3),
    ('קיר טיפוס בינוני', 3),
    ('קיר טיפוס מתקדם', 3),
    ('קיר טיפוס מומחה', 3),
    ('קיר טיפוס מהירות', 3),
    -- Strength training areas (15)
    ('אזור כוח 1', 4),
    ('אזור כוח 2', 4),
    ('אזור כוח 3', 4),
    ('אזור כוח 4', 4),
    ('אזור כוח 5', 4),
    ('אזור כוח 6', 4),
    ('אזור כוח 7', 4),
    ('אזור כוח 8', 4),
    ('אזור כוח 9', 4),
    ('אזור כוח 10', 4),
    ('אזור כוח 11', 4),
    ('אזור כוח 12', 4),
    ('אזור כוח 13', 4),
    ('אזור כוח 14', 4),
    ('אזור כוח 15', 4),
    -- Coordination zones (5)
    ('אזור קואורדינציה 1', 5),
    ('אזור קואורדינציה 2', 5),
    ('אזור קואורדינציה 3', 5),
    ('אזור קואורדינציה 4', 5),
    ('אזור קואורדינציה 5', 5),
    -- Tennis courts (4)
    ('מגרש טניס 1', 6),
    ('מגרש טניס 2', 6),
    ('מגרש טניס 3', 6),
    ('מגרש טניס 4', 6),
    -- Ping pong tables (2)
    ('שולחן פינג פונג 1', 7),
    ('שולחן פינג פונג 2', 7),
    -- Dance floors (5)
    ('סטודיו ריקוד 1', 8),
    ('סטודיו ריקוד 2', 8),
    ('סטודיו ריקוד 3', 8),
    ('סטודיו ריקוד 4', 8),
    ('סטודיו ריקוד 5', 8),
    -- Digital fitness bikes (5)
    ('אופני כושר 1', 9),
    ('אופני כושר 2', 9),
    ('אופני כושר 3', 9),
    ('אופני כושר 4', 9),
    ('אופני כושר 5', 9),
    -- Swimming pool
    ('בריכת שחייה', 10),
    -- Yoga room
    ('חדר יוגה', 11),
    -- Pilates room
    ('חדר פילאטיס', 12),
    -- Running track
    ('מסלול ריצה', 13),
    -- Kickboxing area
    ('אזור קיקבוקס', 14)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_username ON "User"(userName);
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_booking_field_date ON BookField(idField, bookingDate);
CREATE INDEX IF NOT EXISTS idx_booking_user ON BookField(idUser);
CREATE INDEX IF NOT EXISTS idx_userpreferences_user ON UserPreferences(idUser);
