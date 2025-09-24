using System.Collections.Concurrent;
using System.Data;
using ServiceStack.Data;
using ServiceStack.Jobs;
using ServiceStack.OrmLite;
using ServiceStack.OrmLite.Dapper;

namespace ServiceStack;

public class DbJobsProvider
{
    public IDbConnectionFactory DbFactory { get; set; }
    public IOrmLiteDialectProvider Dialect { get; set; }
    public Action<IDbConnection>? ConfigureDb { get; set; }
    public void DefaultConfigureDb(IDbConnection db) => db.WithName(GetType().Name);

    public virtual void InitSchema()
    {
        using var db = OpenDb();
        InitSchema(db);
    }

    public virtual void InitSchema(IDbConnection db)
    {
        db.CreateTableIfNotExists<BackgroundJob>();
        db.CreateTableIfNotExists<JobSummary>();
        db.CreateTableIfNotExists<ScheduledTask>();

        using var monthDb = OpenMonthDb(DateTime.UtcNow);
        InitMonthDbSchema(monthDb);
    }
    
    public virtual void InitMonthDbSchema(IDbConnection db)
    {
        db.CreateTableIfNotExists<CompletedJob>();
        db.CreateTableIfNotExists<FailedJob>();
    }

    public virtual string GetMonthTableName(Type modelType, DateTime createdDate)
    {
        var suffix = createdDate.ToString("_yyyy_MM");
        var tableName = Dialect.GetTableName(modelType.Name);
        return tableName.EndsWith(suffix) 
            ? tableName 
            : tableName + suffix;
    }

    public virtual IDbConnection OpenDb()
    {
        var db = DbFactory.OpenDbConnection();
        ConfigureDb?.Invoke(db);
        return db;
    }
    
    public virtual IDbConnection OpenMonthDb(DateTime createdDate)
    {
        return OpenDb();
    }

    public static DbJobsProvider Create(IDbConnectionFactory dbFactory)
    {
        var dialect = dbFactory.GetDialectProvider();
        var typeName = dialect.GetType().Name;
        var dbProvider = typeName.StartsWith("Postgre")
            ? new PostgresDbJobsProvider()
            :  typeName.StartsWith("MySql") || typeName.StartsWith("Maria")
                ? new MySqlDbJobsProvider()
                : typeName.StartsWith("SqlServer")
                    ? new SqlServerDbJobsProvider()
                    : new DbJobsProvider();
        dbProvider.DbFactory = dbFactory;
        dbProvider.Dialect = dialect;
        dbProvider.ConfigureDb = dbProvider.DefaultConfigureDb;
        return dbProvider;
    }

    public virtual List<DateTime> GetTableMonths(IDbConnection db)
    {
        return [];
    }

    public virtual string SqlDateFormat(string quotedColumn, string format)
    {
        return $"strftime('{format}',{quotedColumn})";
    }
    
    public virtual string SqlChar(int charCode) => $"CHAR({charCode})";

    public virtual void DropTables(DateTime? createdDate=null)
    {
        using var db = OpenDb();
        db.DropTable<BackgroundJob>();
        db.DropTable<JobSummary>();
        db.DropTable<ScheduledTask>();

        createdDate ??= DateTime.UtcNow;
        using var dbMonth = OpenMonthDb(createdDate.Value);
        dbMonth.DropTable<CompletedJob>();
        dbMonth.DropTable<FailedJob>();
    }
}

public class MySqlDbJobsProvider : DbJobsProvider
{
    public override string SqlDateFormat(string quotedColumn, string format)
    {
        return $"DATE_FORMAT({quotedColumn}, '{format}')";
    }
}

public class SqlServerDbJobsProvider : DbJobsProvider
{
    // strftime('%Y-%m-%d %H:%M:%S', 'now')
    public Dictionary<string, string> DateFormatMap = new() {
        {"%Y", "YYYY"},
        {"%m", "MM"},
        {"%d", "DD"},
        {"%H", "HH"},
        {"%M", "mm"},
        {"%S", "ss"},
    };
    public override string SqlDateFormat(string quotedColumn, string format)
    {
        var fmt = format.Contains('\'')
            ? format.Replace("'", "")
            : format;
        foreach (var entry in DateFormatMap)
        {
            fmt = fmt.Replace(entry.Key, entry.Value);
        }
        return $"FORMAT({quotedColumn}, '{fmt}')";
    }
}

public class PostgresDbJobsProvider : DbJobsProvider
{
    ConcurrentDictionary<string, bool> monthDbs = new();
    
