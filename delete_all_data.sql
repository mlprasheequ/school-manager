-- ⚠️ WARNING: This will DELETE ALL DATA from your school management system!
-- This action is PERMANENT and CANNOT be undone.
-- Make sure you have backups if you need to keep any data.

-- Run this in Supabase SQL Editor

-- Start transaction (will rollback if any error occurs)
BEGIN;

-- Step 1: Delete from tables with foreign key dependencies first
-- This prevents foreign key constraint violations

-- Clear library reservations (depends on students and books)
DELETE FROM library_reservations;

-- Clear library logs (depends on students and books)
DELETE FROM library_logs;

-- Clear fund transactions (depends on students)
DELETE FROM fund_transactions;

-- Clear student groups associations
DELETE FROM student_groups;

-- Clear school notifications
DELETE FROM school_notifications;

-- Clear school finances
DELETE FROM school_finances;

-- Clear library settings references
UPDATE library_settings SET font_id = NULL;

-- Step 2: Delete main data tables
-- Now safe to delete from main tables

-- Delete all students (this will also cascade to any remaining references)
DELETE FROM students;

-- Delete all books
DELETE FROM books;

-- Delete school fonts (if you want to reset custom fonts)
-- DELETE FROM school_fonts; 
-- Commented out - keep fonts as they might be reused

-- Reset library settings to default
UPDATE library_settings SET updated_at = timezone('utc', now());

-- Step 3: Reset auto-increment sequences (if needed)
-- This ensures new IDs start from 1 again

-- Reset sequences for all tables
SELECT setval(pg_get_serial_sequence('students', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('books', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('library_logs', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('fund_transactions', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('school_finances', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('library_reservations', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('student_groups', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('school_notifications', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('school_fonts', 'id'), 1, false);

-- Step 4: Verify deletion
-- Count records in each table (should all be 0)
SELECT 
  'students' as table_name, COUNT(*) as record_count FROM students
UNION ALL
SELECT 'books', COUNT(*) FROM books
UNION ALL
SELECT 'library_logs', COUNT(*) FROM library_logs
UNION ALL
SELECT 'fund_transactions', COUNT(*) FROM fund_transactions
UNION ALL
SELECT 'library_reservations', COUNT(*) FROM library_reservations
UNION ALL
SELECT 'school_finances', COUNT(*) FROM school_finances
UNION ALL
SELECT 'student_groups', COUNT(*) FROM student_groups
UNION ALL
SELECT 'school_notifications', COUNT(*) FROM school_notifications;

-- If everything looks good, commit the transaction
COMMIT;

-- If you see errors or want to cancel, run this instead:
-- ROLLBACK;

-- ============================================
-- ALTERNATIVE: Quick Delete All (One Command)
-- ============================================
-- If you just want to delete everything fast without verification:
/*
BEGIN;
DELETE FROM library_reservations;
DELETE FROM library_logs;
DELETE FROM fund_transactions;
DELETE FROM student_groups;
DELETE FROM school_notifications;
DELETE FROM school_finances;
UPDATE library_settings SET font_id = NULL;
DELETE FROM students;
DELETE FROM books;
COMMIT;
*/

-- ============================================
-- ADMIN ACCOUNT MANAGEMENT
-- ============================================
-- Note: Admin accounts are typically not stored in the students table
-- They use a separate authentication system (system.com domain)
-- If you have admin data in a separate table, use:

-- To delete specific admin (if admins are in students table with is_admin flag):
-- DELETE FROM students WHERE is_admin = true AND id = 'specific-admin-id';

-- However, based on your system design, admin login uses:
-- admin@system.com which doesn't query the students table
-- So no admin deletion is needed from database

-- ============================================
-- POST-DELETION VERIFICATION
-- ============================================
-- After running the deletion, verify with these queries:

-- Check students table is empty
-- SELECT COUNT(*) FROM students; -- Should return 0

-- Check books table is empty  
-- SELECT COUNT(*) FROM books; -- Should return 0

-- Check all related tables
-- SELECT 
--   (SELECT COUNT(*) FROM students) as students,
--   (SELECT COUNT(*) FROM books) as books,
--   (SELECT COUNT(*) FROM library_logs) as library_logs,
--   (SELECT COUNT(*) FROM fund_transactions) as fund_transactions,
--   (SELECT COUNT(*) FROM library_reservations) as reservations;
