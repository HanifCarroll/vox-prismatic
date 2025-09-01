# UI/UX Rapid Prototyping Prompt for Content Creation Platform

## Your Task
Create innovative UI/UX mockups for a content creation platform that transforms long-form content (podcasts, videos, meetings) into social media posts through an AI-powered pipeline. The system needs a complete redesign from entity-centric to project-centric architecture.

## Core Problem to Solve
Current system has separate pages for managing transcripts, insights, and posts. Users get confused because they have to jump between different pages to complete a single workflow. They don't think in terms of "managing transcripts" or "managing insights" - they think "I want to turn this podcast into social posts."

## The New Mental Model: Content Projects

### What is a Content Project?
A "Content Project" is a single piece of source content (like a podcast episode) and everything derived from it:
- **1 Source** → **Multiple Insights** → **Multiple Posts** → **Published Content**
- Users should be able to manage the entire lifecycle in one place
- No more jumping between separate entity pages

### Project Lifecycle Stages
Projects flow through these stages (design your UI to make this progression clear):
1. **Raw Content** - Just uploaded, needs processing
2. **Processing** - AI cleaning/analyzing 
3. **Insights Ready** - AI found key insights, need human review
4. **Insights Approved** - Ready to generate posts
5. **Posts Generated** - Posts created, need review
6. **Posts Approved** - Ready to schedule
7. **Scheduled** - Queued for publishing
8. **Published** - Live on social platforms

## Key User Workflows to Design For

### Workflow 1: Create New Project
- User uploads audio/video file OR pastes URL OR enters text
- Sets project title and target platforms (LinkedIn, X/Twitter)
- Configures automation (auto-approve high-scoring insights, auto-generate posts)
- Starts processing pipeline

### Workflow 2: Review & Approve Insights  
- User sees AI-extracted insights with scores (0-100)
- Each insight has: title, summary, verbatim quote, suggested post type
- User can approve/reject individually or bulk approve high-scorers
- Approved insights trigger post generation

### Workflow 3: Review & Schedule Posts
- User sees generated posts grouped by source insight
- Platform-specific versions (LinkedIn vs X)
- Can edit content, preview how it looks
- Bulk schedule with optimal timing

### Workflow 4: Monitor Progress
- See all projects in various stages at a glance
- Identify what needs attention (e.g., "3 projects need insight review")
- Track publishing schedule and performance

## UI Components Needed

### Projects List View
- Show all projects with their current stage
- Visual progress indicators (progress bars, pipeline visualization)
- Quick actions based on stage (Review, Approve, Schedule)
- Filter by stage, date, platform

### Individual Project View  
- Project header with title, source info, overall progress
- Pipeline visualization showing current stage
- Content tree: Transcript → Insights → Posts
- Context-aware action panel (changes based on stage)
- Activity timeline of what's happened

### Dashboard
- Action items requiring attention
- Projects grouped by pipeline stage
- Upcoming publishing schedule
- Quick stats (projects processing, posts scheduled, etc.)

## Design Constraints & Guidelines

### Information to Display
For each project, always show:
- Current stage in pipeline
- Progress percentage
- Number of insights/posts
- Time since last activity
- Next required action

### Key Interactions
- Drag-and-drop for moving projects between stages (kanban style)
- Bulk operations for approving/rejecting multiple items
- Keyboard shortcuts for power users
- Quick preview without leaving list view

### Visual Design Principles
- Clear visual hierarchy - most important action should be obvious
- Progressive disclosure - don't overwhelm with all options at once
- Status through color - consistent color coding for stages
- Real-time updates - show processing progress live

## Create These Mockups

Please create HTML mockups with inline CSS and JavaScript for:

1. **Projects Overview** - A view showing all projects in their various stages
2. **Project Detail** - Deep dive into a single project with all its content
3. **Command Center/Dashboard** - Quick overview and action items
4. **Project Creation** - Smooth flow for starting new projects

## Innovation Opportunities

Feel free to explore different approaches:
- **Kanban board** where projects move through columns
- **Timeline view** showing projects over time
- **Command palette** for quick actions (like VS Code)
- **Split-pane editor** for reviewing content side-by-side
- **Card-based** or **list-based** layouts
- **Dark mode** vs **light mode** aesthetics
- **Information-dense** vs **spacious** designs

## Example Data to Use

**Project: "Startup Fundraising Podcast"**
- Status: Insights Ready
- Duration: 62 minutes
- Word count: 5,234
- Insights found: 5 (scores: 85, 78, 72, 68, 61)
- Example insight: "Investors don't care about perfect products, they want traction"
- Target platforms: LinkedIn, X

**Project: "Q4 Product Strategy Meeting"**  
- Status: Processing (65% complete)
- Duration: 45 minutes
- Processing step: Cleaning transcript

**Project: "Remote Team Culture Interview"**
- Status: Posts Generated  
- 8 posts ready for review (4 LinkedIn, 4 X)
- 4 insights approved

## Success Criteria

The UI should:
1. Make it obvious where each project is in the pipeline
2. Show what action the user needs to take next
3. Allow managing entire workflow without page navigation
4. Feel fast and responsive
5. Reduce cognitive load compared to entity-based navigation

## Technical Notes

- Make interfaces interactive (clicks, hovers, state changes)
- Use modern CSS (flexbox, grid, animations)
- Include mock data to make it feel real
- Consider both desktop and mobile viewports

---

**Remember:** Users think "I want to turn this content into posts" not "I need to manage transcripts, then insights, then posts." Design for the user's mental model, not the database structure.