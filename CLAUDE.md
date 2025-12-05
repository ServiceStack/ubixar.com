# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ComfyGateway** - A server gateway and UI to manage and execute ComfyUI workflows. This is a full-stack application built with ServiceStack (C#/.NET 8) backend and a Vue 3 frontend (with planned migration to Next.js 16).

## Technology Stack

### Backend
- **Framework**: ASP.NET Core 8.0 with ServiceStack
- **Database**: PostgreSQL (production), SQLite (development/testing)
- **ORM**: ServiceStack.OrmLite
- **Authentication**: ASP.NET Core Identity with OAuth (Google)
- **Background Jobs**: ServiceStack.Jobs with Commands pattern
- **Container**: Docker with multi-stage build

### Frontend (Current)
- **Framework**: Vue 3 SPA with TypeScript
- **Build**: Bun runtime, TailwindCSS
- **State**: IndexedDB for offline caching
- **API Client**: ServiceStack JsonServiceClient with auto-generated DTOs

### Frontend (Planned Migration)
- See [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for complete Next.js 16 migration strategy

## Project Structure

```
ubixar.com/
├── MyApp/                          # Main ASP.NET Core web application
│   ├── wwwroot/                    # Static files, Vue SPA
│   │   ├── mjs/                    # TypeScript modules, DTOs
│   │   ├── pages/                  # Vue components
│   │   ├── css/                    # Tailwind output
│   │   └── data/                   # Static data files
│   ├── Components/                 # Blazor components
│   ├── Configure.*.cs              # Modular app configuration
│   └── Program.cs                  # Application entry point
│
├── MyApp.ServiceModel/             # Request/Response DTOs, domain models
│   ├── Comfy.cs                    # Comfy workflow DTOs
│   ├── Artifacts.cs                # Artifact/Asset models
│   ├── Agent.cs                    # Agent/Device models
│   ├── Thread.cs                   # Thread conversation models
│   └── ...
│
├── MyApp.ServiceInterface/         # Service implementations
│   ├── ComfyServices.cs            # Workflow execution services
│   ├── ArtifactServices.cs         # Artifact management
│   ├── DeviceServices.cs           # Device pool management
│   ├── AgentServices.cs            # Agent communication
│   ├── AdminServices.cs            # Admin operations
│   ├── AppData.cs                  # In-memory data cache
│   ├── Commands/                   # Background job commands
│   └── ...
│
├── MyApp.Tests/                    # NUnit test suite
│   ├── workflows/                  # Test workflow JSON files
│   └── ...
│
└── App_Data/                       # Application data directory
    ├── db.sqlite                   # Development SQLite DB
    ├── jobs/                       # Background job queue DB
    └── uploads/                    # File uploads
```

## Common Development Commands

### Running the Application

```bash
# Development with hot reload (C# backend + Vue frontend)
cd MyApp
dotnet watch

# Build frontend CSS
npm run ui:build          # Production build
npm run ui:dev            # Watch mode

# Generate TypeScript DTOs from C# ServiceModel
npm run dtos              # Runs: x mjs
```

### Database Operations

```bash
cd MyApp

# Run migrations
npm run migrate           # Runs: dotnet run --AppTasks=migrate

# Revert last migration
npm run revert:last

# Revert all migrations
npm run revert:all

# Rerun last migration (revert + migrate)
npm run rerun:last

# Initialize Entity Framework
npm run init-ef
```

### Testing

```bash
# Run all tests
cd MyApp.Tests
dotnet test

# Run specific test class
dotnet test --filter "FullyQualifiedName~ComfyWorkflowParseTests"

# Run tests with verbose output
dotnet test --logger "console;verbosity=detailed"
```

### Building & Deployment

```bash
# Build solution
dotnet build

# Publish application
cd MyApp
dotnet publish -c Release -o ./publish

# Build Docker image
docker build -t ubixar .

# Run with Docker Compose
docker-compose up
```

## Architecture Overview

### ServiceStack Service Layer

This application follows the ServiceStack pattern where:

1. **DTOs** (`MyApp.ServiceModel/`) define the API contract
2. **Services** (`MyApp.ServiceInterface/`) implement business logic
3. **AutoQuery** enables automatic CRUD APIs for query operations
4. **Commands** handle background jobs (email, workflows, achievements)

All ServiceStack services automatically get:
- REST endpoints (JSON/XML/JSV)
- gRPC endpoints
- Message queue support
- Auto-generated metadata and DTOs

### Database Architecture

**Primary Database** (configurable via `DefaultConnection` connection string):
- Stores users, workflows, generations, artifacts, devices
- Uses ORM-lite with code-first migrations in `Configure.Db.Migrations.cs`
- Partitioned tables for large datasets (ComfyJob, PromptTask)

**Jobs Database** (separate SQLite or PostgreSQL):
- Managed by ServiceStack.Jobs
- Stores background job queue and execution history
- Independent of main application database

### Background Jobs System

Uses ServiceStack.Jobs with Commands pattern:
- `ExecuteComfyApiPromptCommand` - Queue ComfyUI workflow execution
- `OpenAiChatCommand` - Process AI chat interactions
- `ArtifactReactionAchievementCommands` - Award achievements
- Background jobs run via `JobsHostedService` with 10-second tick interval

### AppData Caching Layer

`AppData.cs` maintains in-memory cache of frequently accessed data:
- Workflows and workflow versions
- Artifacts (featured, best rated)
- Tags, models, devices
- Reloaded on app startup and after admin changes
- Dramatically reduces database queries for read-heavy operations

### Authentication & Authorization

- **ASP.NET Core Identity** for user management
- **OAuth providers**: Google (configurable in appsettings.json)
- **Roles**: Admin, Moderator (defined in `AppRoles.cs`)
- **API Key Auth**: Supports `AdminAuthSecret` for service-to-service calls
- Sessions stored in cookies, synced to client localStorage

### ComfyUI Integration

The gateway communicates with ComfyUI agents:
- `ComfyGateway.cs` - HTTP client for ComfyUI API
- `ComfyWorkflowParser.cs` - Parse ComfyUI workflow JSON
- `ComfyWorkflowConverter.cs` - Convert between formats (C#/Node/Prompt)
- `AgentEventsManager.cs` - WebSocket communication with agents
- Device pool management for distributed processing

### Frontend-Backend Communication

1. **DTO Generation**: `x mjs` command generates `wwwroot/mjs/dtos.ts` from C# DTOs
2. **Type-safe API calls**: `JsonServiceClient` uses generated DTOs
3. **Real-time updates**: Long-polling via `WaitForMyWorkflowGenerations` API
4. **Offline support**: IndexedDB caches workflows, generations, artifacts

## Key Configuration Files

### appsettings.json

```json
{
  "AppConfig": {
    "AppName": "ubixar.com",
    "ArtifactsPath": "./App_Data/artifacts",
    "FilesPath": "./App_Data/files",
    "LocalBaseUrl": "https://localhost:5001",
    "PublicBaseUrl": "https://ubixar.com",
    "DefaultConnection": "connection-string",
    "GoogleClientId": "...",
    "GoogleClientSecret": "..."
  }
}
```

### Environment Variables

- `COMFY_DB_CONNECTION` - Override default database connection
- `COMFY_GATEWAY_ARTIFACTS` - Path to artifacts storage
- `AI_FILES_PATH` - Path to file uploads
- `AI_SERVER_API_KEY` - Admin API key
- `BUN_EXE_PATH` - Path to Bun executable

### Docker Compose

The `compose.yml` defines:
- **app**: Main application (port 8080)
- **db**: PostgreSQL database (port 5432)
- Persistent volumes for database and App_Data

## Testing Strategy

### Test Organization

- `UnitTest.cs` - Pure unit tests
- `IntegrationTest.cs` - Tests with database and services
- `ComfyWorkflowParseTests.cs` - Workflow parsing logic
- `ComfyWorkflowExecuteTests.cs` - Workflow execution flows
- `OpenAiChatTests.cs` - AI chat integration

### Test Data

Test workflows stored in `MyApp.Tests/workflows/` directory with real ComfyUI workflow JSON files for validation.

## ServiceStack.Jobs Usage

Background jobs are scheduled and executed via Commands:

```csharp
// Enqueue a one-time job
jobs.EnqueueCommand<ExecuteComfyApiPromptCommand>(request);

// Schedule recurring job
jobs.RecurringCommand<MyCommand>(Schedule.Hourly);
```

Jobs are processed by `JobsHostedService` which ticks every 10 seconds.

## Common Patterns

### Service Implementation

```csharp
public class MyServices : Service
{
    public object Any(MyRequest request)
    {
        // Access database
        using var db = Db;
        var result = db.Select<MyTable>();

        // Return response
        return new MyResponse { Results = result };
    }
}
```

### AutoQuery

Many queries use AutoQuery for automatic CRUD:

```csharp
[Route("/api/workflows")]
public class QueryWorkflows : QueryDb<Workflow> {}
```

This automatically generates:
- Filtering, sorting, pagination
- Response caching
- Multiple serialization formats

### Admin-only Operations

```csharp
[ValidateHasRole(AppRoles.Admin)]
public class AdminRequest : IReturn<AdminResponse> {}
```

## Important Notes

- **DTO Regeneration**: Run `npm run dtos` after modifying `MyApp.ServiceModel/` DTOs
- **Database Migrations**: Migrations live in `Configure.Db.Migrations.cs`, not EF Core Migrations folder
- **AppData Reload**: After admin changes to workflows/artifacts, call `AppData.Instance.Reload(db)`
- **Background Jobs Database**: Separate from main DB, configured in `Configure.BackgroundJobs.cs`
- **Tailwind Builds**: Must run `npm run ui:build` before publishing to generate CSS

## Debugging

### VSCode Launch Configuration

The `.vscode/launch.json` includes:
- **.NET Core Launch (web)**: Debug the application
- **.NET Core Attach**: Attach to running process

### Useful Debugging Endpoints

- `/metadata` - ServiceStack metadata page (all APIs)
- `/ui` - Locode Admin UI
- `/health` - Health check endpoint

## Migration to Next.js

A comprehensive migration plan exists in [MIGRATION_PLAN.md](MIGRATION_PLAN.md). Key points:

- Next.js 16 will be a **pure UI layer** - no backend logic
- All data flows through existing C# ServiceStack APIs
- Static export builds to `./MyApp/wwwroot` for C# hosting
- Maintains TypeScript DTOs and JsonServiceClient pattern
- Preserves IndexedDB caching architecture
