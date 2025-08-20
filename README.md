# Content Intelligence Pipeline

An intelligent content workflow automation system that transforms long-form content (podcasts, videos, coaching sessions) into structured social media posts through a functional programming approach.

## 🎯 Overview

This CLI tool implements a sophisticated 5-stage pipeline that preserves authentic voice while automating content creation:

- **Extracts insights** from raw transcripts using AI
- **Human review** at critical checkpoints  
- **Generates platform-specific posts** for LinkedIn and X
- **Schedules directly** to social media via Postiz API
- **Reduces workflow** from 3+ hours to 15 minutes

## ✨ Key Features

- **Functional Programming Architecture**: Pure functions, immutable data, Result<T, E> error handling
- **Interactive CLI**: Rich user experience with selective processing and visual menus
- **Real-time Scheduling**: Direct integration with Postiz for actual post scheduling
- **Content Intelligence**: Amplifies your voice rather than replacing it
- **Quality Control**: Human-in-the-loop at every critical decision point

## 🏗️ Architecture

The system follows functional programming principles with a clear 5-stage pipeline:

```
Transcript → Insights → Posts → Review → Schedule
    ↓           ↓         ↓        ↓         ↓
   AI       Human     AI+Human  Human    Automated
```

### Project Structure

```
content-creation/
├── src/
│   ├── index.ts                    # Main CLI menu
│   ├── lib/
│   │   ├── ai.ts                   # Google Gemini integration
│   │   ├── notion.ts               # Notion API operations
│   │   ├── postiz.ts               # Postiz scheduling integration
│   │   ├── config.ts               # Configuration management
│   │   ├── types.ts                # TypeScript interfaces
│   │   ├── utils.ts                # Pure utility functions
│   │   ├── io.ts                   # Display utilities
│   │   └── datetime-picker.ts      # Interactive date/time UI
│   └── modules/
│       ├── transcript-processor.ts # Stage 1: Extract insights
│       ├── insight-reviewer.ts     # Stage 2: Human curation
│       ├── post-generator.ts       # Stage 3: Create posts
│       ├── post-reviewer.ts        # Stage 4: Quality control
│       └── post-scheduler.ts       # Stage 5: Schedule posts
├── prompts/                        # AI prompt templates
├── debug/                          # Debug logs and metrics
└── CLAUDE.md                       # AI assistant instructions
```

## 📋 Prerequisites

