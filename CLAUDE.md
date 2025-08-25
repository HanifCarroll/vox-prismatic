---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `better-sqlite3` for SQLite. Note: `bun:sqlite` is not compatible with Next.js, so use `better-sqlite3` for universal compatibility.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Tauri v2

This project uses **Tauri v2**. Always use the latest Tauri v2 syntax and APIs:

### API Imports
- Use `import { invoke } from "@tauri-apps/api/core"` (NOT `@tauri-apps/api/tauri`)
- Use `import { getCurrentWindow } from "@tauri-apps/api/window"`
- Use `import { listen } from "@tauri-apps/api/event"`

### Tauri Commands
- Commands are registered with `tauri::generate_handler![]`
- Use `#[tauri::command]` attribute for command functions
- Command functions can be `async` and return `Result<T, String>`
- State management uses `State<'_, AppState>` parameter

### Backend (Rust)
- Use `tauri::Builder::default()` for app setup
- Use `AppHandle` for accessing app functionality
- Use `Manager` trait for path operations: `app_handle.path().app_data_dir()`
- Use proper async patterns with `tokio` runtime

### Frontend Integration
- Use modern Tauri v2 event system with `listen()`
- Use `invoke()` for calling backend commands
- Handle `Result` types properly in TypeScript

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

# Content Creation Monorepo

An intelligent content workflow automation system built as a Bun workspace monorepo, transforming long-form content (podcasts, videos, articles) into structured social media posts through functional programming principles.

## Project Overview

This monorepo contains a complete content intelligence pipeline with the following components:

### Current Components
- **Web Application** (`apps/web/`) - Next.js web application with Tailwind CSS for visual content management
- **Desktop Application** (`apps/desktop/`) - Tauri-based desktop application (in development)
- **Shared Packages** (`packages/`) - Reusable libraries for AI, integrations, database, and utilities

### Pipeline Stages
1. **Transcript Processing** - Extract insights from long-form content using AI
2. **Insight Review** - Human-curated review and approval of AI-generated insights  
3. **Post Generation** - Transform approved insights into platform-specific social media posts
4. **Post Review** - Quality control and editing of generated posts
5. **Post Scheduling** - Integration with Postiz for automated social media scheduling

## Architecture & Design Philosophy

### Monorepo Structure
Built as a Bun workspace with clean separation of concerns:

```
content-creation/ (monorepo root)
├── apps/                    # User-facing applications
│   ├── web/                # Next.js web application
│   │   ├── src/
│   │   │   ├── app/        # App Router structure
│   │   │   │   ├── components/ # Reusable UI components
│   │   │   │   ├── api/    # API routes
│   │   │   │   └── (pages)/ # Route pages
│   │   │   └── lib/        # Client-side utilities
│   │   └── public/         # Static assets
│   └── desktop/            # Tauri desktop application (in development)
├── packages/                # Shared libraries
│   ├── database/           # SQLite database management with better-sqlite3
│   ├── scheduler/          # Post scheduling system
│   ├── ai/                 # Google Gemini integration
│   ├── prompts/            # AI prompt templates
│   ├── x/                  # X (Twitter) integration
│   ├── linkedin/           # LinkedIn integration
│   └── config/             # Configuration management
├── data/                   # Analytics and metrics
└── docs/                   # Documentation
```

### Functional Programming Style
The codebase follows functional programming principles throughout:

- **Pure Functions**: All core operations are implemented as pure functions that return `Result<T, E>` types
- **Immutable Data**: State transformations create new objects rather than mutating existing ones
- **Composable Operations**: Small, focused functions that can be composed to create complex workflows
- **Error Handling**: Functional error handling with explicit `Result` types instead of throwing exceptions
- **No Side Effects**: Functions are predictable and testable with clear input/output relationships

## Key Features

### Intelligent Content Analysis
- **Multi-format Support**: Processes transcripts from podcasts, YouTube videos, and articles
- **AI-Powered Insights**: Uses Google Gemini to extract key insights, quotes, and actionable content
- **Content Scoring**: Automatically scores insights based on engagement potential and relevance
- **Category Classification**: Organizes insights by topic and content type

