# Content Creation Monorepo

An intelligent content workflow automation system built as a Bun workspace monorepo, transforming long-form content (podcasts, videos, articles) into structured social media posts through functional programming principles.

## 🎯 Overview

This monorepo implements a sophisticated 5-stage pipeline that preserves authentic voice while automating content creation:

- **Extracts insights** from raw transcripts using AI
- **Human review** at critical checkpoints  
- **Generates platform-specific posts** for LinkedIn and X
- **Schedules directly** to social media via Postiz API
- **Reduces workflow** from 3+ hours to 15 minutes

## ✨ Key Features

- **Functional Programming Architecture**: Pure functions, immutable data, Result<T, E> error handling
- **Web Application**: Next.js-based interface with responsive design and visual content management
- **Desktop Application**: Tauri v2 app with full audio recording and meeting detection capabilities
- **Content Intelligence**: Amplifies your voice rather than replacing it
- **Quality Control**: Human-in-the-loop at every critical decision point

## 🏗️ Architecture

The system follows functional programming principles with a clear 5-stage pipeline:

```
Transcript → Insights → Posts → Review → Schedule
    ↓           ↓         ↓        ↓         ↓
   AI       Human     AI+Human  Human    Automated
```

### Monorepo Structure

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
│   └── desktop/            # Tauri desktop application
├── packages/                # Shared libraries
│   ├── database/           # SQLite database management
│   ├── ai/                 # Google Gemini integration
│   ├── prompts/            # AI prompt templates
│   ├── x/                  # X (Twitter) integration
│   ├── linkedin/           # LinkedIn integration
│   └── config/             # Configuration management
├── data/                   # Analytics and metrics
└── docs/                   # Documentation
```

## 📋 Prerequisites

- **[Bun](https://bun.sh)** runtime (v1.0+)
- **Google Gemini** API access
- **X (Twitter)** API credentials (optional)
- **LinkedIn** API credentials (optional)

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
# Google Gemini AI
GOOGLE_AI_API_KEY=...

# X (Twitter) API
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...

# LinkedIn API
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_ACCESS_TOKEN=...
```

### Database

The system uses a centralized SQLite database with the following tables:

- **transcripts** - Source content from recordings, videos, articles
- **insights** - AI-extracted insights with scoring and categorization
- **posts** - Platform-specific social media posts
- **scheduled_posts** - Scheduled content with timing and platform info

The database is automatically created and migrated when you first run the applications.

## 🔄 Applications

### Web Application

Run the Next.js web application:

```bash
cd apps/web && bun dev
```

Features:
- Visual content pipeline management
- Responsive sidebar design
- Real-time database operations
- Interactive transcript, insight, and post management
- Scheduling interface with calendar integration

### Desktop Application

Run the Tauri desktop application:

```bash
cd apps/desktop && bun tauri dev
```

Features:
- Audio recording with real-time duration tracking
- Meeting detection (Zoom, Google Meet, etc.)
- System tray integration for background operation
- Local audio file management and playback
- Automatic transcription integration

### Development Workflow

All commands use Bun workspace features:

```bash
# Run web app
bun --filter="web" dev

# Run desktop app
bun --filter="desktop" tauri dev

# Build all packages
bun run build

# Install dependencies
bun install
```

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
# Run web app with hot reload
cd apps/web && bun dev

# Run desktop app in development
cd apps/desktop && bun tauri dev

# Check TypeScript types for all packages
bun run type-check

# Build desktop app for production
cd apps/desktop && bun tauri build
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

## 🚀 Current Status & Future Enhancements

### Completed Features
- ✅ **Desktop App**: Full audio recording, playback, and meeting detection
- ✅ **Web App**: Responsive UI with content pipeline management
- ✅ **Database**: Centralized SQLite with better-sqlite3
- ✅ **AI Integration**: Google Gemini for content analysis
- ✅ **Monorepo**: Bun workspace with clean package separation

### Potential Improvements
- [ ] Real-time collaboration features
- [ ] Analytics dashboard integration
- [ ] Multi-language support
- [ ] Template library for posts
- [ ] A/B testing framework
- [ ] Direct social media publishing

## 🤝 Contributing

This is currently a private project. If you're interested in similar solutions or collaboration, please reach out.

## 📄 License

Proprietary - All rights reserved

---

Built with ❤️ using [Bun](https://bun.sh), TypeScript, and functional programming principles.