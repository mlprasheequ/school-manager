-- ============================================
-- FORCE LOGOUT ALL USERS - After Database Deletion
-- ============================================
-- ⚠️ This will invalidate ALL active user sessions
-- Run this AFTER deleting all data to force everyone to log out

-- This updates the last_password_change timestamp for ALL users
-- which will invalidate any existing sessions

BEGIN;

-- Update all students with current timestamp (invalidates their sessions)
UPDATE students SET last_password_change = timezone('utc', now());

-- Update all responsible users with current timestamp (invalidates their sessions)
UPDATE students SET last_password_change = timezone('utc', now()) WHERE is_responsible = true;

COMMIT;

-- ============================================
-- VERIFICATION - Check if timestamps were updated
-- ============================================
-- Run this to verify timestamps were set:

SELECT 
  id,
  full_name,
  username,
  is_responsible,
  last_password_change
FROM students
WHERE last_password_change IS NOT NULL
ORDER BY last_password_change DESC;

-- All users should now have recent last_password_change timestamps
-- This means any old sessions will be invalid
