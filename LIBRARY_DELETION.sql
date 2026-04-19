-- SQL to completely remove Library Management (Archive) from the database
-- Run these queries in your Supabase SQL Editor

-- Step 1: Delete all library-related data
-- =====================================

-- Clear library logs (transaction records of borrowed books)
DELETE FROM library_logs;

-- Clear library reservations (book reservations by students)
DELETE FROM library_reservations;

-- Clear books table (all books in the archive)
DELETE FROM books;

-- Clear library settings (including font preferences for library)
DELETE FROM library_settings;

-- Step 2: Reset sequences to 1
-- ============================

-- Reset library_logs ID sequence
SELECT setval(pg_get_serial_sequence('library_logs', 'id'), 1, false);

-- Reset library_reservations ID sequence
SELECT setval(pg_get_serial_sequence('library_reservations', 'id'), 1, false);

-- Reset books ID sequence
SELECT setval(pg_get_serial_sequence('books', 'id'), 1, false);

-- Step 3: Drop tables (OPTIONAL - do this only if you want to remove the tables completely)
-- =======================================================================================
-- WARNING: This is irreversible. Only do this if you're 100% sure.

-- DROP TABLE IF EXISTS library_reservations CASCADE;
-- DROP TABLE IF EXISTS library_logs CASCADE;
-- DROP TABLE IF EXISTS library_settings CASCADE;
-- DROP TABLE IF EXISTS books CASCADE;

-- Step 4: Verify deletion
-- ======================

SELECT 'books', COUNT(*) FROM books
UNION ALL
SELECT 'library_logs', COUNT(*) FROM library_logs
UNION ALL
SELECT 'library_reservations', COUNT(*) FROM library_reservations
UNION ALL
SELECT 'library_settings', COUNT(*) FROM library_settings;

-- Expected output: All counts should be 0 (empty tables)
