# 🚀 Vue to Next.js 16 Migration Plan
## Ubixar.com UI Rewrite Strategy

---

## 📋 Executive Summary

This plan outlines the complete migration of the ubixar.com Vue 3 SPA into a modern Next.js 16 application while preserving all existing C# ServiceStack backend APIs. The Next.js app will serve as a **pure UI layer** with zero independent data sources.

### Key Architecture Principles:
- ✅ **Single Source of Truth**: All data flows through existing C# ServiceStack APIs
- ✅ **Zero Backend Logic in Next.js**: No database access, no independent APIs
- ✅ **Static Export**: Next.js app builds to `./MyApp/wwwroot` for C# hosting
- ✅ **Typed API Client**: Continue using `JsonServiceClient` with TypeScript DTOs

---

## 🎯 Phase 1: Project Setup & Infrastructure

### 1.1 Create Next.js Project Structure

**Location**: Create new directory `./nextjs-app` at repository root (sibling to `MyApp/`)

**Initial Setup**:
```bash
# Commands to run:
cd /home/user/ubixar.com
npx create-next-app@latest nextjs-app --typescript --tailwind --app --no-src-dir
```

**Configuration Answers**:
- ✅ TypeScript: Yes
- ✅ ESLint: Yes
- ✅ Tailwind CSS: Yes
- ✅ App Router: Yes
- ❌ src/ directory: No
- ✅ Turbopack: Yes (for dev)
- ❌ Import aliases: No (or customize to `@/`)

### 1.2 Configure Next.js for Static Export to wwwroot

**File**: `./nextjs-app/next.config.ts`

**Key Configuration**:
```typescript
// Output to C# wwwroot folder
output: 'export',
distDir: '../MyApp/wwwroot/_next',
images: {
  unoptimized: true, // Required for static export
},
assetPrefix: '/_next',
basePath: '',
trailingSlash: true,
```

**Build Output Structure**:
```
MyApp/wwwroot/
├── _next/           # Next.js build output (JS, CSS chunks)
│   ├── static/
│   └── ...
├── index.html       # Home page
├── generate.html    # Generate page
├── images.html      # Images gallery page
└── ...
```

### 1.3 Update Tailwind CSS v4

**Migration Path**:
1. Install Tailwind v4 (currently in beta/alpha)
2. Migrate from `tailwind.config.js` to `@config` directive
3. Preserve existing color customizations:
   - `accent-1`: #FAFAFA
   - `accent-2`: #EAEAEA
   - `danger`: rgb(153 27 27)
   - `success`: rgb(22 101 52)

**File**: `./nextjs-app/app/globals.css`
```css
@import "tailwindcss";

@theme {
  --color-accent-1: #FAFAFA;
  --color-accent-2: #EAEAEA;
  --color-danger: rgb(153 27 27);
  --color-success: rgb(22 101 52);
}
```

### 1.4 Install Dependencies

**Core Dependencies**:
```json
{
  "@servicestack/client": "^2.1.11",
  "idb": "^8.0.0", // IndexedDB wrapper
  "zustand": "^5.0.0", // State management
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "next": "^16.0.0"
}
```

**Dev Dependencies**:
```json
{
  "typescript": "^5.7.0",
  "tailwindcss": "^4.0.0",
  "@types/react": "^19.0.0",
  "@types/react-dom": "^19.0.0"
}
```

---

## 🎯 Phase 2: ServiceStack API Integration

### 2.1 Copy TypeScript DTOs

**Source**: `./MyApp/wwwroot/mjs/dtos.ts`
**Destination**: `./nextjs-app/lib/dtos.ts`

**Strategy**: Direct copy, maintain auto-generation workflow

**DTOs Include**:
- `QueueWorkflow`, `WaitForMyWorkflowGenerations`
- `QueryWorkflows`, `QueryWorkflowVersions`
- `MyWorkflowGenerations`, `GetWorkflowGeneration`
- `CreateThread`, `UpdateThread`, `DeleteThread`
- `QueryArtifacts`, `PublishGeneration`
- All response types and domain models

### 2.2 Create ServiceStack Client Singleton

**File**: `./nextjs-app/lib/api-client.ts`

**Responsibilities**:
- Initialize `JsonServiceClient` pointing to C# backend
- Configure base URL (development: `https://localhost:5001`, production: same origin)
- Handle authentication session
- Export typed client instance

**Key Features**:
```typescript
import { JsonServiceClient } from '@servicestack/client'

export const apiClient = new JsonServiceClient(
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://localhost:5001')
)

// Example usage in components:
// const response = await apiClient.post(new QueueWorkflow({ ... }))
```

### 2.3 Create API Service Layer

**File**: `./nextjs-app/lib/services/`

