-- Complete reset of CompletedJob and FailedJob tables
-- WARNING: This will delete ALL data in these tables!
-- Run this in your PostgreSQL 'jobs' database

-- First, check what exists
SELECT 'Before cleanup - CompletedJob partitions:' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'CompletedJob%';

SELECT 'Before cleanup - FailedJob partitions:' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'FailedJob%';

-- Drop all CompletedJob partitions explicitly (in case they're orphaned)
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename LIKE 'CompletedJob_%'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS "' || tbl || '" CASCADE';
        RAISE NOTICE 'Dropped: %', tbl;
    END LOOP;
END $$;

-- Drop all FailedJob partitions explicitly (in case they're orphaned)
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename LIKE 'FailedJob_%'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS "' || tbl || '" CASCADE';
        RAISE NOTICE 'Dropped: %', tbl;
    END LOOP;
END $$;

-- Drop the parent tables (this will cascade to any remaining partitions)
DROP TABLE IF EXISTS "CompletedJob" CASCADE;
DROP TABLE IF EXISTS "FailedJob" CASCADE;

-- Verify everything is dropped
SELECT 'After cleanup - Tables remaining:' as info;
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE 'CompletedJob%' OR tablename LIKE 'FailedJob%');

-- Now restart your application and it will recreate the tables with correct partitions

