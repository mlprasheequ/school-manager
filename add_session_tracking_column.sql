-- Migration Script for Session Security Features
-- Run this on your Supabase database to add session tracking support

-- Add last_password_change column to students table
-- This tracks when credentials were last modified
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment to document the purpose of this column
COMMENT ON COLUMN students.last_password_change IS 'Timestamp when password was last changed. Used to invalidate active sessions when credentials are updated by admin.';

-- Optional: Create index for faster session validation queries
-- This helps performance if you have many users
CREATE INDEX IF NOT EXISTS idx_students_last_password_change 
ON students(last_password_change);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'last_password_change';