**Structure**:
```
lib/services/
├── workflows.ts      # Workflow queries, queue operations
├── generations.ts    # Generation CRUD, publishing
├── threads.ts        # Thread management
├── artifacts.ts      # Artifact queries, reactions
├── auth.ts           # Authentication helpers
├── devices.ts        # Device pool, compatibility checks
└── assets.ts         # Asset queries
```

**Pattern** (Example: `workflows.ts`):
```typescript
import { apiClient } from '../api-client'
import { QueryWorkflows, QueueWorkflow } from '../dtos'

export const workflowService = {
  async query(request: QueryWorkflows) {
    return await apiClient.api(request)
  },

  async queue(request: QueueWorkflow) {
    return await apiClient.post(request)
  },

  // ... more methods
}
```

---

## 🎯 Phase 3: State Management Architecture

### 3.1 Zustand Store Structure

**Replaces**: `./MyApp/wwwroot/pages/lib/store.mjs` (1538 lines of Vue reactive state)

**File**: `./nextjs-app/lib/store/index.ts`

**Store Slices**:
```
lib/store/
├── index.ts              # Main store combining slices
├── slices/
│   ├── user.ts           # User session, preferences
│   ├── workflows.ts      # Workflows, versions, selections
│   ├── generations.ts    # User generations, thread generations
│   ├── threads.ts        # Thread list, selected thread
│   ├── artifacts.ts      # Artifacts, reactions
│   ├── devices.ts        # Device pool, my devices
│   ├── cache.ts          # IndexedDB cache management
│   └── ui.ts             # UI state (modals, loading)
```

**Example Store Pattern**:
```typescript
// lib/store/slices/workflows.ts
interface WorkflowsState {
  workflows: Workflow[]
  workflowVersions: WorkflowVersion[]
  selectedWorkflow: Workflow | null
  loading: boolean
}

interface WorkflowsActions {
  loadWorkflows: () => Promise<void>
  selectWorkflow: (id: number) => void
}

export const createWorkflowsSlice: StateCreator<
  WorkflowsState & WorkflowsActions
> = (set, get) => ({
  workflows: [],
  workflowVersions: [],
  selectedWorkflow: null,
  loading: false,

  loadWorkflows: async () => {
    set({ loading: true })
    const api = await workflowService.query(new QueryWorkflows())
    if (api.succeeded) {
      set({ workflows: api.response.results })
    }
    set({ loading: false })
  },

  selectWorkflow: (id) => {
    const workflow = get().workflows.find(w => w.id === id)
    set({ selectedWorkflow: workflow })
  },
})
```

### 3.2 IndexedDB Cache Layer

**Replaces**: Current Vue IndexedDB implementation in `store.mjs`

**File**: `./nextjs-app/lib/db/index.ts`

**Database Structure**:
```typescript
// Two databases (matching current Vue implementation):
// 1. ComfyApp - Application-wide data
// 2. ComfyUser - User-specific data

interface Database {
  // App Tables
  Workflow: { key: number, value: Workflow }
  WorkflowVersion: { key: number, value: WorkflowVersion }
  Artifact: { key: number, value: Artifact }
  Asset: { key: number, value: Asset }
  DeletedRow: { key: number, value: DeletedRow }
  Cache: { key: string, value: CacheEntry }

  // User Tables (requires authentication)
  WorkflowGeneration: { key: number, value: WorkflowGeneration }
  Thread: { key: number, value: Thread }
  ArtifactReaction: { key: number, value: ArtifactReaction }
  WorkflowVersionReaction: { key: number, value: WorkflowVersionReaction }
}
```

**Key Operations**:
- `openAppDb()` - Open application database
- `openUserDb()` - Open user database (auth required)
- `clearUserDb()` - Clear on user change
- `syncWorkflows()` - Incremental sync with `afterModifiedDate`
- `syncGenerations()` - Incremental sync user generations
- `processDeletedRows()` - Handle server-side deletions

**Sync Strategy**:
1. On app init: Load from IndexedDB (instant UI)
2. In background: Sync with server using `afterModifiedDate` queries
3. Show loading only if IndexedDB is empty
4. Incremental updates: Only fetch modified records

### 3.3 React Query Integration (Optional Enhancement)

**Consider Adding** (not in current Vue app, but beneficial):
```typescript
// Optional: Use React Query for server state management
import { useQuery, useMutation } from '@tanstack/react-query'

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowService.query(new QueryWorkflows()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
```

**Benefits**:
- Automatic background refetching
- Request deduplication
- Optimistic updates
- Better loading/error states

**Decision Point**: Start with Zustand + IndexedDB (matching Vue architecture), optionally add React Query later for server state.

---

## 🎯 Phase 4: Routing & Page Structure

### 4.1 App Router File Structure

**Map Vue Routes to Next.js**:

