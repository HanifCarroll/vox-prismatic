# AI-Powered Content Creation System

An automated content creation pipeline that transforms coaching session transcripts into high-quality social media posts for LinkedIn and X (Twitter).

## 🚀 Overview

This system implements a human-in-the-loop workflow that:
1. Processes raw transcripts from Notion
2. Extracts valuable insights using AI
3. Provides a review interface for quality control
4. Generates platform-specific social media posts
5. Tracks costs and performance metrics

## 📋 Prerequisites

- Bun runtime (v1.2.20+)
- Notion API access
- Google Gemini API key
- Notion databases set up (Transcripts, Insights, Posts)

## 🔧 Installation

```bash
bun install
```

## 🔐 Environment Setup

Create a `.env` file with:

```env
NOTION_API_KEY=your_notion_api_key
GOOGLE_AI_API_KEY=your_gemini_api_key
NOTION_TRANSCRIPTS_DATABASE_ID=your_transcripts_db_id
NOTION_INSIGHTS_DATABASE_ID=your_insights_db_id
NOTION_POSTS_DATABASE_ID=your_posts_db_id
```

## 📂 Project Structure

```
content-creation/
├── index.ts              # Main transcript processor
├── generate-posts.ts     # Post generation from insights
├── review-insights.ts    # Manual review interface
├── prompts/             # Externalized AI prompts
│   ├── clean-transcript.md
│   ├── extract-insights.md
│   └── generate-posts.md
├── debug/               # Debug output and metrics
├── POST_TYPE_EXAMPLES.md # Examples of all 5 post types
└── README.md
```

## 🔄 Workflow

### 1. Process Transcripts
Extract insights from transcripts marked as "Needs Processing":

```bash
bun index.ts           # Process all pending transcripts
bun index.ts --test    # Test mode: process only first transcript
```

**What happens:**
- Cleans transcript content (removes filler words, fixes errors)
- Extracts insights using chain-of-thought reasoning
- Creates insight pages with status "Needs Review"
- Saves metrics and debug information

### 2. Review Insights (Human-in-the-Loop)
Review and approve AI-extracted insights:

```bash
bun review-insights.ts
```

**Review Interface:**
- Displays insights sorted by score
- Shows title, summary, and verbatim quote
- Options: Approve, Reject, Skip, or Quit
- Approved insights → "Ready for Posts"
- Rejected insights → "Rejected"

### 3. Generate Posts
Create social media posts from approved insights:

```bash
bun generate-posts.ts           # Process all approved insights
bun generate-posts.ts --test    # Test mode: process highest-scoring insight
bun generate-posts.ts --batch 5 # Custom batch size (default: 3)
```

**Output:**
- LinkedIn posts with soft/direct CTAs
- X (Twitter) posts under 280 characters
- Posts saved to Notion with "Draft" status

## 🎯 Content Strategy

### 5 Strategic Post Types

The system generates 5 types of content to showcase different aspects of your expertise:

1. **Problem** - Build empathy by relating to audience pain points
2. **Proof** - Build credibility by showcasing concrete results  
3. **Framework** - Build authority by teaching systematic methods
4. **Contrarian Take** - Build thought leadership by challenging conventional wisdom
5. **Mental Model** - Build teaching reputation by explaining fundamental concepts

See [POST_TYPE_EXAMPLES.md](POST_TYPE_EXAMPLES.md) for detailed examples of each type.

### Recommended Content Distribution
- 30% Problem posts (empathy)
- 25% Proof posts (credibility) 
- 20% Framework posts (authority)
- 15% Contrarian Takes (originality)
- 10% Mental Models (wisdom)

## 🎯 Key Features

### Externalized Prompts
All AI prompts are stored in markdown files for easy editing without code changes:
- `prompts/clean-transcript.md` - Transcript cleaning instructions
- `prompts/extract-insights.md` - Insight extraction with JSON schema
- `prompts/generate-posts.md` - Post generation with style guide

### Resilient Batch Processing
- Uses `Promise.allSettled` instead of `Promise.all`
- Individual failures don't stop the entire batch
- Detailed error reporting for failed items

