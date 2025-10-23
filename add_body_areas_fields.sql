-- Add body areas fields to existing User table
-- This script adds the new fields for strength training preferences

-- Add wantsStrengthTraining column
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS wantsStrengthTraining BOOLEAN DEFAULT FALSE;

-- Add selectedBodyAreas column as TEXT array
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS selectedBodyAreas TEXT[] DEFAULT '{}';

-- Update existing users to have default values
UPDATE "User" 
SET wantsStrengthTraining = FALSE, selectedBodyAreas = '{}' 
WHERE wantsStrengthTraining IS NULL OR selectedBodyAreas IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN "User".wantsStrengthTraining IS 'Indicates if user wants to include strength training in their workouts';
COMMENT ON COLUMN "User".selectedBodyAreas IS 'Array of body areas the user wants to focus on (back, shoulders, arms, chest, core, legs)';