| Vue Route | Next.js Path | File |
|-----------|-------------|------|
| `/` | `/` | `app/page.tsx` |
| `/generate/:tab?/:id?` | `/generate/[[...params]]` | `app/generate/[[...params]]/page.tsx` |
| `/images/:path?` | `/images/[[...path]]` | `app/images/[[...path]]/page.tsx` |
| `/gallery/:path?` | `/gallery/[[...path]]` | `app/gallery/[[...path]]/page.tsx` |
| `/generations/:id?` | `/generations/[id]` | `app/generations/[id]/page.tsx` |
| `/audio/:path?` | `/audio/[[...path]]` | `app/audio/[[...path]]/page.tsx` |

**App Directory Structure**:
```
app/
├── layout.tsx                 # Root layout with Header
├── page.tsx                   # Home page
├── generate/
│   └── [[...params]]/
│       └── page.tsx           # Generate workflow UI
├── images/
│   └── [[...path]]/
│       └── page.tsx           # Image gallery
├── gallery/
│   └── [[...path]]/
│       └── page.tsx           # Gallery (same as images)
├── generations/
│   └── [id]/
│       └── page.tsx           # Single generation detail
├── audio/
│   └── [[...path]]/
│       └── page.tsx           # Audio generation
└── admin/
    └── page.tsx               # Admin dashboard
```

### 4.2 Root Layout Component

**File**: `app/layout.tsx`

**Replaces**: `./MyApp/wwwroot/mjs/app.mjs` + `VueApp.razor`

**Responsibilities**:
- Render Header component
- Initialize Zustand store
- Setup event bus (if needed)
- Configure authentication
- Load user preferences from localStorage

**Example**:
```typescript
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <StoreProvider>
          <Header />
          <main role="main">
            {children}
          </main>
        </StoreProvider>
      </body>
    </html>
  )
}
```

### 4.3 Page Component Migration Map

**Priority Order**:

1. **Home Page** (`app/page.tsx`)
   - Source: `./MyApp/wwwroot/pages/Home.mjs`
   - Features: Landing page, featured artifacts carousel
   - Data: Featured portrait artifacts, best artifacts

2. **Generate Page** (`app/generate/[[...params]]/page.tsx`)
   - Source: `./MyApp/wwwroot/pages/Generate.mjs` (150+ lines)
   - Features: Workflow selector, prompt inputs, device selector, run button
   - State: Selected workflow, workflow args, thread generations
   - Complex: Real-time generation polling via `WaitForMyWorkflowGenerations`

3. **Images Gallery** (`app/images/[[...path]]/page.tsx`)
   - Source: `./MyApp/wwwroot/pages/Images.mjs`
   - Features: Artifact grid, filtering by ratings, reactions
   - Data: Cached artifacts from IndexedDB, infinite scroll

4. **Generation Detail** (`app/generations/[id]/page.tsx`)
   - Source: `./MyApp/wwwroot/pages/Generation.mjs`
   - Features: Single generation view, asset gallery, publish actions
   - Data: Fetch specific generation, related artifacts

5. **Audio Page** (`app/audio/[[...path]]/page.tsx`)
   - Source: `./MyApp/wwwroot/pages/Audio.mjs`
   - Features: Audio generation UI

6. **Admin Page** (`app/admin/page.tsx`)
   - Source: `./MyApp/wwwroot/pages/Admin.mjs`
   - Features: Device management, workflow administration
   - Auth: Require `isAdmin` role

---

## 🎯 Phase 5: Component Architecture

### 5.1 Shared Component Library

**Location**: `./nextjs-app/components/`

**Structure**:
```
components/
├── ui/                    # Base UI components (shadcn/ui style)
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── modal.tsx
│   ├── dropdown.tsx
│   └── card.tsx
│
├── layout/
│   ├── Header.tsx         # Top navigation
│   ├── Sidebar.tsx        # Left panel (workflows)
│   └── Footer.tsx
│
├── workflow/
│   ├── WorkflowSelector.tsx
│   ├── WorkflowPrompt.tsx
│   ├── WorkflowCard.tsx
│   └── DeviceSelector.tsx
│
├── generation/
│   ├── GenerationCard.tsx
│   ├── GenerationList.tsx
│   ├── GenerationStatus.tsx
│   └── QueuedPopup.tsx
│
├── artifact/
│   ├── ArtifactGrid.tsx
│   ├── ArtifactCard.tsx
│   ├── ArtifactGallery.tsx
│   ├── AssetGallery.tsx
│   └── ReactionButton.tsx
│
├── thread/
│   ├── ThreadList.tsx
│   ├── ThreadCard.tsx
│   ├── RecentThreads.tsx
│   └── ThreadSelector.tsx
│
└── device/
    ├── DeviceCard.tsx
    ├── DeviceList.tsx
    └── DeviceCompatibility.tsx
```

### 5.2 Key Component Migrations

#### Header Component

**Source**: `./MyApp/wwwroot/pages/components/Header.mjs`
**Destination**: `components/layout/Header.tsx`

