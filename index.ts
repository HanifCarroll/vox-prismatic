import { Client } from '@notionhq/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

interface TranscriptPage {
  id: string;
  title: string;
  status: string;
}

interface Insight {
  title: string;
  quote: string;
  summary: string;
  beforeAfter: {
    before: string;
    after: string;
    metrics: string;
  };
  category: string;
  scores: {
    urgency: number;
    relatability: number;
    specificity: number;
    authority: number;
    total: number;
  };
  postType: string;
  hooks: string[];
}

class TranscriptProcessor {
  private notion: Client;
  private genAI: GoogleGenerativeAI;
  private flashModel: any;
  private proModel: any;

  constructor() {
    if (!process.env.NOTION_API_KEY) {
      throw new Error('NOTION_API_KEY is required');
    }
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is required');
    }
    if (!process.env.NOTION_TRANSCRIPTS_DATABASE_ID) {
      throw new Error('NOTION_TRANSCRIPTS_DATABASE_ID is required');
    }
    if (!process.env.NOTION_INSIGHTS_DATABASE_ID) {
      throw new Error('NOTION_INSIGHTS_DATABASE_ID is required');
    }

    this.notion = new Client({ auth: process.env.NOTION_API_KEY });
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.flashModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    this.proModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
    // Create debug folder if it doesn't exist
    try {
      mkdirSync('debug', { recursive: true });
    } catch (error) {
      // Folder already exists, ignore
    }
  }

  async getPendingTranscripts(): Promise<TranscriptPage[]> {
    console.log('Fetching pending transcripts...');
    
    const response = await this.notion.databases.query({
      database_id: process.env.NOTION_TRANSCRIPTS_DATABASE_ID || '',
      filter: {
        property: 'Status',
        select: {
          equals: 'Needs Processing'
        }
      }
    });

    return response.results.map((page: any) => ({
      id: page.id,
      title: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
      status: page.properties.Status?.select?.name || 'Unknown'
    }));
  }

  async getPageContent(pageId: string): Promise<string> {
    console.log(`Fetching content for page: ${pageId}`);
    
    let content = '';
    let hasMore = true;
    let startCursor: string | undefined;
    let totalBlocks = 0;

    // Handle pagination to get all blocks
    while (hasMore) {
      const response = await this.notion.blocks.children.list({
        block_id: pageId,
        start_cursor: startCursor,
        page_size: 100
      });
      
      totalBlocks += response.results.length;
      console.log(`📄 Fetched ${response.results.length} blocks (total so far: ${totalBlocks})`);

      for (const block of response.results) {
        const fullBlock = block as BlockObjectResponse;
        if (fullBlock.type === 'paragraph' && 'paragraph' in fullBlock && fullBlock.paragraph.rich_text) {
          content += fullBlock.paragraph.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        } else if (fullBlock.type === 'bulleted_list_item' && 'bulleted_list_item' in fullBlock && fullBlock.bulleted_list_item.rich_text) {
          content += '• ' + fullBlock.bulleted_list_item.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        } else if (fullBlock.type === 'numbered_list_item' && 'numbered_list_item' in fullBlock && fullBlock.numbered_list_item.rich_text) {
          content += '1. ' + fullBlock.numbered_list_item.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;
    }

    console.log(`📝 Total blocks processed: ${totalBlocks}`);
    console.log(`📝 Extracted content length: ${content.length} characters`);
    console.log(`📝 Content preview: ${content.substring(0, 200)}...`);
    
    // Save raw content to file
    writeFileSync(join('debug', 'debug-1-raw-content.txt'), content);
    console.log('💾 Saved raw content to debug/debug-1-raw-content.txt');
    
    return content;
  }

  async cleanTranscript(transcriptContent: string): Promise<string> {
    console.log('Cleaning transcript...');
    console.log(`📏 Input transcript length: ${transcriptContent.length} characters`);
    
    // For very long transcripts, truncate to avoid timeout
    const maxLength = 100000; // ~100k chars should be manageable
    let processContent = transcriptContent;
    
    if (transcriptContent.length > maxLength) {
      console.log(`⚠️  Transcript too long (${transcriptContent.length} chars), truncating to ${maxLength} chars`);
      processContent = transcriptContent.substring(0, maxLength) + '\n\n[Content truncated for processing]';
    }
    
    const cleaningPrompt = `
Clean this transcript for content extraction:
- Remove filler words (um, uh, you know)
- Fix obvious transcription errors
- Preserve specific examples, numbers, and client stories
- Keep technical details intact
- Structure the transcript by speaker

Transcript to clean:

${processContent}
`;

    console.log('🚀 Sending to Gemini 2.5 Flash for cleaning...');
    const startTime = Date.now();
    
    try {
      // Add generation config for faster processing
      const result = await this.flashModel.generateContent(cleaningPrompt, {
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.1,
        }
      });
      const response = await result.response;
      const cleanedText = response.text();
      
      const duration = Date.now() - startTime;
      console.log(`⏱️  Cleaning completed in ${duration}ms`);
      console.log(`🧹 Cleaned content length: ${cleanedText.length} characters`);
      console.log(`🧹 Cleaned preview: ${cleanedText.substring(0, 200)}...`);
      
      // Save cleaned content to file
      writeFileSync(join('debug', 'debug-2-cleaned-content.txt'), cleanedText);
      console.log('💾 Saved cleaned content to debug/debug-2-cleaned-content.txt');
      
      return cleanedText;
      
    } catch (error) {
      console.error('❌ Error during transcript cleaning:', error);
      console.log('⏭️  Falling back to original transcript');
      return transcriptContent; // Fallback to original if cleaning fails
    }
  }

  async extractInsights(transcriptContent: string): Promise<Insight[]> {
    console.log('Extracting insights using Gemini AI...');
    
    const prompt = `
From the provided transcript, identify and extract self-contained stories, problems, and insights that would be valuable to bootstrapped SaaS founders.

**CRITICAL CONSTRAINT:** Do not infer or add any details, metrics, or outcomes that are not explicitly present in the provided transcript. The summary and transformation must be 100% faithful to the source text.

For EACH extracted insight, format it as follows:

---
**Insight Title:** [A short, descriptive title, e.g., "Fixing Buried CTA Increases Activation"]

**Verbatim Quote:**
> [Paste the raw, multi-line quote from the client/me that captures the core story.]

**Concise Summary (1-2 sentences):**
[Summarize the core problem, action, and result.]

**Transformation (Before → After):**
- **Before:** [Describe the initial state of pain.]
- **After:** [Describe the improved state.]
- **Metrics/Proof:** [List specific numbers, timeframes, or tools mentioned.]

**Content Category:** [Choose one: UX Problem, Technical Solution, Result/Outcome, Process/Method]

**Relevance Score (1-5 for each):**
- Urgency: [Score] - Justification: [Briefly explain why]
- Relatability: [Score] - Justification: [Briefly explain why]
- Specificity: [Score] - Justification: [Briefly explain why]
- Authority: [Score] - Justification: [Briefly explain why]
- **Total Score:** [Sum of scores]

**Potential Post Type:** [Assign one: Problem, Proof, Framework. Note if multiple could apply.]

**Initial Hooks (Draft 3):**
1. [Hook 1]
2. [Hook 2]
3. [Hook 3]
---

Here is the transcript:

${transcriptContent}
`;

    const result = await this.proModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log(`🤖 AI response length: ${text.length} characters`);
    console.log(`🤖 AI response preview: ${text.substring(0, 300)}...`);
    
    // Save AI response to file
    writeFileSync(join('debug', 'debug-3-ai-response.txt'), text);
    console.log('💾 Saved AI response to debug/debug-3-ai-response.txt');
    
    const insights = this.parseInsights(text);
    console.log(`⛏️ Parsed ${insights.length} insights from AI response`);
    
    // Save parsed insights to file
    writeFileSync(join('debug', 'debug-4-parsed-insights.json'), JSON.stringify(insights, null, 2));
    console.log('💾 Saved parsed insights to debug/debug-4-parsed-insights.json');
    
    return insights;
  }

  parseInsights(text: string): Insight[] {
    const insights: Insight[] = [];
    const sections = text.split('---').filter(section => section.trim().length > 0);
    
    console.log(`📊 Found ${sections.length} sections to parse`);

    for (const section of sections) {
      const insight = this.parseInsightSection(section);
      if (insight) {
        console.log(`✅ Successfully parsed insight: "${insight.title}"`);
        insights.push(insight);
      } else {
        console.log(`❌ Failed to parse section: ${section.substring(0, 100)}...`);
        // Save failed section to file for debugging
        writeFileSync(join('debug', `debug-failed-section-${insights.length + 1}.txt`), section);
        console.log(`💾 Saved failed section to debug/debug-failed-section-${insights.length + 1}.txt`);
      }
    }

    return insights;
  }

  parseInsightSection(section: string): Insight | null {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let insight: Partial<Insight> = {
      scores: { urgency: 0, relatability: 0, specificity: 0, authority: 0, total: 0 },
      beforeAfter: { before: '', after: '', metrics: '' },
      hooks: []
    };

    let currentField = '';
    
    for (const line of lines) {
      if (line.startsWith('**Insight Title:**')) {
        insight.title = line.replace('**Insight Title:**', '').trim();
      } else if (line.startsWith('**Verbatim Quote:**')) {
        currentField = 'quote';
      } else if (line.startsWith('**Concise Summary')) {
        currentField = 'summary';
      } else if (line.startsWith('**Transformation (Before')) {
        currentField = 'transformation';
      } else if (line.startsWith('**Content Category:**')) {
        insight.category = line.replace('**Content Category:**', '').trim();
      } else if (line.startsWith('**Potential Post Type:**')) {
        insight.postType = line.replace('**Potential Post Type:**', '').trim();
      } else if (line.startsWith('**Relevance Score')) {
        currentField = 'scores';
      } else if (line.startsWith('**Initial Hooks')) {
        currentField = 'hooks';
      } else if (line.startsWith('- **Total Score:**')) {
        const scoreMatch = line.match(/(\d+)/);
        if (scoreMatch && scoreMatch[1] && insight.scores) {
          insight.scores.total = parseInt(scoreMatch[1]);
        }
      } else if (currentField === 'quote' && line.startsWith('>')) {
        insight.quote = (insight.quote || '') + line.replace('>', '').trim() + ' ';
      } else if (currentField === 'summary' && !line.startsWith('**') && !line.startsWith('-')) {
        insight.summary = (insight.summary || '') + line + ' ';
      } else if (currentField === 'transformation') {
        if (line.startsWith('- **Before:**') && insight.beforeAfter) {
          insight.beforeAfter.before = line.replace('- **Before:**', '').trim();
        } else if (line.startsWith('- **After:**') && insight.beforeAfter) {
          insight.beforeAfter.after = line.replace('- **After:**', '').trim();
        } else if (line.startsWith('- **Metrics/Proof:**') && insight.beforeAfter) {
          insight.beforeAfter.metrics = line.replace('- **Metrics/Proof:**', '').trim();
        }
      } else if (currentField === 'scores' && insight.scores) {
        if (line.startsWith('- Urgency:')) {
          const match = line.match(/(\d+)/);
          if (match && match[1]) insight.scores.urgency = parseInt(match[1]);
        } else if (line.startsWith('- Relatability:')) {
          const match = line.match(/(\d+)/);
          if (match && match[1]) insight.scores.relatability = parseInt(match[1]);
        } else if (line.startsWith('- Specificity:')) {
          const match = line.match(/(\d+)/);
          if (match && match[1]) insight.scores.specificity = parseInt(match[1]);
        } else if (line.startsWith('- Authority:')) {
          const match = line.match(/(\d+)/);
          if (match && match[1]) insight.scores.authority = parseInt(match[1]);
        }
      } else if (currentField === 'hooks' && (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.'))) {
        insight.hooks?.push(line.replace(/^\d+\.\s*/, ''));
      }
    }

    // Calculate total score if individual scores were found
    if (insight.scores && (insight.scores.urgency > 0 || insight.scores.relatability > 0)) {
      insight.scores.total = insight.scores.urgency + insight.scores.relatability + 
                            insight.scores.specificity + insight.scores.authority;
    }

    if (insight.title && insight.quote) {
      return insight as Insight;
    }
    
    return null;
  }

  async createInsightPage(insight: Insight, sourceTranscriptId: string): Promise<void> {
    console.log(`Creating insight page: ${insight.title}`);
    
    const insightData = {
      title: insight.title,
      category: insight.category,
      postType: insight.postType,
      totalScore: insight.scores?.total,
      quote: insight.quote?.substring(0, 100) + '...',
      hooksCount: insight.hooks?.length,
      fullInsight: insight
    };
    
    console.log(`📋 Insight data:`, insightData);
    
    // Save insight being created to file
    const timestamp = Date.now();
    writeFileSync(join('debug', `debug-5-creating-insight-${timestamp}.json`), JSON.stringify(insightData, null, 2));
    console.log(`💾 Saved insight creation data to debug/debug-5-creating-insight-${timestamp}.json`);
    
    await this.notion.pages.create({
      parent: {
        database_id: process.env.NOTION_INSIGHTS_DATABASE_ID || ''
      },
      properties: {
        'Title': {
          title: [
            {
              text: {
                content: insight.title
              }
            }
          ]
        },
        'Score': {
          number: insight.scores?.total || 0
        },
        'Post Type': {
          select: {
            name: insight.postType
          }
        },
        'Summary': {
          rich_text: [
            {
              text: {
                content: insight.summary || ''
              }
            }
          ]
        },
        'Verbatim Quote': {
          rich_text: [
            {
              text: {
                content: insight.quote || ''
              }
            }
          ]
        },
        'Status': {
          select: {
            name: 'Ready for Posts'
          }
        },
        'Transcript': {
          relation: [
            {
              id: sourceTranscriptId
            }
          ]
        }
      },
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'Initial Hooks'
                }
              }
            ]
          }
        },
        ...(insight.hooks || []).map((hook) => ({
          object: 'block' as const,
          type: 'numbered_list_item' as const,
          numbered_list_item: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: hook
                }
              }
            ]
          }
        }))
      ]
    });
  }

  async updateTranscriptStatus(transcriptId: string, status: string): Promise<void> {
    console.log(`Updating transcript ${transcriptId} status to: ${status}`);
    
    await this.notion.pages.update({
      page_id: transcriptId,
      properties: {
        'Status': {
          select: {
            name: status
          }
        }
      }
    });
  }

  async processTranscripts(testMode: boolean = false): Promise<void> {
    console.log('Starting transcript processing...');
    
    try {
      const pendingTranscripts = await this.getPendingTranscripts();
      console.log(`Found ${pendingTranscripts.length} transcripts to process`);

      // In test mode, process only the first transcript
      const transcriptsToProcess = testMode ? pendingTranscripts.slice(0, 1) : pendingTranscripts;
      
      if (testMode) {
        console.log('🧪 TEST MODE: Processing only the first transcript');
      }

      for (const transcript of transcriptsToProcess) {
        console.log(`\nProcessing transcript: ${transcript.title}`);
        
        try {
          const rawContent = await this.getPageContent(transcript.id);
          const cleanedContent = await this.cleanTranscript(rawContent);
          const insights = await this.extractInsights(cleanedContent);
          
          console.log(`Extracted ${insights.length} insights`);
          
          for (const insight of insights) {
            await this.createInsightPage(insight, transcript.id);
          }
          
          await this.updateTranscriptStatus(transcript.id, 'Done');
          console.log(`✅ Successfully processed: ${transcript.title}`);
          
        } catch (error) {
          console.error(`❌ Error processing transcript ${transcript.title}:`, error);
        }
      }
      
      console.log('\n🎉 Transcript processing completed!');
      
    } catch (error) {
      console.error('❌ Fatal error in transcript processing:', error);
      throw error;
    }
  }
}

async function main() {
  try {
    const processor = new TranscriptProcessor();
    
    // Check for test mode flag
    const testMode = process.argv.includes('--test') || process.argv.includes('-t');
    
    await processor.processTranscripts(testMode);
  } catch (error) {
    console.error('❌ Application error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}