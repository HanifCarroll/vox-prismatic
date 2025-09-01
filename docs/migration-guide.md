# Project-Centric Architecture Migration Guide
## From NestJS/React to ASP.NET Core/Angular

### Overview
This guide coordinates a parallel migration using two Claude Code instances while preventing incomplete implementations through atomic tasks and verification checkpoints.

## Pre-Migration Setup (Both Instances)

### Instance Coordination Strategy
1. **Backend Instance (ASP.NET Core)**
   - Owns API contracts and database schema
   - Generates OpenAPI spec for frontend consumption
   - Must complete endpoints before frontend integration

2. **Frontend Instance (Angular)**
   - Consumes API contracts via OpenAPI
   - Works with mock data until backend ready
   - Builds components in isolation first

### Preventing AI Fatigue - Critical Rules

#### Rule 1: Atomic Task Principle
- Each task must be completable in a single session
- No task should require more than 3 files to be modified
- If a task seems large, break it down further

#### Rule 2: No Stubbing Policy
When giving instructions to Claude:
- Say: "Fully implement this method with complete logic, no TODOs or stubs"
- Say: "If you start to stub, stop and tell me the task is too large"
- Say: "Complete one method entirely before moving to the next"

#### Rule 3: Verification First
After each implementation:
- Ask: "Show me the complete implementation of [specific method]"
- Ask: "List any TODOs, stubs, or incomplete sections"
- Don't proceed until verification passes

---

## Phase 0: Contract Definition (Day 1)
**Goal**: Define the complete API contract that both instances will follow

### Backend Instance Tasks
1. **Create API Contract Document**
   - List every endpoint from current NestJS API
   - Document request/response shapes for each
   - Include SSE event contracts
   - Save as `/docs/api-contract.md`

2. **Extract Type Definitions**
   - Copy all enums from `packages/types/src/enums.ts`
   - Copy all DTOs from NestJS controllers
   - Create type mapping document: TypeScript → C#
   - Save as `/docs/type-mappings.md`

### Frontend Instance Tasks
1. **Create Component Inventory**
   - List every React component that needs migration
   - Group by feature area (projects, insights, posts)
   - Note component dependencies
   - Save as `/docs/component-inventory.md`

2. **Map State Management**
   - Document all Zustand stores and their shapes
   - List all TanStack Query hooks and their endpoints
   - Create state migration plan
   - Save as `/docs/state-mapping.md`

### Coordination Checkpoint
- Share contract documents between instances
- Both instances commit to the same API contract
- No proceeding until both agree on contracts

---

## Phase 1: Backend Foundation (Days 2-4)
**Goal**: Minimal viable API with database connection

### Task 1.1: Project Setup
**Definition of Done**: Can run `dotnet run` and see Swagger UI
- Create new ASP.NET Core 8 Web API project
- Add necessary NuGet packages (list them explicitly)
- Configure program.cs with services
- Set up Swagger/OpenAPI
- Configure CORS for localhost:4200
- **Verify**: Navigate to /swagger and see UI

### Task 1.2: Database Connection
**Definition of Done**: Can query existing PostgreSQL database
- Install Entity Framework Core packages
- Create DbContext with connection string
- Create entity classes matching Prisma schema exactly
- Do NOT run migrations (use existing database)
- Create one test endpoint that returns transcript count
- **Verify**: Endpoint returns correct count from existing data

### Task 1.3: Core Models (Complete Implementation)
**Instruction to Claude**: "Create the Transcript entity with ALL properties from the Prisma schema. No placeholder properties."
- Transcript entity with all fields
- Insight entity with all fields
- Post entity with all fields
- ProcessingJob entity with all fields
- Pipeline entity with all fields
- **Verify**: Each entity has every field from schema.prisma

### Task 1.4: Repository Pattern
**Definition of Done**: Can perform CRUD on each entity
- Create IRepository<T> interface
- Create BaseRepository<T> implementation
- Create specific repositories for each entity
- Include relationship loading (Include/ThenInclude)
- **Verify**: Write test endpoint that creates and retrieves a transcript with insights

### Checkpoint: Backend Foundation
- All entities fully mapped
- Database connection working
- Can perform all CRUD operations
- Share entity shapes with Frontend Instance

---

## Phase 2: Frontend Foundation (Days 2-4, Parallel)
**Goal**: Angular app with routing and layout

### Task 2.1: Angular Setup
**Definition of Done**: Can run `ng serve` and see welcome page
- Create new Angular 18 application
- Add Tailwind CSS configuration
- Add Angular Material/CDK
- Configure proxy for API (port 5000)
- Set up environment files
- **Verify**: See styled page at localhost:4200

### Task 2.2: Core Layout
**Definition of Done**: Navigation works between all routes
- Create shell component with sidebar
- Implement routing module with all routes
- Create placeholder components for each route
- Add navigation menu matching new architecture
- **Verify**: Can click through all menu items

### Task 2.3: Service Architecture
**Instruction to Claude**: "Create complete API service with all methods, no stubs"
- Create base API service with HTTP client
- Add interceptor for authentication
- Create typed service for each entity
- Include error handling
- **Verify**: Services compile with full type safety