**Features**:
- User avatar dropdown
- Navigation links
- Notifications badge
- Credits display
- Sign in/out

**Data Dependencies**:
- `store.user` - Current user session
- `store.info` - User info (credits, achievements)
- Authentication state

#### WorkflowSelector

**Source**: `./MyApp/wwwroot/pages/components/WorkflowSelector.mjs`
**Destination**: `components/workflow/WorkflowSelector.tsx`

**Features**:
- Grid of workflow cards
- Category filtering
- Search/filter
- Click to select workflow

**Props**:
```typescript
interface WorkflowSelectorProps {
  workflows: Workflow[]
  selectedWorkflow: Workflow | null
  onSelect: (workflow: Workflow) => void
}
```

#### WorkflowPrompt

**Source**: `./MyApp/wwwroot/pages/components/WorkflowPrompt.mjs`
**Destination**: `components/workflow/WorkflowPrompt.tsx`

**Features**:
- Dynamic form based on `workflow.info.inputFields`
- Positive/negative prompt text areas
- Width/height/steps/seed inputs
- Model selectors (checkpoint, lora, vae)
- Aspect ratio presets

**State**:
```typescript
interface WorkflowArgs {
  positivePrompt: string
  negativePrompt?: string
  width: number
  height: number
  steps: number
  cfg: number
  seed?: number
  checkpoint: string
  lora?: string[]
  // ... dynamic fields from workflow.info.inputFields
}
```

#### AssetGallery

**Source**: `./MyApp/wwwroot/pages/components/AssetGallery.mjs`
**Destination**: `components/artifact/AssetGallery.tsx`

**Features**:
- Image grid with masonry layout
- Lightbox on click
- Rating filters (PG, PG-13, R, X)
- Reaction buttons (❤️, 👍, 🔥)
- Pin as poster action

**Image Optimization**:
- Use Next.js `<Image>` component with `unoptimized: true` (static export)
- Lazy loading with intersection observer
- Variant URLs for different sizes:
  - Small: 118x207
  - Medium: 288x504
  - Large: Original

### 5.3 Reusable Hooks

**Location**: `./nextjs-app/hooks/`

**Custom Hooks**:
```typescript
// hooks/useStore.ts
export function useStore() {
  return useStoreBase()
}

// hooks/useAuth.ts
export function useAuth() {
  const user = useStore(state => state.user)
  const isAuthenticated = !!user
  const isAdmin = user?.roles?.includes('Admin')
  return { user, isAuthenticated, isAdmin }
}

// hooks/useWorkflows.ts
export function useWorkflows() {
  const workflows = useStore(state => state.workflows)
  const loadWorkflows = useStore(state => state.loadWorkflows)

  useEffect(() => {
    loadWorkflows()
  }, [])

  return { workflows }
}

// hooks/useGenerationPolling.ts
export function useGenerationPolling(threadId?: number) {
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    if (!threadId) return

    const poll = async () => {
      const afterModifiedDate = await getLastModified('WorkflowGeneration')
      const api = await apiClient.api(
        new WaitForMyWorkflowGenerations({ afterModifiedDate, threadId })
      )

      if (api.response?.results?.length) {
        // Update store with new generations
        useStore.getState().addGenerations(api.response.results)
      }
    }

    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [threadId])

  return { polling }
}

// hooks/useLocalStorage.ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Sync state with localStorage
}
```

---

## 🎯 Phase 6: Authentication & Session Management

### 6.1 Authentication Flow

**Current System**:
- ASP.NET Core Identity with custom `ApplicationUser`
- OAuth providers: Google, Facebook
- Credentials (username/password)
- Session stored in HTTP cookies + localStorage

**Next.js Integration**:

**File**: `./nextjs-app/lib/auth/index.ts`

**Responsibilities**:
- Check authentication status from ServiceStack session
- Store user in Zustand
- Sync with localStorage for offline access
- Handle sign-in redirect
- Handle sign-out

**Pattern**:
```typescript
export async function checkAuth() {
  try {
    const api = await apiClient.api(new Authenticate())
    if (api.succeeded) {
      useStore.getState().setUser(api.response.user)
      localStorage.setItem('gateway:user', JSON.stringify(api.response.user))
      return api.response.user
    }
  } catch {
    useStore.getState().setUser(null)
    localStorage.removeItem('gateway:user')
  }
  return null
}

export function signIn() {
  window.location.href = '/Account/Login?returnUrl=' +
    encodeURIComponent(window.location.pathname)
}

export function signOut() {
  window.location.href = '/Account/Logout'
}
```

### 6.2 Protected Routes

**Middleware**: `./nextjs-app/middleware.ts`