### Human-in-the-Loop Workflow
- **Selective Processing**: Choose specific insights or posts to process rather than batch operations
- **Quality Control**: Built-in review and editing capabilities before publication
- **Flexible Scheduling**: Custom date/time selection with intelligent time slot suggestions

### Social Media Integration
- **Multi-Platform Support**: LinkedIn, X (Twitter), and other platforms via Postiz
- **Real-time Scheduling**: Direct integration with Postiz API for actual post scheduling
- **Schedule Visibility**: Shows real scheduled posts from Postiz API, not just local assumptions
- **Conflict Prevention**: Intelligent time slot suggestions that avoid scheduling conflicts

### Data Management
- **SQLite Database**: Centralized SQLite database using better-sqlite3 for all content storage
- **Database Consolidation**: Single database file instead of separate per-package databases
- **Status Tracking**: Tracks content through each stage of the pipeline (Draft → Review → Approved → Scheduled)
- **Relationship Mapping**: Maintains relationships between transcripts, insights, and generated posts
- **Audit Trail**: Complete history of content transformations and approvals

## Technical Implementation

### Result Pattern
All operations return `Result<T, E>` types for explicit error handling:

```typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }
```

### Configuration Management
Centralized config with environment variable support:

```typescript
interface AppConfig {
  ai: AIConfig;
  database: DatabaseConfig;
  x: XConfig;
  linkedin: LinkedInConfig;
}
```


### API Integrations
- **Google Gemini**: Advanced content analysis and post generation
- **SQLite Database**: Local database operations with better-sqlite3
- **X (Twitter) API**: Social media posting to X/Twitter
- **LinkedIn API**: Professional social media posting

## Usage Patterns

### Individual Post Selection
Instead of batch processing, users can:
- Select specific posts to review from a visual menu
- Choose individual posts for scheduling
- Navigate between different workflow stages
- Continue or finish processing sessions

### Time Management
- **Smart Scheduling**: Suggests optimal posting times based on existing schedule
- **Custom Times**: Full flexibility to choose any date/time combination  
- **Conflict Avoidance**: Checks against real Postiz schedule to prevent overlaps
- **Batch Scheduling**: Option to schedule all remaining posts automatically

### Content Quality
- **Preview Generation**: Shows content previews in selection menus
- **Title Integration**: Displays post titles alongside platform and creation dates
- **Content Editing**: In-place editing capabilities during review stages
- **Status Filtering**: Shows only relevant content for each stage

## Development Workflow

All commands use Bun workspace features:

```bash
# Run the web application
cd apps/web && bun dev

# Run web app with workspace filter
bun --filter="web" dev

# Build all packages
bun run build

# Work on specific packages
bun --filter="database" build
bun --filter="ai" type-check
bun --filter="config" build

# Run apps in parallel
bun run dev
```

### Workspace Management

```bash
# Install all dependencies
bun install

# Add dependency to specific package
bun add --filter="web" some-package

# Clean all build artifacts
bun run clean
```

The system is designed to be modular, testable, and maintainable through functional programming principles for content creators and marketing teams.

## Current Applications

The monorepo currently includes these applications:

- **Web App** (`apps/web/`) - Next.js web application with responsive sidebar and visual content management (in active development)
- **Desktop App** (`apps/desktop/`) - Tauri v2 desktop application with full audio recording, playback, and management (fully functional)
- **Shared Components** - All packages can be imported by any app using `@content-creation/package-name`

## Recent Technical Changes

### Desktop App Implementation (Completed)

#### **Audio System Architecture**
- **Tauri v2** desktop application with full audio recording and playback capabilities
- **CPAL Audio Framework**: Cross-platform audio library for recording and playback
- **WAV File Format**: Standard uncompressed audio for compatibility
- **Threaded Architecture**: Separate audio management thread with command channels
- **App-Specific Storage**: Recordings saved to platform-appropriate directories

