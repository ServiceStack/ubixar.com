-- Drop all partitions for CompletedJob and FailedJob tables
-- Run this script in your PostgreSQL 'jobs' database

-- Drop all CompletedJob partitions
DO $$
DECLARE
    partition_name TEXT;
BEGIN
    FOR partition_name IN 
        SELECT relid::regclass::text 
        FROM pg_partition_tree('"CompletedJob"'::regclass) 
        WHERE parentrelid IS NOT NULL
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || partition_name || ' CASCADE';
        RAISE NOTICE 'Dropped partition: %', partition_name;
    END LOOP;
END $$;

-- Drop all FailedJob partitions
DO $$
DECLARE
    partition_name TEXT;
BEGIN
    FOR partition_name IN 
        SELECT relid::regclass::text 
        FROM pg_partition_tree('"FailedJob"'::regclass) 
        WHERE parentrelid IS NOT NULL
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || partition_name || ' CASCADE';
        RAISE NOTICE 'Dropped partition: %', partition_name;
    END LOOP;
END $$;

-- Verify partitions are dropped
SELECT 'CompletedJob partitions remaining:' as info, COUNT(*) as count
FROM pg_partition_tree('"CompletedJob"'::regclass) 
WHERE parentrelid IS NOT NULL;

SELECT 'FailedJob partitions remaining:' as info, COUNT(*) as count
FROM pg_partition_tree('"FailedJob"'::regclass) 
WHERE parentrelid IS NOT NULL;