- **[Bun](https://bun.sh)** runtime (v1.0+)
- **Notion** workspace with configured databases
- **Google Gemini** API access
- **Postiz** account (or self-hosted instance)

## 🚀 Installation

```bash
# Clone the repository
git clone [repository-url]
cd content-creation

# Install dependencies
bun install

# Copy environment template
cp .env.example .env
```

## 🔐 Configuration

Create a `.env` file with your credentials:

```env
# Notion Configuration
NOTION_API_KEY=secret_...
NOTION_TRANSCRIPTS_DATABASE_ID=...
NOTION_INSIGHTS_DATABASE_ID=...
NOTION_POSTS_DATABASE_ID=...

# Google Gemini AI
GOOGLE_AI_API_KEY=...

# Postiz Scheduling (include /api/ in URL)
POSTIZ_API_KEY=...
POSTIZ_BASE_URL=https://postiz.yourdomain.com/api/
```

### Notion Database Setup

You'll need three Notion databases with specific properties:

**Transcripts Database:**
- Title (title)
- Status (select): "Needs Processing", "Processing", "Processed"
- Insights Count (number)
- Created Time (created_time)

**Insights Database:**
- Title (title)
- Score (number)
- Status (select): "Needs Review", "Ready for Posts", "Rejected"
- Post Type (select): "Problem", "Proof", "Framework", "Contrarian Take", "Mental Model"
- Category (text)
- Summary (text)
- Verbatim Quote (text)
- Transcript (relation to Transcripts)

**Posts Database:**
- Title (title)
- Platform (select): "LinkedIn", "X"
- Status (select): "Draft", "Approved", "Scheduled", "Published"
- Content (text)
- Scheduled Date (date)
- Created Time (created_time)

## 🔄 Workflow

### Interactive CLI Menu

```bash
bun src/index.ts
```

This launches the main menu with all available modules:

```
🚀 CONTENT CREATION CLI

What would you like to do?
  → Process Transcripts
    Review Insights
    Generate Posts
    Review Posts
    Schedule Posts
    Exit
```

### Stage 1: Process Transcripts

Extracts insights from raw transcripts:

```bash
bun src/modules/transcript-processor.ts
```

- Cleans transcript content (removes filler words, fixes formatting)
- Extracts structured insights using AI
- Scores insights based on engagement potential
- Creates insight records with "Needs Review" status

### Stage 2: Review Insights

Human curation of AI-extracted insights:

```bash
bun src/modules/insight-reviewer.ts
```

- Interactive review interface
- Shows insights sorted by score
- Options: Approve, Reject, Edit, Skip
- Approved insights → "Ready for Posts"

### Stage 3: Generate Posts

Creates platform-specific social media posts:

```bash
bun src/modules/post-generator.ts
```

- Processes approved insights
- Generates LinkedIn posts (with CTAs)
- Generates X posts (280 character limit)
- Maintains authentic voice using full transcript context

### Stage 4: Review Posts

Quality control for generated content:

```bash
bun src/modules/post-reviewer.ts
```

- Select specific posts to review
- Edit content before approval
- Approve posts → "Approved" status
- Reject posts for regeneration

### Stage 5: Schedule Posts

Direct integration with Postiz for scheduling:

```bash
bun src/modules/post-scheduler.ts
```

- Shows real scheduled posts from Postiz API
- Interactive date/time picker
- Smart time slot suggestions
- Conflict detection and avoidance
- Direct API scheduling (no copy-paste)

## 🎨 Content Strategy

### 5 Strategic Post Types

The system generates varied content to showcase different aspects of expertise:

1. **Problem** - Builds empathy by highlighting pain points
2. **Proof** - Builds credibility with concrete results
3. **Framework** - Builds authority through systematic methods
4. **Contrarian Take** - Builds thought leadership by challenging norms
5. **Mental Model** - Builds teaching reputation with fundamental concepts

### Platform Optimization

**LinkedIn:**
- Longer form (up to 3000 characters)
- Professional tone
- Soft or direct CTAs
- Formatted for readability

**X (Twitter):**
- Concise (280 characters)
- Thread potential
- Hashtag optimization
- Engagement hooks

## 🧪 Development

### Running in Development

```bash
# Run with hot reload
bun --hot src/index.ts

# Run individual modules
bun src/modules/transcript-processor.ts

# Check TypeScript types
bunx tsc --noEmit
```

### Functional Programming Patterns

The codebase uses functional programming throughout:

```typescript
// Result pattern for error handling
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

// Pure functions with no side effects
const processTranscript = (
  transcript: string
): Result<Insight[]> => {
  // Processing logic
  return { success: true, data: insights }
}

// Composable operations
const pipeline = compose(
  extractInsights,
  scoreInsights,
  filterByScore
)
```

## 📊 Metrics & Debugging

The system tracks detailed metrics:

- Processing duration per stage
- Token usage and costs
- Success/failure rates
- Content quality scores

Debug files are saved to `debug/` directory:
- Cleaned transcripts
- Raw AI responses
- Processing metrics
- Error logs

## 💰 Cost Optimization

Estimated costs (Google Gemini pricing):
- **Gemini Flash** (cleaning): $0.075/1M input tokens
- **Gemini Pro** (insights/posts): $1.25/1M input tokens

Optimization tips:
- Use selective processing instead of batch
- Review insights before generating posts
- Monitor token usage in debug logs

## 🚨 Error Handling

Comprehensive error handling throughout:
- Functional Result types for explicit error handling
- Graceful fallbacks for API failures
- Detailed error logging
- User-friendly error messages

## 🛠️ Troubleshooting

**Common Issues:**

1. **Notion connection fails:**
   - Verify API key and database IDs
   - Check database permissions
   - Ensure correct property names

2. **Postiz scheduling fails:**
   - Verify API endpoint includes `/api/`
   - Check integration setup in Postiz
   - Ensure platform names match

3. **High token usage:**
   - Transcript may be too long
   - Reduce batch sizes
   - Use selective processing

## 🚀 Future Enhancements

Potential improvements:
- [ ] Web dashboard for monitoring
- [ ] Analytics integration
- [ ] Multi-language support
- [ ] Template library for posts
- [ ] A/B testing framework
- [ ] Direct publishing (bypass scheduling)

## 🤝 Contributing

This is currently a private project. If you're interested in similar solutions or collaboration, please reach out.

## 📄 License

Proprietary - All rights reserved

---

Built with ❤️ using [Bun](https://bun.sh), TypeScript, and functional programming principles.