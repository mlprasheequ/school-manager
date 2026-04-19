-- ============================================
-- QUICK DELETE - All School Management Data
-- ============================================
-- ⚠️ WARNING: This deletes ALL data permanently!
-- Run in Supabase SQL Editor

BEGIN;

-- Delete all dependent data first
DELETE FROM library_reservations;
DELETE FROM library_logs;  
DELETE FROM fund_transactions;
DELETE FROM student_groups;
DELETE FROM school_notifications;
DELETE FROM school_finances;
UPDATE library_settings SET font_id = NULL;

-- Delete main data
DELETE FROM students;
DELETE FROM books;

COMMIT;

-- ============================================
-- VERIFICATION - Check if deletion worked
-- ============================================
-- Run this query to verify all tables are empty:

SELECT 
  (SELECT COUNT(*) FROM students) as students,
  (SELECT COUNT(*) FROM books) as books,
  (SELECT COUNT(*) FROM library_logs) as library_logs,
  (SELECT COUNT(*) FROM fund_transactions) as fund_transactions,
  (SELECT COUNT(*) FROM library_reservations) as reservations,
  (SELECT COUNT(*) FROM school_finances) as finances,
  (SELECT COUNT(*) FROM student_groups) as groups,
  (SELECT COUNT(*) FROM school_notifications) as notifications;

-- Expected result: All counts should be 0
