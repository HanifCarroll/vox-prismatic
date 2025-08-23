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
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

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
- **CLI Application** (`apps/cli/`) - Interactive command-line interface for the complete workflow
- **Shared Packages** (`packages/`) - Reusable libraries for AI, integrations, and utilities

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
│   └── cli/                # Interactive command-line interface
│       ├── src/
│       │   ├── lib/        # Core libraries
│       │   ├── modules/    # Pipeline stage implementations
│       │   └── web/        # Visual calendar scheduler
│       └── config/         # Prompt templates
├── packages/                # Shared libraries
│   ├── shared/             # Types, utilities, Result patterns
│   ├── ai/                 # Google Gemini integration
│   ├── notion/             # Notion API client  
│   ├── postiz/             # Postiz social media integration
│   └── content-pipeline/   # Core processing logic
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
- **Interactive Review**: CLI prompts for human approval at each stage
- **Selective Processing**: Choose specific insights or posts to process rather than batch operations
- **Quality Control**: Built-in review and editing capabilities before publication
- **Flexible Scheduling**: Custom date/time selection with intelligent time slot suggestions

### Social Media Integration
- **Multi-Platform Support**: LinkedIn, X (Twitter), and other platforms via Postiz
- **Real-time Scheduling**: Direct integration with Postiz API for actual post scheduling
- **Schedule Visibility**: Shows real scheduled posts from Postiz API, not just local assumptions
- **Conflict Prevention**: Intelligent time slot suggestions that avoid scheduling conflicts

### Data Management
- **Notion Integration**: Uses Notion as the primary database for content, insights, and posts
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
  notion: NotionConfig; 
  postiz: PostizConfig;
}
```

### Interactive CLI
Uses `@prompts/node` for rich interactive experiences:
- Multi-select menus for batch operations
- Custom date/time pickers with validation
- Progress indicators and status updates
- Graceful error handling and recovery

### API Integrations
- **Google Gemini**: Advanced content analysis and post generation
- **Notion API**: Database operations for content management
- **Postiz SDK**: Official SDK integration for social media scheduling

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
# Run the main CLI (from root directory)
bun run cli

# Run CLI directly with workspace filter  
bun --filter="cli" dev

# Build all packages (future)
bun run build

# Work on specific packages
bun --filter="shared" build
bun --filter="ai" type-check

# Run apps in parallel (future)
bun run dev
```

### Workspace Management

```bash
# Install all dependencies
bun install

# Add dependency to specific package
bun add --filter="cli" some-package

# Clean all build artifacts
bun run clean
```

The system is designed to be modular, testable, and maintainable through functional programming principles while providing a rich interactive CLI experience for content creators and marketing teams.

## Future Development

The monorepo is structured to support additional applications:

- **Desktop App** (`apps/desktop/`) - Tauri-based desktop application for automated transcription
- **Web App** (`apps/web/`) - Next.js web application for visual content management  
- **CLI App** (`apps/cli/`) - Command-line interface (already implemented)
- **Shared Components** - All packages can be imported by any app using `@content-creation/package-name`

- Never test the app by running scripts. I'll test it myself.