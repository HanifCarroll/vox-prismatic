import { Client } from '@notionhq/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

interface TranscriptPage {
  id: string;
  title: string;
  status: string;
}

type PostType = 'Problem' | 'Proof' | 'Framework' | 'Contrarian Take' | 'Mental Model';

interface Insight {
  title: string;
  quote: string;
  summary: string;
  category: string;
  scores: {
    urgency: number;
    relatability: number;
    specificity: number;
    authority: number;
    total: number;
  };
  postType: PostType | string; // Allow string for backward compatibility
  hooks: string[];
}

interface ProcessingMetrics {
  transcriptId: string;
  transcriptTitle: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  contentLength: number;
  cleaningDuration: number;
  insightExtractionDuration: number;
  insightsGenerated: number;
  estimatedTokensUsed: number;
  estimatedCost: number;
  success: boolean;
  error?: string;
}

class TranscriptProcessor {
  private notion: Client;
  private genAI: GoogleGenerativeAI;
  private flashModel: any;
  private proModel: any;
  private processingMetrics: ProcessingMetrics[] = [];
  private rl: readline.Interface;

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
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Create debug folder if it doesn't exist
    try {
      mkdirSync('debug', { recursive: true });
    } catch (error) {
      // Folder already exists, ignore
    }
  }

  /**
   * Estimates token usage based on text length (rough approximation: 4 characters ≈ 1 token)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimates cost based on Gemini pricing (as of 2024):
   * Flash: $0.075 per 1M input tokens, $0.30 per 1M output tokens
   * Pro: $1.25 per 1M input tokens, $5.00 per 1M output tokens
   */
  private estimateCost(inputTokens: number, outputTokens: number, model: 'flash' | 'pro'): number {
    const pricing = {
      flash: { input: 0.075 / 1000000, output: 0.30 / 1000000 },
      pro: { input: 1.25 / 1000000, output: 5.00 / 1000000 }
    };
    
    const rates = pricing[model];
    return (inputTokens * rates.input) + (outputTokens * rates.output);
  }

  /**
   * Saves processing metrics to both debug file and potentially Notion database
   */
  private async saveProcessingMetrics(metrics: ProcessingMetrics): Promise<void> {
    this.processingMetrics.push(metrics);
    
    // Save to debug file
    const timestamp = Date.now();
    writeFileSync(
      join('debug', `processing-metrics-${timestamp}.json`), 
      JSON.stringify(metrics, null, 2)
    );
    
    console.log(`💾 Saved processing metrics to debug/processing-metrics-${timestamp}.json`);
    
    // Display key metrics
    console.log(`📊 Processing Summary:`);
    console.log(`  ⏱️ Total Duration: ${metrics.duration}ms (${(metrics.duration! / 1000).toFixed(1)}s)`);
    console.log(`  🧹 Cleaning Duration: ${metrics.cleaningDuration}ms`);
    console.log(`  ⚡ Insight Extraction: ${metrics.insightExtractionDuration}ms`);
    console.log(`  📝 Content Length: ${metrics.contentLength.toLocaleString()} chars`);
    console.log(`  💡 Insights Generated: ${metrics.insightsGenerated}`);
    console.log(`  🪙 Estimated Tokens: ${metrics.estimatedTokensUsed.toLocaleString()}`);
    console.log(`  💰 Estimated Cost: $${metrics.estimatedCost.toFixed(4)}`);
  }

  /**
   * Displays comprehensive session-wide processing summary
   */
  private displaySessionSummary(): void {
    if (this.processingMetrics.length === 0) {
      console.log('\n📊 No processing metrics available.');
      return;
    }

    console.log('\n📊 SESSION PROCESSING SUMMARY');
    console.log('='.repeat(50));
    
    const successful = this.processingMetrics.filter(m => m.success);
    const failed = this.processingMetrics.filter(m => !m.success);
    const totalDuration = this.processingMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const totalCost = this.processingMetrics.reduce((sum, m) => sum + m.estimatedCost, 0);
    const totalInsights = this.processingMetrics.reduce((sum, m) => sum + m.insightsGenerated, 0);
    const totalTokens = this.processingMetrics.reduce((sum, m) => sum + m.estimatedTokensUsed, 0);
    const totalContentLength = this.processingMetrics.reduce((sum, m) => sum + m.contentLength, 0);

    console.log(`📈 Results: ${successful.length} successful, ${failed.length} failed`);
    console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(1)}s (${(totalDuration / 1000 / 60).toFixed(1)} minutes)`);
    console.log(`📝 Total Content Processed: ${totalContentLength.toLocaleString()} characters`);
    console.log(`💡 Total Insights Generated: ${totalInsights}`);
    console.log(`🪙 Total Tokens Used: ${totalTokens.toLocaleString()}`);
    console.log(`💰 Total Estimated Cost: $${totalCost.toFixed(4)}`);

    if (successful.length > 0) {
      const avgDuration = totalDuration / successful.length;
      const avgCost = totalCost / successful.length;
      const avgInsights = totalInsights / successful.length;
      console.log(`📊 Averages per transcript: ${(avgDuration / 1000).toFixed(1)}s, $${avgCost.toFixed(4)}, ${avgInsights.toFixed(1)} insights`);
    }

    if (failed.length > 0) {
      console.log(`\n❌ Failed transcripts:`);
      failed.forEach(m => {
        console.log(`  • ${m.transcriptTitle}: ${m.error}`);
      });
    }

    // Cost efficiency analysis
    if (totalInsights > 0) {
      console.log(`\n💡 Cost per insight: $${(totalCost / totalInsights).toFixed(4)}`);
    }

    // Save session summary to file
    const sessionSummary = {
      timestamp: new Date().toISOString(),
      totalTranscripts: this.processingMetrics.length,
      successful: successful.length,
      failed: failed.length,
      totalDurationMs: totalDuration,
      totalCost: totalCost,
      totalInsights: totalInsights,
      totalTokens: totalTokens,
      totalContentLength: totalContentLength,
      averagesPerTranscript: successful.length > 0 ? {
        durationMs: totalDuration / successful.length,
        cost: totalCost / successful.length,
        insights: totalInsights / successful.length
      } : null,
      metrics: this.processingMetrics
    };

    writeFileSync(
      join('debug', `session-summary-${Date.now()}.json`), 
      JSON.stringify(sessionSummary, null, 2)
    );
    console.log(`💾 Saved session summary to debug/session-summary-${Date.now()}.json`);
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

  async cleanTranscript(transcriptContent: string): Promise<{ cleanedText: string, duration: number, cost: number }> {
    console.log('Cleaning transcript...');
    console.log(`📏 Input transcript length: ${transcriptContent.length} characters`);
    
    // For very long transcripts, truncate to avoid timeout
    const maxLength = 100000; // ~100k chars should be manageable
    let processContent = transcriptContent;
    
    if (transcriptContent.length > maxLength) {
      console.log(`⚠️  Transcript too long (${transcriptContent.length} chars), truncating to ${maxLength} chars`);
      processContent = transcriptContent.substring(0, maxLength) + '\n\n[Content truncated for processing]';
    }
    
    // Load external prompt
    const promptTemplate = readFileSync(join('prompts', 'clean-transcript.md'), 'utf-8');
    const cleaningPrompt = promptTemplate.replace('{{TRANSCRIPT_CONTENT}}', processContent);

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
      
      // Get actual token counts from API if available
      let inputTokens = this.estimateTokens(cleaningPrompt);
      let outputTokens = this.estimateTokens(cleanedText);
      
      // Check for actual token counts in the response metadata
      if (result.response?.usageMetadata) {
        const metadata = result.response.usageMetadata;
        if (metadata.promptTokenCount) inputTokens = metadata.promptTokenCount;
        if (metadata.candidatesTokenCount) outputTokens = metadata.candidatesTokenCount;
        console.log(`🎯 Using actual token counts from API`);
      }
      
      const cost = this.estimateCost(inputTokens, outputTokens, 'flash');
      
      console.log(`⏱️  Cleaning completed in ${duration}ms`);
      console.log(`🧹 Cleaned content length: ${cleanedText.length} characters`);
      console.log(`🧹 Cleaned preview: ${cleanedText.substring(0, 200)}...`);
      console.log(`🪙 Estimated tokens - Input: ${inputTokens.toLocaleString()}, Output: ${outputTokens.toLocaleString()}`);
      console.log(`💰 Estimated cost: $${cost.toFixed(4)}`);
      
      // Save cleaned content to file
      writeFileSync(join('debug', 'debug-2-cleaned-content.txt'), cleanedText);
      console.log('💾 Saved cleaned content to debug/debug-2-cleaned-content.txt');
      
      return { cleanedText, duration, cost };
      
    } catch (error) {
      console.error('❌ Error during transcript cleaning:', error);
      console.log('⏭️  Falling back to original transcript');
      const duration = Date.now() - startTime;
      return { cleanedText: transcriptContent, duration, cost: 0 }; // Fallback to original if cleaning fails
    }
  }

  async extractInsights(transcriptContent: string): Promise<{ insights: Insight[], duration: number, cost: number }> {
    console.log('Extracting insights using Gemini AI...');
    const startTime = Date.now();
    
    // Load external prompt
    const promptTemplate = readFileSync(join('prompts', 'extract-insights.md'), 'utf-8');
    const prompt = promptTemplate.replace('{{TRANSCRIPT_CONTENT}}', transcriptContent);

    try {
      const result = await this.proModel.generateContent(prompt, {
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      });
      const response = await result.response;
      const text = response.text();
      
      const duration = Date.now() - startTime;
      
      // Get actual token counts from API if available
      let inputTokens = this.estimateTokens(prompt);
      let outputTokens = this.estimateTokens(text);
      
      if (result.response?.usageMetadata) {
        const metadata = result.response.usageMetadata;
        if (metadata.promptTokenCount) inputTokens = metadata.promptTokenCount;
        if (metadata.candidatesTokenCount) outputTokens = metadata.candidatesTokenCount;
        console.log(`🎯 Using actual token counts from API`);
      }
      
      const cost = this.estimateCost(inputTokens, outputTokens, 'pro');
      
      console.log(`⏱️ Insight extraction completed in ${duration}ms`);
      console.log(`🤖 AI response length: ${text.length} characters`);
      console.log(`🪙 Tokens - Input: ${inputTokens.toLocaleString()}, Output: ${outputTokens.toLocaleString()}`);
      console.log(`💰 Cost: $${cost.toFixed(4)}`);
      
      // Save AI response to file
      writeFileSync(join('debug', 'debug-3-ai-response.json'), text);
      console.log('💾 Saved AI response to debug/debug-3-ai-response.json');
      
      // Parse JSON response (handle markdown wrapping)
      let insights: Insight[] = [];
      try {
        // Remove markdown code block wrapping if present
        let cleanedText = text.trim();
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const jsonResponse = JSON.parse(cleanedText);
        insights = this.parseJsonInsights(jsonResponse);
        console.log('✅ Successfully parsed JSON response');
      } catch (jsonError) {
        console.log('⚠️ JSON parsing failed, falling back to text parsing');
        console.log('  JSON Error:', jsonError instanceof Error ? jsonError.message : 'Unknown error');
        insights = this.parseInsights(text);
      }
      
      console.log(`⛏️ Parsed ${insights.length} insights from AI response`);
      
      // Save parsed insights to file
      writeFileSync(join('debug', 'debug-4-parsed-insights.json'), JSON.stringify(insights, null, 2));
      console.log('💾 Saved parsed insights to debug/debug-4-parsed-insights.json');
      
      return { insights, duration, cost };
      
    } catch (error) {
      console.error('❌ Error during insight extraction:', error);
      const duration = Date.now() - startTime;
      return { insights: [], duration, cost: 0 };
    }
  }

  parseJsonInsights(jsonResponse: any): Insight[] {
    const insights: Insight[] = [];
    
    if (!jsonResponse.insights || !Array.isArray(jsonResponse.insights)) {
      console.log('⚠️ Invalid JSON structure, no insights array found');
      return insights;
    }
    
    for (const item of jsonResponse.insights) {
      const insight: Insight = {
        title: item.title || 'Untitled',
        quote: item.verbatimQuote || '',
        summary: item.summary || '',
        category: item.category || 'Unknown',
        scores: {
          urgency: item.scores?.urgency || 0,
          relatability: item.scores?.relatability || 0,
          specificity: item.scores?.specificity || 0,
          authority: item.scores?.authority || 0,
          total: item.scores?.total || 0
        },
        postType: item.postType || 'Unknown',
        hooks: item.hooks || []
      };
      
      // Calculate total score if not provided
      if (!insight.scores.total) {
        insight.scores.total = insight.scores.urgency + insight.scores.relatability +
                              insight.scores.specificity + insight.scores.authority;
      }
      
      if (insight.title && insight.quote) {
        console.log(`✅ Successfully parsed insight: "${insight.title}"`);
        insights.push(insight);
      }
    }
    
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
            name: 'Needs Review'
          }
        },
        'Transcript': {
          relation: [
            {
              id: sourceTranscriptId
            }
          ]
        },
        'Hooks': {
          rich_text: [
            {
              text: {
                content: (insight.hooks || []).map((hook, index) => `${index + 1}. ${hook}`).join('\n')
              }
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

  async askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async selectTranscriptsToProcess(availableTranscripts: TranscriptPage[]): Promise<TranscriptPage[]> {
    if (availableTranscripts.length === 0) {
      console.log('No transcripts available for processing.');
      return [];
    }

    console.log('\n📋 Available Transcripts:');
    console.log('─'.repeat(60));
    
    availableTranscripts.forEach((transcript, index) => {
      console.log(`${index + 1}. ${transcript.title}`);
    });
    
    console.log('\nSelection Options:');
    console.log('[A] Process ALL transcripts');
    console.log('[1-N] Process specific transcript by number');
    console.log('[1,3,5] Process multiple transcripts (comma-separated)');
    console.log('[Q] Quit without processing');
    
    const choice = await this.askQuestion('\nYour choice: ');
    
    if (choice.toLowerCase() === 'q') {
      return [];
    }
    
    if (choice.toLowerCase() === 'a') {
      console.log(`\n✅ Selected ALL ${availableTranscripts.length} transcripts for processing`);
      return availableTranscripts;
    }
    
    // Handle comma-separated list or single number
    const numbers = choice.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    
    if (numbers.length === 0) {
      console.log('❌ Invalid selection. No transcripts selected.');
      return [];
    }
    
    const selectedTranscripts: TranscriptPage[] = [];
    
    for (const num of numbers) {
      if (num >= 1 && num <= availableTranscripts.length) {
        selectedTranscripts.push(availableTranscripts[num - 1]);
      } else {
        console.log(`⚠️ Invalid transcript number: ${num} (max: ${availableTranscripts.length})`);
      }
    }
    
    if (selectedTranscripts.length > 0) {
      console.log(`\n✅ Selected ${selectedTranscripts.length} transcript${selectedTranscripts.length === 1 ? '' : 's'} for processing:`);
      selectedTranscripts.forEach(t => console.log(`  • ${t.title}`));
    } else {
      console.log('❌ No valid transcripts selected.');
    }
    
    return selectedTranscripts;
  }

  async processTranscriptsInteractive(): Promise<void> {
    console.log('🚀 Starting interactive transcript processing...');
    
    try {
      const pendingTranscripts = await this.getPendingTranscripts();
      
      if (pendingTranscripts.length === 0) {
        console.log('✅ No transcripts need processing! All transcripts are up to date.');
        return;
      }
      
      console.log(`📊 Found ${pendingTranscripts.length} transcript${pendingTranscripts.length === 1 ? '' : 's'} ready for processing`);
      
      const selectedTranscripts = await this.selectTranscriptsToProcess(pendingTranscripts);
      
      if (selectedTranscripts.length === 0) {
        console.log('👋 Exiting without processing any transcripts.');
        return;
      }

      await this.processSelectedTranscripts(selectedTranscripts);
      
    } catch (error) {
      console.error('❌ Error during transcript processing:', error);
      throw error;
    }
  }

  async processSelectedTranscripts(transcriptsToProcess: TranscriptPage[]): Promise<void> {
    console.log(`\n🔄 Processing ${transcriptsToProcess.length} selected transcript${transcriptsToProcess.length === 1 ? '' : 's'}...\n`);
    
    try {
      for (const transcript of transcriptsToProcess) {
        console.log(`\n🚀 Processing transcript: ${transcript.title}`);
        
        const metrics: ProcessingMetrics = {
          transcriptId: transcript.id,
          transcriptTitle: transcript.title,
          startTime: Date.now(),
          contentLength: 0,
          cleaningDuration: 0,
          insightExtractionDuration: 0,
          insightsGenerated: 0,
          estimatedTokensUsed: 0,
          estimatedCost: 0,
          success: false
        };
        
        try {
          const rawContent = await this.getPageContent(transcript.id);
          metrics.contentLength = rawContent.length;
          
          const cleaningResult = await this.cleanTranscript(rawContent);
          metrics.cleaningDuration = cleaningResult.duration;
          
          const insightResult = await this.extractInsights(cleaningResult.cleanedText);
          metrics.insightExtractionDuration = insightResult.duration;
          metrics.insightsGenerated = insightResult.insights.length;
          
          // Calculate total cost and estimated tokens
          metrics.estimatedCost = cleaningResult.cost + insightResult.cost;
          metrics.estimatedTokensUsed = this.estimateTokens(rawContent) + this.estimateTokens(cleaningResult.cleanedText);
          
          console.log(`💡 Extracted ${insightResult.insights.length} insights`);
          
          for (const insight of insightResult.insights) {
            await this.createInsightPage(insight, transcript.id);
          }
          
          await this.updateTranscriptStatus(transcript.id, 'Done');
          
          metrics.endTime = Date.now();
          metrics.duration = metrics.endTime - metrics.startTime;
          metrics.success = true;
          
          console.log(`✅ Successfully processed: ${transcript.title}`);
          
          // Save comprehensive metrics
          await this.saveProcessingMetrics(metrics);
          
        } catch (error) {
          console.error(`❌ Error processing transcript ${transcript.title}:`, error);
          metrics.endTime = Date.now();
          metrics.duration = metrics.endTime - metrics.startTime;
          metrics.error = error instanceof Error ? error.message : 'Unknown error';
          metrics.success = false;
          
          await this.saveProcessingMetrics(metrics);
        }
      }
      
      // Display session summary
      this.displaySessionSummary();
      
      console.log('\n🎉 Transcript processing completed!');
      
    } catch (error) {
      console.error('❌ Fatal error in transcript processing:', error);
      throw error;
    }
  }

  close(): void {
    this.rl.close();
  }
}

export async function runTranscriptProcessor(): Promise<void> {
  const processor = new TranscriptProcessor();
  
  try {
    await processor.processTranscriptsInteractive();
  } catch (error) {
    console.error('❌ Application error:', error);
    throw error;
  } finally {
    processor.close();
  }
}

async function main() {
  try {
    await runTranscriptProcessor();
  } catch (error) {
    console.error('❌ Application error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}