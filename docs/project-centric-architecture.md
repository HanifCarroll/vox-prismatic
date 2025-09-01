# Project-Centric Architecture Design

## Overview

This document outlines the complete redesign of the content creation system from entity-centric to project-centric architecture. The new design aligns the system structure with the user's mental model of content creation as complete workflows rather than separate entity management.

## 1. Fundamental Mental Model

### New User Mental Model
Users think in terms of **Content Projects** - complete workflows from raw input to published content. Each project has:
- **A single source** (transcript, article, video)
- **Multiple insights** extracted from that source
- **Multiple posts** generated from those insights across platforms
- **A lifecycle** that progresses through defined stages

### Project Lifecycle States
1. **Raw Content** - Just uploaded, needs processing
2. **Processing Content** - AI is cleaning/analyzing the source
3. **Insights Ready** - Insights generated, awaiting human review
4. **Insights Approved** - Ready for post generation
5. **Posts Generated** - Posts created, awaiting review
6. **Posts Approved** - Ready for scheduling
7. **Scheduled** - Posts queued for publishing
8. **Publishing** - Posts being published to platforms
9. **Published** - All posts live
10. **Archived** - Project completed and archived

## 2. Backend Data Model Changes

### New Core Entity: ContentProject

**ContentProject Table:**
- **Basic Identity**: id, title, description, tags
- **Source Information**: sourceType, sourceUrl, fileName, filePath
- **Lifecycle Tracking**: currentStage, overallProgress, createdAt, updatedAt
- **User Context**: createdBy, lastActivityAt
- **Workflow Configuration**: autoApprovalSettings, targetPlatforms, publishingSchedule

### Relationship Changes
- **Transcript**: Becomes a child of ContentProject (one-to-one)
- **Insights**: Related through ContentProject (project-to-many)
- **Posts**: Related through ContentProject and Insight (project-to-many)
- **ScheduledPosts**: Related through ContentProject (project-to-many)

### New Aggregate Entity: ProjectSummary
- **Progress Metrics**: insightsTotal, insightsApproved, postsTotal, postsScheduled, postsPublished

### Enhanced Processing Pipeline
- **Pipeline Entity**: Becomes project-scoped instead of transcript-scoped
- **Processing Jobs**: Reference contentProjectId instead of individual entity IDs
- **Event Tracking**: All processing events tagged with contentProjectId
- **Queue Jobs**: Enhanced with project context for better priority management

## 3. API Architecture

### Primary Project APIs
- **GET /api/projects** - List all content projects with summary data
- **GET /api/projects/:id** - Get complete project with all related entities
- **POST /api/projects** - Create new project (from transcript upload)
- **PATCH /api/projects/:id** - Update project metadata
- **DELETE /api/projects/:id** - Archive/delete project

### Project Action APIs
- **POST /api/projects/:id/process-content** - Trigger transcript cleaning
- **POST /api/projects/:id/extract-insights** - Generate insights from content
- **POST /api/projects/:id/generate-posts** - Create posts from approved insights  
- **POST /api/projects/:id/schedule-posts** - Schedule approved posts
- **POST /api/projects/:id/publish-now** - Immediate publishing

### Nested Entity APIs (for detailed management)
- **GET /api/projects/:id/insights** - Insights scoped to project
- **PATCH /api/projects/:id/insights/:insightId** - Approve/reject insights
- **GET /api/projects/:id/posts** - Posts scoped to project  
- **PATCH /api/projects/:id/posts/:postId** - Edit/approve posts

### Dashboard APIs
- **GET /api/dashboard/project-overview** - High-level project status across all projects
- **GET /api/dashboard/action-items** - Projects requiring attention

## 4. Frontend Architecture & Navigation

### New Navigation Structure

**Primary Navigation:**
- **🏠 Dashboard** - Overview of all projects and action items
- **📁 Projects** - Main project management interface  
- **📅 Publishing Calendar** - Scheduled content across all projects
- **⚙️ Settings** - Account, integrations, automation preferences

### Projects Page Layout
- **Header**: Create Project button, search/filter controls, view toggles (list/cards/kanban)
- **Project List**: Each project shows title, current stage, progress indicator, key metrics, quick actions
- **Sidebar Filters**: Stage-based filtering, date ranges, tags

### Individual Project View
- **Project Header**: Title, description, source info, overall progress, stage indicator
- **Pipeline Visualization**: Visual representation of current stage and progress
- **Content Tree**: Hierarchical view of transcript → insights → posts
- **Action Panel**: Context-aware actions based on current stage
- **Activity Timeline**: Processing history and user actions

### Component Architecture

**Project Components:**
- **ProjectCard**: Summary view for project list
- **ProjectDetail**: Full project view with embedded entities
- **ProjectPipeline**: Visual pipeline progress indicator
- **ProjectActions**: Context-aware action buttons

**Entity Components** (nested within projects):
- **TranscriptViewer**: Embedded transcript display and editing
- **InsightReviewer**: Insight approval/rejection interface
- **PostEditor**: Post editing and approval interface
- **SchedulingPanel**: Publishing calendar and scheduling

