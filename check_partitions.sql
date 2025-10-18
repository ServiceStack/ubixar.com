-- Check existing partitions and their boundaries
-- Run this in your PostgreSQL 'jobs' database

-- Check CompletedJob partitions
SELECT 
    c.relname AS partition_name,
    pg_get_expr(c.relpartbound, c.oid) AS partition_bounds
FROM pg_class c
JOIN pg_inherits i ON c.oid = i.inhrelid
JOIN pg_class p ON i.inhparent = p.oid
WHERE p.relname = 'CompletedJob'
ORDER BY c.relname;

-- Check FailedJob partitions
SELECT 
    c.relname AS partition_name,
    pg_get_expr(c.relpartbound, c.oid) AS partition_bounds
FROM pg_class c
JOIN pg_inherits i ON c.oid = i.inhrelid
JOIN pg_class p ON i.inhparent = p.oid
WHERE p.relname = 'FailedJob'
ORDER BY c.relname;

-- Alternative view using pg_partition_tree
SELECT * FROM pg_partition_tree('"CompletedJob"'::regclass);
SELECT * FROM pg_partition_tree('"FailedJob"'::regclass);