#### **Features Implemented**
- ✅ **Audio Recording**: High-quality WAV recording with real-time duration tracking
- ✅ **Audio Playback**: Full playback system for recorded audio files
- ✅ **Recording Management**: Create, play, delete recordings with UI controls
- ✅ **Persistent Storage**: Recordings survive app restarts with JSON metadata
- ✅ **Meeting Detection**: Automatic detection of meeting applications (Zoom, Google Meet, etc.)
- ✅ **System Tray Integration**: Background operation with tray menu controls
- ✅ **State Management**: Proper state synchronization between frontend and backend

#### **Architecture Pattern**
```
Frontend (React/TypeScript) 
    ↓ invoke() commands
Backend (Rust/Tauri)
    ↓ Commands → Services → Audio Thread
Audio System (CPAL + Threading)
    ↓ WAV Files + Metadata
File System (Platform Storage)
```

#### **Commands Implemented**
- `start_recording`, `stop_recording`, `pause_recording`, `resume_recording`
- `play_recording`, `stop_playback`, `get_playback_state`
- `delete_recording`, `get_recent_recordings`, `load_recordings_from_disk`
- `start_meeting_detection`, `stop_meeting_detection`, `get_meeting_state`

#### **File Structure**
```
apps/desktop/src-tauri/src/
├── commands/          # Tauri command handlers
│   ├── recording.rs   # Recording command implementations
│   └── meeting.rs     # Meeting detection commands
├── services/          # Business logic layer
│   ├── recording_service.rs  # Recording operations
│   └── meeting_service.rs    # Meeting detection logic
├── tray/             # System tray functionality
├── meeting_detector.rs  # Cross-platform meeting detection
└── lib.rs           # Main application setup and audio system
```

#### **Storage Structure**
```
~/Library/Application Support/[app]/recordings/
├── recordings.json                    # Metadata persistence
├── recording_20250824_151123.wav     # Audio files
└── recording_20250824_152456.wav     # Timestamped filenames
```

### Database Migration (Completed)
- **From**: Separate SQLite databases per package using `bun:sqlite`
- **To**: Centralized SQLite database using `better-sqlite3` for Next.js compatibility
- **Benefits**: Universal compatibility, simplified data management, reduced database proliferation

### Web Application Features (Completed)
- **Responsive Sidebar**: Dynamic width management with collapse/expand functionality
- **Smooth Animations**: CSS transitions for better user experience
- **Layout Management**: Proper flex-based layout that adjusts content area when sidebar changes
- **Tailwind Integration**: Full Tailwind CSS v4 with modern styling patterns

### Development Environment
- **Node.js Deprecation Warnings**: Suppressed using `NODE_OPTIONS='--no-deprecation'` for clean development experience
- **Turbopack Compatibility**: Optimized for Next.js 15.x with Turbopack bundler
- **Hot Reload**: Full hot module replacement for rapid development

- Never test the app by running scripts. I'll test it myself.

## Desktop App Development Notes

### Key Patterns to Follow
- **Commands**: Thin wrappers that delegate to services (`commands/recording.rs`)
- **Services**: Business logic with proper error handling (`services/recording_service.rs`) 
- **State Management**: Use `Arc<Mutex<T>>` for shared state in Rust backend
- **Persistence**: Always save metadata when modifying recordings list
- **Threading**: Audio operations run in dedicated thread with command channels

### Common Issues & Solutions
- **Send Trait Errors**: Don't hold `MutexGuard` across `.await` calls - extract values first
- **Import Paths**: Use `@tauri-apps/api/core` for `invoke()` in Tauri v2
- **File Persistence**: Save recordings to app data directory, not temp directory
- **State Sync**: Use `refreshAppState()` after operations that modify data

### Testing
- Audio playback requires actual audio output device
- Recordings are saved to platform-specific app data directories
- Meeting detection works on macOS with browser URL checking
- System tray integration allows background operation