**Strategy**: Client-side auth checks (static export doesn't support middleware)

**Pattern**:
```typescript
// In page components
export default function GeneratePage() {
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/Account/Login?returnUrl=/generate'
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <div>Redirecting to login...</div>
  }

  return <GeneratePageContent />
}
```

### 6.3 User Preferences & Settings

**Storage**: localStorage with Zustand persistence

**Keys** (match current Vue implementation):
- `gateway:{username}:prefs` - User preferences
- `gateway:{username}:workflow` - Last workflow args
- `gateway:{username}:ratings` - Selected rating filters
- `gateway:{username}:cursors` - Sync cursors

**Preferences Structure**:
```typescript
interface UserPreferences {
  isOver18: boolean
  sortBy: string
  ratings: Rating[]
  lastReadNotificationId?: number
  lastReadAchievementId?: number
}
```

---

## 🎯 Phase 7: Real-Time Features & Polling

### 7.1 Generation Status Polling

**Current Implementation**: `WaitForMyWorkflowGenerations` API (long-polling)

**Next.js Pattern**:
```typescript
// hooks/useGenerationPolling.ts
export function useGenerationPolling(enabled: boolean, threadId?: number) {
  const addGenerations = useStore(state => state.addGenerations)

  useEffect(() => {
    if (!enabled) return

    let active = true

    const poll = async () => {
      while (active) {
        try {
          const afterModifiedDate = await getLastModified('WorkflowGeneration')
          const api = await apiClient.api(
            new WaitForMyWorkflowGenerations({
              afterModifiedDate,
              threadId,
            })
          )

          if (api.response?.results?.length) {
            addGenerations(api.response.results)
          }
        } catch (error) {
          console.error('Polling error:', error)
          await sleep(5000) // Retry after 5s on error
        }
      }
    }

    poll()

    return () => {
      active = false
    }
  }, [enabled, threadId])
}
```

**Usage**:
```typescript
// In Generate page
const { selectedThread } = useStore()
useGenerationPolling(true, selectedThread?.id)
```

### 7.2 Event Bus (Optional)

**Current**: Vue EventBus for global events

**Next.js Alternative**: Zustand + React Context

**Events to Handle**:
- `closeWindow` - Close modals
- `status` - Show toast notifications
- Publishing events between components

**Pattern**:
```typescript
// lib/store/slices/events.ts
interface EventsState {
  events: Map<string, Function[]>
}

interface EventsActions {
  publish: (event: string, data?: any) => void
  subscribe: (event: string, callback: Function) => () => void
}

// Usage in components
const publish = useStore(state => state.publish)

useEffect(() => {
  const unsubscribe = useStore.getState().subscribe('status', (message) => {
    toast(message)
  })
  return unsubscribe
}, [])
```

---

## 🎯 Phase 8: Asset Management & CDN

### 8.1 Image URLs & Variants

**Current System**:
- Assets served from `appConfig.assetsBaseUrl` or fallback
- Variants generated at different sizes:
  - `/variants/width={size}/{path}`
  - `/variants/height={size}/{path}`

**Next.js Pattern**:
```typescript
// lib/utils/assets.ts
export function getAssetUrl(artifact: Artifact, size?: 'small' | 'medium' | 'large') {
  const baseUrl = appConfig.assetsBaseUrl || window.location.origin

  if (!size) {
    return combinePaths(baseUrl, artifact.filePath)
  }

  const variantPath = getVariantPath(artifact, size)
  return combinePaths(baseUrl, variantPath)
}

function getVariantPath(artifact: Artifact, size: string) {
  const dimensions = {
    small: { width: 118, height: 207 },
    medium: { width: 288, height: 504 },
    large: { width: 1024, height: 1024 },
  }[size]

  const path = rightPart(artifact.filePath, '/artifacts')

  if (artifact.height > artifact.width) {
    return `/variants/height=${dimensions.height}${path}`
  }
  if (artifact.width > artifact.height) {
    return `/variants/width=${dimensions.width}${path}`
  }
  return `/variants/width=${dimensions.width}${path}`
}
```

### 8.2 Image Component

**File**: `components/ui/OptimizedImage.tsx`

**Features**:
- Lazy loading
- Error fallback to placeholder
- Multiple variants for responsive images
- `onError` handler to remove broken artifacts

**Example**:
```typescript
export function OptimizedImage({
  artifact,
  size = 'medium',
  className,
  onClick,
}: OptimizedImageProps) {
  const [error, setError] = useState(false)
  const removeArtifact = useStore(state => state.removeArtifact)

  const handleError = () => {
    setError(true)
    removeArtifact(artifact.id)
  }

  if (error) {
    return <PlaceholderImage />
  }

  return (
    <img
      src={getAssetUrl(artifact, size)}
      alt=""
      loading="lazy"
      className={className}
      onClick={onClick}
      onError={handleError}
    />
  )
}
```

---

## 🎯 Phase 9: Build & Deployment Configuration

### 9.1 Next.js Build Process

**Goal**: Export static HTML/CSS/JS to `./MyApp/wwwroot`

**Build Command**:
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "export": "next build && next export"
  }
}
```

**Post-Build Script** (copy to wwwroot):
```bash
#!/bin/bash
# scripts/deploy-to-wwwroot.sh