    public override void InitSchema(IDbConnection db)
    {
        db.CreateTableIfNotExists<BackgroundJob>();
        db.CreateTableIfNotExists<JobSummary>();
        db.CreateTableIfNotExists<ScheduledTask>();

        var completedSql = CreatePartitionTableSql(typeof(CompletedJob), nameof(CompletedJob.CreatedDate));
        db.Execute(completedSql);

        var failedSql = CreatePartitionTableSql(typeof(FailedJob), nameof(FailedJob.CreatedDate));
        db.Execute(failedSql);

        using var monthDb = OpenMonthDb(DateTime.UtcNow);
    }
    
    public override void InitMonthDbSchema(IDbConnection db)
    {
        // Do nothing, already handled in InitSchema() + OpenMonthDb()
    }
    
    public string CreatePartitionTableSql(Type modelType, string dateField)
    {
        var modelDef = modelType.GetModelMetadata();
        var createTableSql = Dialect.ToCreateTableStatement(modelType);
        var rawSql = createTableSql
            .Replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ")
            .Replace(" PRIMARY KEY", "").LastLeftPart(')').Trim();
        var idField = Dialect.GetQuotedColumnName(modelDef.PrimaryKey);
        var createdFieldDef = modelDef.GetFieldDefinition(dateField)
            ?? throw new Exception($"Field {dateField} not found on {modelType.Name}");
        var createdField = Dialect.GetQuotedColumnName(createdFieldDef);
        var newSql = rawSql +
            $"""
            ,
              PRIMARY KEY ({idField},{createdField})
            ) PARTITION BY RANGE ({createdField});
            """;
        return newSql;
    }

    public string CreatePartitionSql(Type modelType, DateTime createdDate)
    {
        return $"""
            CREATE TABLE IF NOT EXISTS {Dialect.QuoteTable(GetMonthTableName(modelType, createdDate))}
            PARTITION OF {Dialect.GetQuotedTableName(modelType)}
            FOR VALUES FROM ('{createdDate:yyyy-MM-dd} 00:00:00') TO ('{createdDate.AddMonths(1):yyyy-MM-dd} 00:00:00');
            """;
    }

    public override IDbConnection OpenDb() => base.OpenDb();
    
    public override IDbConnection OpenMonthDb(DateTime createdDate)
    {
        var partTableName = GetMonthTableName(typeof(CompletedJob), createdDate);
        var db = DbFactory.OpenDbConnection();
        ConfigureDb?.Invoke(db);
        if (!monthDbs.ContainsKey(partTableName))
        {
            db.Execute(CreatePartitionSql(typeof(CompletedJob), createdDate));
            db.Execute(CreatePartitionSql(typeof(FailedJob), createdDate));
            monthDbs[partTableName] = true;
        }
        return db;
    }

    public override List<DateTime> GetTableMonths(IDbConnection db)
    {
        var quotedTable = Dialect.GetQuotedTableName(typeof(CompletedJob));
        var partitionNames = db.SqlColumn<string>(
            $"SELECT relid::text\nFROM pg_partition_tree('{quotedTable}'::regclass)\nWHERE parentrelid IS NOT NULL");
        var monthDbs = partitionNames
            .Where(x => x.Contains('_'))
            .Select(x => 
                DateTime.TryParse(x.RightPart('_').LeftPart('.') + "-01", out var date) ? date : (DateTime?)null)
            .Where(x => x != null)
            .Select(x => x!.Value)
            .OrderDescending()
            .ToList();
        return monthDbs;
    }
    
    public override void DropTables(DateTime? createdDate=null)
    {
        using var db = OpenDb();
        db.DropTable<BackgroundJob>();
        db.DropTable<JobSummary>();
        db.DropTable<ScheduledTask>();

        createdDate ??= DateTime.UtcNow;
        var dbMonth = db;
        dbMonth.DropTable<CompletedJob>();
        dbMonth.DropTable<FailedJob>();

        monthDbs.Clear();
    }
    
    // strftime('%Y-%m-%d %H:%M:%S', 'now')
    public Dictionary<string, string> DateFormatMap = new() {
        {"%Y", "YYYY"},
        {"%m", "MM"},
        {"%d", "DD"},
        {"%H", "HH24"},
        {"%M", "MI"},
        {"%S", "SS"},
    };
    
    public override string SqlDateFormat(string quotedColumn, string format)
    {
        var fmt = format.Contains('\'')
            ? format.Replace("'", "")
            : format;
        foreach (var entry in DateFormatMap)
        {
            fmt = fmt.Replace(entry.Key, entry.Value);
        }
        return $"TO_CHAR({quotedColumn}, '{fmt}')";
    }
    
    public override string SqlChar(int charCode) => $"CHR({charCode})";
}
