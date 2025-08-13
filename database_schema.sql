-- Database Schema for Wolfit Gym Application

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
    idUser SERIAL PRIMARY KEY,
    userName VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    height INTEGER,
    weight INTEGER,
    birthdate DATE,
    intensityLevel VARCHAR(20) DEFAULT 'medium'
);

-- Create SportTypes table
CREATE TABLE IF NOT EXISTS SportTypes (
    sportType SERIAL PRIMARY KEY,
    sportName VARCHAR(50) NOT NULL
);

-- Create UserPreferences table
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

-- Create BookField table
CREATE TABLE IF NOT EXISTS BookField (
    idBooking SERIAL PRIMARY KEY,
    idField INTEGER REFERENCES Field(idField),
    bookingDate DATE NOT NULL,
    startTime TIME NOT NULL,
    idUser INTEGER REFERENCES "User"(idUser),
    UNIQUE(idField, bookingDate, startTime)
);

-- Insert sample data for SportTypes
INSERT INTO SportTypes (sportName) VALUES 
    ('כדורגל'),
    ('כדורסל'),
    ('טניס'),
    ('שחייה'),
    ('כושר'),
    ('יוגה'),
    ('פילאטיס'),
    ('ריצה'),
    ('אופניים'),
    ('קיקבוקס')
ON CONFLICT DO NOTHING;

-- Insert sample data for Fields
INSERT INTO Field (fieldName, sportType) VALUES 
    ('מגרש כדורגל 1', 1),
    ('מגרש כדורגל 2', 1),
    ('מגרש כדורסל 1', 2),
    ('מגרש כדורסל 2', 2),
    ('מגרש טניס 1', 3),
    ('מגרש טניס 2', 3),
    ('בריכת שחייה', 4),
    ('אולם כושר', 5),
    ('חדר יוגה', 6),
    ('חדר פילאטיס', 7)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_username ON "User"(userName);
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_booking_field_date ON BookField(idField, bookingDate);
CREATE INDEX IF NOT EXISTS idx_booking_user ON BookField(idUser);
CREATE INDEX IF NOT EXISTS idx_userpreferences_user ON UserPreferences(idUser);
