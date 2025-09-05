using ServiceStack.OrmLite;

namespace MyApp.Migrations;

public class Migration1006 : MigrationBase
{
    public override void Up()
    {
        Db.ExecuteSql(
            """
            CREATE OR REPLACE FUNCTION bgcompare(rgba1 TEXT, rgba2 TEXT)
            RETURNS INTEGER
            LANGUAGE sql
            IMMUTABLE
            AS $$
                SELECT CASE 
                    WHEN rgba1 IS NOT NULL 
                         AND rgba2 IS NOT NULL 
                         AND LENGTH(rgba1) >= 4 
                         AND LENGTH(rgba1) = LENGTH(rgba2)
                         AND LEFT(rgba1, 1) = '#' 
                         AND LEFT(rgba2, 1) = '#'
                    THEN (
                        SELECT COALESCE(SUM(ABS(
                            ('x' || SUBSTRING(SUBSTRING(rgba1 FROM 2) FROM i FOR 2))::BIT(8)::INTEGER -
                            ('x' || SUBSTRING(SUBSTRING(rgba2 FROM 2) FROM i FOR 2))::BIT(8)::INTEGER
                        )), 0)
                        FROM generate_series(1, LENGTH(SUBSTRING(rgba1 FROM 2)), 2) AS i
                    )
                    ELSE 16777215
                END;
            $$;
            """
        );

        Db.ExecuteSql(
            """
            CREATE OR REPLACE FUNCTION hamming_distance_hex(hash1 TEXT, hash2 TEXT)
                RETURNS INTEGER AS $$
            DECLARE
                bytes1 BYTEA;
                bytes2 BYTEA;
                distance INTEGER := 0;
                i INTEGER;
                xor_val INTEGER;
                temp INTEGER;
            BEGIN
                bytes1 := decode(hash1, 'hex');
                bytes2 := decode(hash2, 'hex');
            
                FOR i IN 0..7 LOOP
                    xor_val := get_byte(bytes1, i) # get_byte(bytes2, i);
            
                    -- Count bits using Brian Kernighan's algorithm
                    temp := xor_val;
                    WHILE temp > 0 LOOP
                            distance := distance + 1;
                            temp := temp & (temp - 1);
                        END LOOP;
                END LOOP;
            
                RETURN distance;
            END;
            $$ LANGUAGE plpgsql;
            """
        );
    }

    public override void Down()
    {
        Db.ExecuteSql("DROP FUNCTION bgcompare;");
        Db.ExecuteSql("DROP FUNCTION hamming_distance_hex;");
    }
}