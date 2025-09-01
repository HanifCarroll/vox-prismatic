# Project-Centric .NET Core Backend

## Overview

This .NET Core backend has been architected with a project-centric mental model, replacing the previous entity-centric approach. The system now treats content creation as complete workflows (projects) rather than managing disconnected entities (transcripts, insights, posts).

## Core Architecture

### ContentProject Entity

The `ContentProject` is the central entity that unifies the entire content creation workflow:

```csharp
public class ContentProject
{
    public string Id { get; set; }
    public string Title { get; set; }
    public string CurrentStage { get; set; }
    public WorkflowConfiguration WorkflowConfig { get; set; }
    public ProjectMetrics Metrics { get; set; }
    
    // Related entities
    public Transcript Transcript { get; set; }
    public ICollection<Insight> Insights { get; set; }
    public ICollection<Post> Posts { get; set; }
    public ICollection<ProjectScheduledPost> ScheduledPosts { get; set; }
}
```

### Project Lifecycle Stages

Projects progress through these defined stages:
1. `RawContent` - Just uploaded, needs processing
2. `ProcessingContent` - AI is cleaning/analyzing
3. `InsightsReady` - Insights generated, awaiting review
4. `InsightsApproved` - Ready for post generation
5. `PostsGenerated` - Posts created, awaiting review
6. `PostsApproved` - Ready for scheduling
7. `Scheduled` - Posts queued for publishing
8. `Publishing` - Posts being published
9. `Published` - All posts live
10. `Archived` - Project completed

### State Management

Uses the Stateless library for robust state machine implementation:

```csharp
public class ProjectStateMachine
{
    // Enforces valid transitions
    // Tracks progress automatically
    // Provides audit trail
}
```

## API Endpoints

### Project Management

```
GET    /api/projects                 - List all projects
GET    /api/projects/{id}            - Get project details
POST   /api/projects                 - Create new project
PATCH  /api/projects/{id}            - Update project
DELETE /api/projects/{id}            - Delete project
```

### Project Actions

```
POST   /api/projects/{id}/process-content    - Start transcript processing
POST   /api/projects/{id}/extract-insights   - Generate insights
POST   /api/projects/{id}/generate-posts     - Create posts
POST   /api/projects/{id}/schedule-posts     - Schedule for publishing
POST   /api/projects/{id}/publish-now        - Immediate publishing
```

### Nested Resources

```
GET    /api/projects/{id}/insights           - Project insights
GET    /api/projects/{id}/posts              - Project posts
GET    /api/projects/{id}/events             - Project activity log
POST   /api/projects/{id}/update-metrics     - Refresh metrics
```

### Dashboard

```
GET    /api/dashboard/project-overview       - Overall statistics
GET    /api/dashboard/action-items           - Projects needing attention
```

## Key Features

### 1. Unified Workflow
- All entities are now project-scoped
- Actions are performed in project context
- Clear progression through stages

### 2. Workflow Automation
```csharp
public class WorkflowConfiguration
{
    public bool AutoApproveInsights { get; set; }
    public int MinInsightScore { get; set; }
    public bool AutoGeneratePosts { get; set; }
    public bool AutoSchedulePosts { get; set; }
    public List<string> TargetPlatforms { get; set; }
}
```

### 3. Real-time Metrics
```csharp
public class ProjectMetrics
{
    public int InsightsTotal { get; set; }
    public int InsightsApproved { get; set; }
    public int PostsTotal { get; set; }
    public int PostsPublished { get; set; }
    // ... more metrics
}
```

### 4. Event Tracking
Every project action is logged:
```csharp
public class ProjectEvent
{
    public string EventType { get; set; }
    public string EventName { get; set; }
    public object EventData { get; set; }
    public DateTime OccurredAt { get; set; }
}
```

## Technology Stack

- **.NET 9.0** - Latest framework
- **Entity Framework Core** - ORM with PostgreSQL
- **Hangfire** - Background job processing (replacing BullMQ)
- **Stateless** - State machine implementation
- **AutoMapper** - Entity to DTO mapping
- **FluentValidation** - Request validation
- **Swagger/OpenAPI** - API documentation
- **Server-Sent Events** - Real-time updates

## Database Schema

The schema is now project-centric with proper relationships:

```sql
ContentProjects (main table)
├── Transcripts (1:1)
├── Insights (1:many)
├── Posts (1:many)
├── ProjectScheduledPosts (1:many)
├── ProjectProcessingJobs (1:many)
└── ProjectEvents (1:many)
```

## Background Processing

Uses Hangfire for reliable job processing:

```csharp
backgroundJobs.Enqueue<IContentProcessingService>(
    service => service.ProcessTranscriptAsync(projectId, jobId)
);
```

## Getting Started

### Prerequisites
- .NET 9.0 SDK
- PostgreSQL 16
- Redis 7

### Environment Variables
```
DATABASE_URL=postgresql://user:pass@localhost:5432/content_creation
REDIS_HOST=localhost
REDIS_PORT=6379
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Running the Application

```bash
# Install dependencies
dotnet restore

# Run database migrations
dotnet ef database update

# Run the application
dotnet run
```

### API Documentation

Swagger UI available at: `http://localhost:3000/docs`

## Migration from NestJS

This .NET Core implementation provides:
- Better type safety with C#
- Improved performance
- Native async/await patterns
- Robust state management
- Enterprise-grade job processing

## Next Steps for Development

1. **Complete Service Implementations**
   - Implement IContentProcessingService
   - Implement IPublishingService
   - Add AI service integrations

2. **Add Authentication/Authorization**
   - JWT bearer authentication
   - Role-based access control
   - Per-project permissions

3. **Enhance Real-time Features**
   - Server-Sent Events for pipeline updates
   - SignalR for bidirectional communication

4. **Add Caching**
   - Redis caching for frequently accessed data
   - Response caching for API endpoints

5. **Implement Analytics**
   - Project performance metrics
   - User activity tracking
   - Content effectiveness analysis

## Benefits of Project-Centric Architecture

1. **Aligned Mental Model**: System structure matches user thinking
2. **Simplified Navigation**: All actions in project context
3. **Clear Progress Tracking**: Visual pipeline stages
4. **Reduced Context Switching**: Complete workflows in one place
5. **Better Automation**: Project-level automation rules
6. **Comprehensive Audit Trail**: All events tracked per project

This foundation provides a solid base for the complete migration from NestJS to .NET Core while improving the overall architecture and user experience.