# Build Next.js app
cd nextjs-app
npm run build

# Copy output to wwwroot
rm -rf ../MyApp/wwwroot/_next
cp -r out/_next ../MyApp/wwwroot/_next
cp out/*.html ../MyApp/wwwroot/

echo "✅ Next.js build deployed to MyApp/wwwroot"
```

### 9.2 C# Static File Configuration

**Ensure** `Program.cs` serves Next.js files:

**File**: `./MyApp/Program.cs`

**Add**:
```csharp
app.UseDefaultFiles(); // Serve index.html for /
app.UseStaticFiles();  // Serve wwwroot files
```

**Verify**: Files in `wwwroot/_next/` are served at `/_next/*`

### 9.3 Development Workflow

**Two Dev Servers**:

1. **Next.js Dev Server** (Port 3000):
   ```bash
   cd nextjs-app
   npm run dev
   ```
   - Hot module reloading
   - Turbopack for fast builds
   - Proxy API calls to C# server

2. **C# Dev Server** (Port 5001):
   ```bash
   cd MyApp
   dotnet watch
   ```
   - ServiceStack APIs
   - Authentication
   - Database access

**Next.js Proxy Config**:
```typescript
// next.config.ts
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'https://localhost:5001/api/:path*',
    },
    {
      source: '/auth/:path*',
      destination: 'https://localhost:5001/auth/:path*',
    },
  ]
}
```

### 9.4 Update Package.json Scripts

**File**: `./MyApp/package.json`

**Add Next.js scripts**:
```json
{
  "scripts": {
    "dtos": "x mjs",
    "dev": "dotnet watch",
    "dev:next": "cd ../nextjs-app && npm run dev",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:next\"",
    "build:next": "cd ../nextjs-app && npm run build",
    "build": "npm run build:next && npm run ui:build",
    "deploy": "npm run build && bash scripts/deploy-to-wwwroot.sh"
  }
}
```

### 9.5 .gitignore Updates

**Add to** `.gitignore`:
```
# Next.js
nextjs-app/.next/
nextjs-app/out/
nextjs-app/node_modules/

# Next.js output in wwwroot
MyApp/wwwroot/_next/
MyApp/wwwroot/*.html
!MyApp/wwwroot/lib/
```

---

## 🎯 Phase 10: Testing Strategy

### 10.1 API Integration Tests

**File**: `./nextjs-app/__tests__/api/`

**Test ServiceStack Client**:
```typescript
describe('WorkflowService', () => {
  it('should query workflows', async () => {
    const api = await workflowService.query(new QueryWorkflows())
    expect(api.succeeded).toBe(true)
    expect(api.response.results).toBeInstanceOf(Array)
  })

  it('should handle errors', async () => {
    const api = await workflowService.queue(new QueueWorkflow({}))
    expect(api.failed).toBe(true)
    expect(api.error).toBeDefined()
  })
})
```

### 10.2 Component Tests

**Framework**: Jest + React Testing Library

**Example**:
```typescript
describe('WorkflowSelector', () => {
  it('renders workflow cards', () => {
    const workflows = [mockWorkflow1, mockWorkflow2]
    render(<WorkflowSelector workflows={workflows} onSelect={jest.fn()} />)

    expect(screen.getByText(mockWorkflow1.name)).toBeInTheDocument()
    expect(screen.getByText(mockWorkflow2.name)).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn()
    render(<WorkflowSelector workflows={[mockWorkflow1]} onSelect={onSelect} />)

    fireEvent.click(screen.getByText(mockWorkflow1.name))
    expect(onSelect).toHaveBeenCalledWith(mockWorkflow1)
  })
})
```

### 10.3 E2E Tests (Optional)

**Framework**: Playwright

**Critical User Flows**:
1. Sign in → Select workflow → Run generation → View result
2. Browse gallery → React to artifact → View in lightbox
3. Create thread → Generate in thread → Publish generation

---

## 🎯 Phase 11: Migration Execution Plan

### 11.1 Incremental Migration Strategy

**Do NOT rewrite everything at once**. Migrate page by page.

**Recommended Order**:

#### Week 1-2: Foundation
- ✅ Setup Next.js project
- ✅ Configure Tailwind v4
- ✅ Copy DTOs
- ✅ Setup ServiceStack client
- ✅ Create Zustand store structure
- ✅ Implement IndexedDB layer
- ✅ Build base UI components

#### Week 3-4: Core Pages
- ✅ Migrate Home page
- ✅ Migrate Header component
- ✅ Migrate Images gallery page
- ✅ Test static export to wwwroot

#### Week 5-6: Complex Pages
- ✅ Migrate Generate page (most complex)
- ✅ Implement WorkflowSelector
- ✅ Implement WorkflowPrompt
- ✅ Implement generation polling
- ✅ Test queue workflow → polling → display result

#### Week 7-8: Remaining Pages
- ✅ Migrate Generation detail page
- ✅ Migrate Audio page
- ✅ Migrate Admin page

#### Week 9: Polish & Testing
- ✅ E2E testing
- ✅ Performance optimization
- ✅ Error handling
- ✅ Loading states
- ✅ Accessibility

#### Week 10: Production Deployment
- ✅ Final build
- ✅ Deploy to staging
- ✅ User acceptance testing
- ✅ Deploy to production

### 11.2 Parallel Development Option

**Run both UIs simultaneously**:

**Strategy**: Route traffic based on path prefix

**C# Routing**:
```csharp
// Serve Next.js app at /next/*
app.MapWhen(
  ctx => ctx.Request.Path.StartsWithSegments("/next"),
  nextApp => {
    nextApp.UseStaticFiles(new StaticFileOptions {
      FileProvider = new PhysicalFileProvider(
        Path.Combine(env.ContentRootPath, "wwwroot/_next")
      ),
      RequestPath = "/next/_next"
    });
  }
);

// Serve Vue app at /* (existing)
app.UseDefaultFiles();
app.UseStaticFiles();
```

**Benefits**:
- Migrate page by page
- A/B test new UI
- Gradual rollout
- Easy rollback

### 11.3 Feature Parity Checklist

**Before Production Launch**:

**Core Features**:
- [ ] Authentication (sign in, sign out, OAuth)
- [ ] Workflow selection
- [ ] Workflow prompt form with dynamic fields
- [ ] Device compatibility checking
- [ ] Queue workflow
- [ ] Real-time generation polling
- [ ] Generation gallery
- [ ] Thread management
- [ ] Asset reactions (❤️, 👍, 🔥)
- [ ] Publish generation
- [ ] Rating filters (PG, PG-13, R, X)
- [ ] Credits display
- [ ] Daily bonus claim

**Admin Features**:
- [ ] Device management
- [ ] Workflow version management
- [ ] Feature/unfeature artifacts

**Data Integrity**:
- [ ] IndexedDB sync with server
- [ ] Incremental updates (afterModifiedDate)
- [ ] Deleted row processing
- [ ] User preference persistence

**Performance**:
- [ ] Initial load < 3s
- [ ] Image lazy loading
- [ ] IndexedDB caching working
- [ ] No memory leaks in polling

---

## 🎯 Phase 12: Advanced Features & Optimizations

### 12.1 Progressive Enhancement

**Offline Support**:
- IndexedDB cache allows browsing while offline
- Show "offline" banner
- Queue actions for sync when online

**Service Worker** (optional):
```typescript
// public/sw.js
self.addEventListener('fetch', (event) => {
  // Cache API responses
  // Serve from cache when offline
})
```

### 12.2 Performance Optimizations

**Code Splitting**:
- Lazy load heavy components
- Dynamic imports for routes

**Bundle Analysis**:
```bash
npm run build
npx @next/bundle-analyzer
```

**Optimize**:
- Remove unused Tailwind classes
- Minimize JavaScript bundle
- Optimize images (WebP format)

### 12.3 Accessibility

**WCAG 2.1 AA Compliance**:
- Semantic HTML
- ARIA labels on interactive elements
- Keyboard navigation
- Focus management
- Color contrast ratios

**Example**:
```typescript
<button
  type="button"
  onClick={handleClick}
  aria-label="Run workflow"
  aria-describedby="workflow-description"
>
  Run
</button>
```

### 12.4 SEO (if applicable)

**Static Metadata**:
```typescript
// app/layout.tsx
export const metadata = {
  title: 'Ubixar - AI Workflow Platform',
  description: 'Generate images and audio with AI workflows',
}
```

**Dynamic Metadata**:
```typescript
// app/generations/[id]/page.tsx
export async function generateMetadata({ params }) {
  const generation = await fetchGeneration(params.id)
  return {
    title: `Generation ${params.id}`,
    openGraph: {
      images: [generation.posterImage],
    },
  }
}
```

---

## 🎯 Phase 13: Documentation

### 13.1 Developer Documentation

**Create**: `./nextjs-app/README.md`

**Include**:
- Project structure
- How to run locally
- How to build & deploy
- API client usage
- State management guide
- Component library
- Contributing guidelines

### 13.2 Component Documentation

**Tool**: Storybook (optional)

**Benefits**:
- Visual component explorer
- Props documentation
- Interactive examples

### 13.3 API Migration Guide

**For Future Developers**:

**Document**:
- How to add new API calls
- How to regenerate DTOs (`x mjs`)
- How to handle authentication
- How to add new endpoints

**Example**:
```markdown
## Adding a New API Call

1. Add DTO to C# ServiceModel
2. Regenerate TypeScript DTOs: `npm run dtos`
3. Create service method in `lib/services/`
4. Add to Zustand store if needed
5. Use in React component
```

---

## 🎯 Phase 14: Risk Mitigation

### 14.1 Potential Challenges

**Challenge 1**: Static export limitations
- **Issue**: Next.js static export doesn't support server-side features
- **Solution**: All dynamic features use client-side API calls (already planned)

**Challenge 2**: IndexedDB complexity
- **Issue**: Managing 8+ tables, sync logic, user transitions
- **Solution**: Port existing Vue logic 1:1, proven architecture

**Challenge 3**: Real-time polling
- **Issue**: Long-running poll requests, error handling
- **Solution**: Reuse `WaitForMyWorkflowGenerations` pattern, add retry logic

**Challenge 4**: Authentication
- **Issue**: Sessions managed by C# backend, cookie-based
- **Solution**: Check auth on client load, redirect to C# login page

**Challenge 5**: Bundle size
- **Issue**: React 19 + Next.js 16 may be large
- **Solution**: Code splitting, lazy loading, tree shaking

### 14.2 Rollback Plan

**If migration fails**:

1. **Keep Vue app** in `wwwroot/` during migration
2. **Deploy Next.js** to `/next/*` path first (parallel)
3. **Test thoroughly** before replacing Vue
4. **Git branch strategy**: Feature branch until production-ready
5. **Rollback**: Revert to Vue by restoring `wwwroot/` from git

---

## 🎯 Summary: Key Technical Decisions

### ✅ Confirmed Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Next.js 16 App Router** | Modern, best practices, React 19 support |
| **Static Export** | Compatible with C# static file serving |
| **Zustand** | Lightweight, similar to Vue reactive() |
| **IndexedDB** | Port existing caching strategy |
| **JsonServiceClient** | Continue using ServiceStack client |
| **Tailwind v4** | Latest version, improved DX |
| **TypeScript** | Type safety with DTOs |
| **Output to wwwroot** | C# serves Next.js build |

### ❌ What We're NOT Doing

- ❌ Creating new backend APIs in Next.js
- ❌ Direct database access from Next.js
- ❌ Server-side rendering (using static export)
- ❌ GraphQL layer
- ❌ Replacing ServiceStack authentication
- ❌ Node.js server deployment

### 🎨 Visual Design Philosophy

**Maintain**:
- Dark theme (current design)
- Tailwind utility classes
- Responsive grid layouts
- Existing color scheme

**Enhance**:
- Smoother animations
- Better loading states
- Modern glassmorphism effects
- Improved accessibility

---

## 📊 Success Metrics

**Before Launch**:
- [ ] 100% feature parity with Vue app
- [ ] All E2E tests passing
- [ ] Page load time < 3s
- [ ] Lighthouse score > 90
- [ ] Zero TypeScript errors
- [ ] All API calls working

**Post-Launch**:
- Monitor error rates
- Track page load times
- User feedback
- Bug reports

---

## 🚀 Next Steps

1. **Review this plan** with team
2. **Create GitHub project board** with tasks
3. **Setup development environment**
4. **Begin Phase 1: Project Setup**
5. **Weekly progress reviews**

---

## 📝 Appendix: File Structure Reference

**Final Repository Structure**:
```
ubixar.com/
├── MyApp/                     # C# Backend
│   ├── wwwroot/
│   │   ├── _next/            # Next.js build output (gitignored)
│   │   ├── *.html            # Next.js pages (gitignored)
│   │   ├── lib/              # Keep existing JS libs
│   │   └── css/              # Tailwind output
│   ├── Program.cs
│   ├── Configure.AppHost.cs
│   └── ...
│
├── MyApp.ServiceModel/        # C# DTOs
├── MyApp.ServiceInterface/    # C# Services
│
├── nextjs-app/                # Next.js App (NEW)
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── generate/
│   │   ├── images/
│   │   └── ...
│   ├── components/
│   ├── lib/
│   │   ├── dtos.ts           # Copied from MyApp/wwwroot/mjs/dtos.ts
│   │   ├── api-client.ts
│   │   ├── store/
│   │   ├── db/
│   │   └── services/
│   ├── hooks/
│   ├── public/
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── package.json
│   └── tsconfig.json
│
└── scripts/
    └── deploy-to-wwwroot.sh
```

---

**End of Migration Plan**

This plan provides a complete roadmap for rewriting the Vue UI to Next.js 16 while preserving all existing C# ServiceStack backend APIs. The migration maintains the current architecture's strengths (IndexedDB caching, type-safe API calls, incremental sync) while upgrading to modern React 19 and Next.js 16 technologies.