**State Management:**
- **ProjectStore**: Global state for all projects and their relationships
- **PipelineStore**: Real-time processing state and progress

## 5. User Experience Flows

### Flow 1: Creating New Content Project

**User Journey:**
1. **Landing**: User arrives at Projects page, sees existing projects in various stages
2. **Creation**: Clicks "New Project", presented with upload/input options (file, URL, manual)
3. **Source Input**: Uploads audio/video, pastes URL, or enters text manually
4. **Project Setup**: Sets project title, description, target platforms, automation preferences
5. **Initial Processing**: System creates project, starts transcript processing, shows progress
6. **Dashboard Return**: User returns to project list, sees new project in "Processing Content" stage

### Flow 2: Managing Project Through Lifecycle

**Insights Review Stage:**
1. **Project Access**: User clicks on project showing "5 insights ready for review"
2. **Insight Interface**: Sees project header with pipeline progress, insights list below
3. **Review Process**: Reads each insight, sees verbatim quotes, scores, and suggested post type
4. **Bulk Actions**: Can approve/reject multiple insights, or approve all with high scores
5. **Auto-trigger**: Upon approval, system optionally auto-generates posts or waits for user trigger

**Post Review Stage:**
1. **Context Awareness**: User sees "8 posts generated from 5 insights" in project header  
2. **Post Management**: Views posts grouped by insight source, can edit content
3. **Platform Optimization**: Sees platform-specific versions, character counts, preview rendering
4. **Approval Process**: Approves posts individually or in bulk
5. **Scheduling Trigger**: Option to schedule immediately or proceed to scheduling phase

**Publishing Stage:**
1. **Scheduling Interface**: Calendar view showing optimal posting times per platform
2. **Bulk Scheduling**: Can schedule all approved posts with intelligent timing
3. **Publishing Pipeline**: Real-time progress of posts being published
4. **Completion**: Project automatically moves to "Published" stage

### Flow 3: Cross-Project Management

**Dashboard Overview:**
- **Action Items**: "3 projects need insight review, 2 projects have posts ready to schedule"
- **Pipeline Status**: Visual dashboard showing projects in each stage across the workflow

**Bulk Operations:**
- **Multi-Project Actions**: Select multiple projects for bulk operations
- **Template Application**: Apply successful project templates to new content

## 6. Implementation Strategy

### Clean Implementation Approach
Since existing data is seed data, this will be a complete replacement of the current system rather than a migration.

### Phase 1: Backend Implementation
1. **Database Schema**: Create new ContentProject-centric schema
2. **API Development**: Build complete project-centric API structure
3. **Processing Pipeline**: Update queue and processing systems for project-scoping
4. **Testing**: Comprehensive API testing with project workflows

### Phase 2: Frontend Implementation
1. **Component Library**: Build new project-centric component architecture
2. **State Management**: Implement project-focused state management
3. **Navigation**: Create new navigation structure and routing
4. **UI Integration**: Connect frontend components to new API structure

### Phase 3: System Integration
1. **End-to-End Testing**: Test complete project workflows
2. **Processing Integration**: Ensure AI processing works with project structure
3. **Publishing Integration**: Verify social platform publishing through projects
4. **Performance Optimization**: Optimize for project-centric data loading

### Phase 4: Deployment
1. **Database Deployment**: Deploy new schema and seed fresh project data
2. **API Deployment**: Deploy new project-centric APIs
3. **Frontend Deployment**: Deploy new project-centric UI
4. **Verification**: Verify all workflows function correctly

## Key Benefits

### Eliminated Problems
- **Cross-cutting Confusion**: All related actions are available in project context
- **Navigation Friction**: No more jumping between separate entity pages
- **Status Ambiguity**: Clear project stages replace confusing entity statuses
- **Workflow Interruption**: Users can complete entire content workflows without context switching

### New Capabilities Enabled
- **Project Templates**: Save successful project configurations for reuse
- **Batch Processing**: Process multiple projects through the same stage simultaneously
- **Automation Workflows**: Set project-level automation rules and approval processes

### Future Enhancement Opportunities
- **Advanced Analytics**: Track performance patterns across complete content workflows
- **AI Optimization**: Learn from project success patterns to improve processing
- **Template Marketplace**: Share successful project templates
- **Advanced Scheduling**: Intelligent content calendar management

## Implementation Considerations

### Backend Requirements
- **Database Schema Changes**: Complete restructure around ContentProject entity
- **API Architecture**: New RESTful structure focused on project workflows
- **Processing Pipeline**: Queue system updates for project-scoped processing
- **Event System**: Enhanced event tracking for project lifecycle management

### Frontend Requirements
- **Complete UI Redesign**: New component architecture and navigation structure
- **State Management**: Project-centric data flow and state management
- **Real-time Updates**: Live progress tracking for processing pipelines
- **Responsive Design**: Optimized layouts for project management workflows

This architecture fundamentally solves the mental model mismatch by aligning the system structure with how users actually think about content creation - as complete projects with natural progression stages rather than disconnected entity management.