### Task 2.4: State Management Foundation
**Definition of Done**: Can dispatch actions and see state changes
- Set up RxJS-based state service
- Create project state service
- Create notification service
- Add devtools for debugging
- **Verify**: Can see state in Redux devtools

---

## Phase 3: Project List Implementation (Days 5-7)

### Backend Tasks (Complete These First)

#### Task 3.1: Project Controller - List Endpoint
**Instruction to Claude**: "Implement GetProjects completely with all filtering, sorting, and pagination logic from the NestJS version"
- GET /api/projects endpoint
- Include all query parameters (stage, sort, page, limit)
- Load aggregate counts (insights, posts)
- Return same shape as TypeScript version
- **Verify**: Returns projects with correct counts

#### Task 3.2: Project Controller - Get Single
**Definition of Done**: Returns complete project with all relationships
- GET /api/projects/{id} endpoint
- Include transcript, insights, posts
- Calculate progress percentage
- Return pipeline stage
- **Verify**: Response matches TypeScript shape exactly

#### Task 3.3: Project Controller - Create
**Definition of Done**: Can create project and trigger processing
- POST /api/projects endpoint
- Accept file upload or URL
- Create project and transcript records
- Queue processing job (Redis integration)
- Return created project
- **Verify**: Project appears in database with transcript

### Frontend Tasks (After Backend Ready)

#### Task 3.4: Project List Component
**Instruction to Claude**: "Create complete ProjectListComponent with all features, no TODO comments"
- Projects grid/list view component
- Project card with all status indicators
- Filtering by stage
- Sorting options
- Real data from API
- **Verify**: Shows real projects from database

#### Task 3.5: Project State Integration
**Definition of Done**: State updates reflected in UI immediately
- Connect list component to state service
- Add loading and error states
- Implement refresh functionality
- Add optimistic updates
- **Verify**: Create project shows immediately in list

### Coordination Checkpoint
- Frontend can display all projects
- Backend serves complete project data
- Filtering and sorting work end-to-end

---

## Phase 4: Project Detail Implementation (Days 8-10)

### Backend Tasks

#### Task 4.1: Insights Endpoints
**Instruction to Claude**: "Implement all insight endpoints with complete business logic"
- GET /api/projects/{id}/insights
- PATCH /api/projects/{id}/insights/{insightId}
- POST /api/projects/{id}/insights/bulk-approve
- Include score calculation
- **Verify**: Can approve/reject insights

#### Task 4.2: Posts Endpoints
**Definition of Done**: All CRUD operations work
- GET /api/projects/{id}/posts
- PATCH /api/projects/{id}/posts/{postId}
- POST /api/projects/{id}/posts/generate
- POST /api/projects/{id}/posts/schedule
- **Verify**: Can edit and schedule posts

#### Task 4.3: Pipeline State Management
**Definition of Done**: Pipeline progresses through stages
- Create pipeline state service
- Update pipeline stage based on actions
- Calculate progress percentages
- Emit SSE events on changes
- **Verify**: Stage changes reflected in database

### Frontend Tasks

#### Task 4.4: Project Detail Component
**Instruction to Claude**: "Create complete detail view with all sections, fully implemented"
- Project header with pipeline visualization
- Insights section with cards
- Posts section with platform tabs
- Activity timeline
- No placeholder content
- **Verify**: All sections show real data

#### Task 4.5: Interactive Features
**Definition of Done**: All interactions work
- Approve/reject insights
- Edit post content
- Drag to reorder
- Bulk operations
- **Verify**: Changes persist to backend

---

## Phase 5: Real-time Updates & SSE (Days 11-12)

### Backend Tasks

#### Task 5.1: SSE Implementation
**Instruction to Claude**: "Implement complete SSE with all event types, no stubs"
- Create SSE controller
- Implement event streaming
- Add connection management
- Send typed events
- **Verify**: Can connect and receive events

#### Task 5.2: Event Broadcasting
**Definition of Done**: All state changes broadcast events
- Emit events on pipeline updates
- Emit events on processing progress
- Emit events on approval actions
- Include event payloads
- **Verify**: Frontend receives all events

### Frontend Tasks

#### Task 5.3: SSE Client Service
**Definition of Done**: Maintains persistent connection
- Create SSE service
- Handle reconnection
- Parse typed events
- Update state from events
- **Verify**: See real-time updates in UI

#### Task 5.4: Live Updates Integration
- Update project list on events
- Update detail view on events
- Show processing progress
- Add notification toasts
- **Verify**: Changes from other tabs appear immediately

---

## Phase 6: Processing Pipeline Integration (Days 13-14)

### Backend Tasks

#### Task 6.1: Queue Communication
**Instruction to Claude**: "Implement complete Redis/BullMQ integration, all methods fully implemented"
- Add StackExchange.Redis package
- Create queue service
- Publish jobs to existing queues
- Read job status from Redis
- **Verify**: Worker processes jobs from .NET API