### JSON-Based AI Responses
- Structured JSON responses for reliability
- Automatic fallback to text parsing if JSON fails
- Type-safe data handling

### Accurate Token Tracking
- Uses actual token counts from Gemini API when available
- Falls back to estimation if metadata unavailable
- Precise cost tracking per operation

### Human Review Checkpoint
- Prevents AI hallucinations from reaching production
- Ensures content aligns with your voice and experience
- Quick 15-minute weekly review process

## 📊 Metrics & Debugging

The system tracks detailed metrics for each operation:
- Processing duration
- Token usage (actual or estimated)
- Cost calculations
- Success/failure rates
- Content length statistics

Debug files are saved to the `debug/` directory:
- Raw and cleaned transcript content
- AI responses (JSON format)
- Parsed insights
- Session summaries with cost analysis

## 🎨 Customization

### Modifying AI Behavior
Edit the prompt files in `prompts/` to adjust:
- Insight extraction criteria
- Post writing style
- Content categorization
- Scoring algorithms

### Adjusting the Workflow
In `index.ts`:
- Change initial status from "Needs Review" to "Ready for Posts" for full automation
- Adjust transcript cleaning parameters
- Modify insight scoring weights

In `generate-posts.ts`:
- Customize batch processing size
- Adjust temperature settings for creativity
- Modify post formatting rules

## 🚨 Error Handling

The system includes comprehensive error handling:
- Graceful fallbacks for API failures
- Detailed error logging
- Batch processing continues despite individual failures
- Automatic content truncation for oversized inputs

## 💰 Cost Optimization

Estimated costs per operation (Gemini pricing):
- **Flash Model** (cleaning): $0.075/1M input, $0.30/1M output tokens
- **Pro Model** (insights/posts): $1.25/1M input, $5.00/1M output tokens

Tips for cost reduction:
- Use test mode during development
- Adjust batch sizes based on budget
- Monitor token usage in debug logs
- Truncate very long transcripts automatically

## 🧪 Testing the Workflow

### Quick Environment Check
```bash
# Test your setup before running the full workflow
bun test-setup.ts
```

This validates:
- ✅ Environment variables and API keys
- ✅ Prompt files exist and have content  
- ✅ Directory structure is correct
- ✅ API connections work properly

### Complete Workflow Test

1. **Use the test transcript**:
   - Copy content from `TEST_TRANSCRIPT.md`
   - Create a new page in your Notion Transcripts database
   - Set title to "TEST - Workflow Validation"
   - Set status to "Needs Processing"

2. **Run the full pipeline**:
   ```bash
   # Step 1: Extract insights from test transcript
   bun index.ts --test
   
   # Step 2: Review and approve insights  
   bun review-insights.ts
   
   # Step 3: Generate social media posts
   bun generate-posts.ts --test
   ```

3. **Expected results**:
   - 5 insights extracted (one of each post type)
   - Human review interface shows all insights
   - LinkedIn and X posts generated for approved insights

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed testing instructions and [POST_TYPE_EXAMPLES.md](POST_TYPE_EXAMPLES.md) for expected output examples.

## 🛠️ Troubleshooting

**No insights found for review:**
- Check transcript status in Notion
- Verify API credentials
- Review debug logs for extraction errors

**Post generation fails:**
- Ensure insights have "Ready for Posts" status
- Check API rate limits
- Verify all required fields are populated

**High token usage:**
- Enable transcript truncation
- Reduce batch sizes
- Optimize prompt templates

## 📈 Future Enhancements

Potential improvements to consider:
- Webhook integration for real-time processing
- A/B testing for post variations
- Analytics integration for performance tracking
- Multi-language support
- Custom scoring algorithms
- Automated scheduling to social platforms

## 🤝 Contributing

This is a private project for content creation automation. For questions or issues, please refer to the internal documentation.

## 📄 License

Proprietary - All rights reserved

---

Built with [Bun](https://bun.com) - a fast all-in-one JavaScript runtime.