using ServiceStack.DataAnnotations;
using ServiceStack.OrmLite;

namespace MyApp.Migrations;

[Description("Create FTS Tables")]
public class Migration1005 : MigrationBase
{
    public override void Up()
    {
        // Create virtual tables for SQLite Full Text Search
        Db.ExecuteNonQuery($@"ALTER TABLE ""Artifact"" ADD COLUMN ts tsvector;");
        Db.ExecuteNonQuery(
            $$"""
              CREATE OR REPLACE FUNCTION update_artifact_ts()
              RETURNS TRIGGER AS $$
              DECLARE
                  search_text text;
              BEGIN
                  WITH wg_data AS (
                      SELECT wg."Description" as wg_desc
                      FROM "WorkflowGeneration" wg 
                      WHERE wg."Id" = NEW."GenerationId"
                  ),
                  tags_data AS (
                      SELECT string_agg(key, ', ') as tags_str
                      FROM json_object_keys(COALESCE(NEW."Tags"::json, '{}'::json)) AS key
                  )
                  SELECT 
                      COALESCE(wg.wg_desc, '') || E'\n\n## ' || 
                      COALESCE(NEW."Caption", '') || E'\n\n' || 
                      COALESCE(NEW."Description", '') || E'\n\n> ' ||
                      COALESCE(t.tags_str, '')
                  INTO search_text
                  FROM wg_data wg, tags_data t;
                  
                  NEW.ts := to_tsvector('english', search_text);
                  
                  RETURN NEW;
              END;
              $$ LANGUAGE plpgsql;
              """);

        Db.ExecuteNonQuery(
            """
            CREATE TRIGGER artifact_ts_trigger
            BEFORE INSERT OR UPDATE ON "Artifact"
            FOR EACH ROW
            EXECUTE FUNCTION update_artifact_ts();
            """);
        
        Db.ExecuteNonQuery("CREATE INDEX idx_artifact_ts ON \"Artifact\" USING GIN(ts);");
    }

    public override void Down()
    {
        Db.ExecuteNonQuery("ALTER TABLE \"Artifact\" DROP COLUMN ts");
        Db.ExecuteNonQuery("DROP TRIGGER artifact_ts_trigger ON \"Artifact\";");
        Db.ExecuteNonQuery("DROP FUNCTION update_artifact_ts;");
    }
}