#### Task 6.2: Processing Endpoints
**Definition of Done**: Can trigger all processing steps
- POST /api/projects/{id}/process
- POST /api/projects/{id}/extract-insights  
- POST /api/projects/{id}/generate-posts
- Monitor job progress
- **Verify**: Each endpoint triggers worker job

### Frontend Tasks

#### Task 6.3: Processing UI
- Add processing triggers to UI
- Show progress indicators
- Display processing errors
- Allow retry on failure
- **Verify**: Can process project end-to-end

---

## Phase 7: Authentication & User Context (Days 15-16)

### Backend Tasks

#### Task 7.1: Authentication Setup
**Definition of Done**: Can login and maintain session
- Add ASP.NET Core Identity
- Configure JWT tokens
- Create auth controller
- Add authorization attributes
- **Verify**: Protected endpoints require token

#### Task 7.2: OAuth Integration
- Implement LinkedIn OAuth flow
- Implement X/Twitter OAuth flow
- Store tokens securely
- Add token refresh logic
- **Verify**: Can authenticate with social platforms

### Frontend Tasks

#### Task 7.3: Auth Guards & Interceptors
- Create auth guard for routes
- Add token interceptor
- Create login component
- Handle token refresh
- **Verify**: Redirects to login when unauthorized

---

## Phase 8: Testing & Verification (Days 17-18)

### Parallel Verification Tasks

#### Backend Verification Checklist
Run through each item with Claude:
1. "Show me all controller endpoints - are any stubbed?"
2. "Show me all service methods - are any throwing NotImplementedException?"
3. "Search for all TODO comments in the codebase"
4. "List all repository methods - are queries fully implemented?"
5. "Check all AutoMapper profiles - are all properties mapped?"

#### Frontend Verification Checklist
Run through each item with Claude:
1. "Show me all components - are any using placeholder data?"
2. "Show me all services - are any methods returning mock data?"
3. "Search for all TODO and FIXME comments"
4. "List all API calls - are any still pointing to old endpoints?"
5. "Check all event handlers - are they fully implemented?"

#### Integration Testing
1. Create new project from file upload
2. Watch it process through pipeline
3. Review and approve insights
4. Generate and edit posts
5. Schedule posts
6. Verify in database

---

## Phase 9: Migration Cutover (Day 19)

### Pre-Cutover Checklist
- [ ] All endpoints migrated and tested
- [ ] All UI components functional
- [ ] Worker still processing jobs
- [ ] Desktop app connects to new API
- [ ] No TODO comments in code
- [ ] No stubbed methods
- [ ] All tests passing

### Cutover Steps
1. Stop old NestJS API
2. Update desktop app API URL
3. Update worker API URL
4. Start new ASP.NET Core API
5. Verify all integrations working
6. Monitor for 24 hours

---

## Anti-Patterns to Avoid

### When Claude Starts Stubbing
**Warning Signs**:
- Methods with just `throw new NotImplementedException()`
- Comments like "// TODO: Implement later"
- Service methods returning hardcoded data
- Controllers with placeholder responses

**Immediate Response**:
1. Stop and say: "You're starting to stub. Let's break this down."
2. Ask: "What's the smallest complete piece we can implement?"
3. Focus on one method at a time
4. Verify completion before moving on

### Coordination Issues
**Warning Signs**:
- Frontend assuming endpoints that don't exist
- Backend changing contracts without updating frontend
- Type mismatches between systems

**Prevention**:
1. Always update contract document first
2. Share changes between instances immediately
3. Test integration points frequently

---

## Success Metrics

### Daily Checkpoints
At the end of each day, verify:
1. All tasks marked "done" are fully implemented
2. No new TODOs introduced
3. Integration points tested
4. Both instances in sync

### Final Verification
Before considering migration complete:
1. Zero TODO comments in codebase
2. All endpoints return real data
3. All UI interactions functional
4. Can complete full workflow: upload → process → review → publish
5. Existing worker and desktop app still function

---

## Emergency Procedures

### If Claude Gets Stuck
1. Save current file
2. Start new conversation with specific context
3. Focus on single method/component
4. Provide explicit examples from working code

### If Integration Fails
1. Check contract document for mismatches
2. Verify API shapes with Postman/Swagger
3. Compare with original TypeScript implementation
4. Roll back last change and retry

### If Worker Stops Processing
1. Verify Redis connectivity
2. Check job payload format matches
3. Compare with original job structure
4. Ensure queue names unchanged

---

## Instance Communication Protocol

### Backend Instance Announces
- "Endpoint X complete with shape Y"
- "Database entity Z modified"
- "Breaking change in contract"

### Frontend Instance Announces  
- "Component X needs endpoint Y"
- "State shape changed for feature Z"
- "Integration point ready for testing"

### Synchronization Points
- End of each phase
- Before integration testing
- When contract changes
- Daily at completion

---

## Remember: Complete Implementation is Key
The migration succeeds or fails based on avoiding partial implementations. When instructing Claude, always emphasize:
- Complete implementation required
- No stubs or placeholders
- One atomic task at a time
- Verify before proceeding

This methodical approach ensures nothing falls through the cracks and both instances stay coordinated throughout the migration.