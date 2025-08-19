import { Client } from '@notionhq/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

type PostType = 'Problem' | 'Proof' | 'Framework' | 'Contrarian Take' | 'Mental Model';

interface InsightPage {
  id: string;
  title: string;
  score: number;
  status: string;
  postType: PostType | string; // Allow string for backward compatibility
  category?: string;
  summary?: string;
  verbatimQuote?: string;
  transcriptId?: string;
}

interface GeneratedPost {
  linkedinPost: string;
  xPost: string;
  softCTA: string;
  directCTA: string;
}

interface PostGenerationMetrics {
  insightId: string;
  insightTitle: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  contentLength: number;
  estimatedTokensUsed: number;
  estimatedCost: number;
  success: boolean;
  error?: string;
}

export class PostGenerator {
  private notion: Client;
  private genAI: GoogleGenerativeAI;
  private proModel: any;
  private sessionMetrics: PostGenerationMetrics[] = [];

  constructor() {
    if (!process.env.NOTION_API_KEY) {
      throw new Error('NOTION_API_KEY is required');
    }
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is required');
    }
    if (!process.env.NOTION_INSIGHTS_DATABASE_ID) {
      throw new Error('NOTION_INSIGHTS_DATABASE_ID is required');
    }
    if (!process.env.NOTION_POSTS_DATABASE_ID) {
      throw new Error('NOTION_POSTS_DATABASE_ID is required');
    }

    this.notion = new Client({ auth: process.env.NOTION_API_KEY });
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.proModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
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
   * Estimates cost for Gemini Pro model:
   * Pro: $1.25 per 1M input tokens, $5.00 per 1M output tokens
   */
  private estimateCost(inputTokens: number, outputTokens: number): number {
    const inputRate = 1.25 / 1000000;
    const outputRate = 5.00 / 1000000;
    return (inputTokens * inputRate) + (outputTokens * outputRate);
  }

  /**
   * Saves post generation metrics to debug file
   */
  private async savePostMetrics(metrics: PostGenerationMetrics): Promise<void> {
    this.sessionMetrics.push(metrics);
    
    // Save individual metrics to debug file
    const timestamp = Date.now();
    writeFileSync(
      join('debug', `post-generation-metrics-${timestamp}.json`), 
      JSON.stringify(metrics, null, 2)
    );
    
    console.log(`📊 Post Generation Summary:`);
    console.log(`  ⏱️ Duration: ${metrics.duration}ms (${(metrics.duration! / 1000).toFixed(1)}s)`);
    console.log(`  📝 Content Length: ${metrics.contentLength.toLocaleString()} chars`);
    console.log(`  🪙 Estimated Tokens: ${metrics.estimatedTokensUsed.toLocaleString()}`);
    console.log(`  💰 Estimated Cost: $${metrics.estimatedCost.toFixed(4)}`);
    console.log(`  ✅ Success: ${metrics.success ? 'Yes' : 'No'}`);
  }

  /**
   * Displays session-wide post generation summary
   */
  private displayPostSessionSummary(): void {
    if (this.sessionMetrics.length === 0) {
      console.log('\n📊 No post generation metrics available.');
      return;
    }

    console.log('\n📊 POST GENERATION SESSION SUMMARY');
    console.log('='.repeat(50));
    
    const successful = this.sessionMetrics.filter(m => m.success);
    const failed = this.sessionMetrics.filter(m => !m.success);
    const totalDuration = this.sessionMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const totalCost = this.sessionMetrics.reduce((sum, m) => sum + m.estimatedCost, 0);
    const totalTokens = this.sessionMetrics.reduce((sum, m) => sum + m.estimatedTokensUsed, 0);

    console.log(`📈 Results: ${successful.length} successful, ${failed.length} failed`);
    console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`🪙 Total Tokens Used: ${totalTokens.toLocaleString()}`);
    console.log(`💰 Total Estimated Cost: $${totalCost.toFixed(4)}`);

    if (successful.length > 0) {
      const avgDuration = totalDuration / successful.length;
      const avgCost = totalCost / successful.length;
      console.log(`📊 Averages per post: ${(avgDuration / 1000).toFixed(1)}s, $${avgCost.toFixed(4)}`);
    }

    // Save session summary
    const sessionSummary = {
      timestamp: new Date().toISOString(),
      totalPosts: this.sessionMetrics.length,
      successful: successful.length,
      failed: failed.length,
      totalDurationMs: totalDuration,
      totalCost: totalCost,
      totalTokens: totalTokens,
      metrics: this.sessionMetrics
    };

    writeFileSync(
      join('debug', `post-session-summary-${Date.now()}.json`), 
      JSON.stringify(sessionSummary, null, 2)
    );
    console.log(`💾 Saved post generation session summary to debug/`);
  }

  async getReadyInsights(): Promise<InsightPage[]> {
    console.log('🔍 Fetching insights ready for post generation...');
    
    const response = await this.notion.databases.query({
      database_id: process.env.NOTION_INSIGHTS_DATABASE_ID!,
      filter: {
        property: 'Status',
        select: {
          equals: 'Ready for Posts'
        }
      },
      sorts: [
        {
          property: 'Score',
          direction: 'descending'
        }
      ]
    });

    const insights = response.results.map((page: any) => ({
      id: page.id,
      title: page.properties.Title?.title?.[0]?.plain_text || 'Untitled',
      score: page.properties.Score?.number || 0,
      status: page.properties.Status?.select?.name || 'Unknown',
      postType: page.properties['Post Type']?.select?.name || 'Unknown',
      summary: page.properties.Summary?.rich_text?.[0]?.plain_text || '',
      verbatimQuote: page.properties['Verbatim Quote']?.rich_text?.[0]?.plain_text || '',
      transcriptId: page.properties.Transcript?.relation?.[0]?.id
    }));

    console.log(`📊 Found ${insights.length} insights ready for posts`);
    insights.forEach((insight, index) => {
      console.log(`  ${index + 1}. "${insight.title}" (Score: ${insight.score})`);
    });

    return insights;
  }

  async getInsightContent(insightId: string): Promise<string> {
    console.log(`📄 Fetching full content for insight: ${insightId}`);
    
    let content = '';
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response = await this.notion.blocks.children.list({
        block_id: insightId,
        start_cursor: startCursor,
        page_size: 100
      });

      for (const block of response.results) {
        const fullBlock = block as BlockObjectResponse;
        if (fullBlock.type === 'paragraph' && 'paragraph' in fullBlock && fullBlock.paragraph.rich_text) {
          content += fullBlock.paragraph.rich_text.map((text: any) => text.plain_text).join('') + '\\n';
        } else if (fullBlock.type === 'quote' && 'quote' in fullBlock && fullBlock.quote.rich_text) {
          content += '> ' + fullBlock.quote.rich_text.map((text: any) => text.plain_text).join('') + '\\n';
        } else if (fullBlock.type === 'numbered_list_item' && 'numbered_list_item' in fullBlock && fullBlock.numbered_list_item.rich_text) {
          content += '- ' + fullBlock.numbered_list_item.rich_text.map((text: any) => text.plain_text).join('') + '\\n';
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;
    }

    console.log(`📝 Extracted ${content.length} characters of insight content`);
    return content;
  }

  async getTranscriptContent(transcriptId: string): Promise<string> {
    if (!transcriptId) {
      console.log(`⚠️ No transcript ID provided`);
      return '';
    }
    
    console.log(`📄 Fetching original transcript content: ${transcriptId}`);
    
    let content = '';
    let hasMore = true;
    let startCursor: string | undefined;
    let totalBlocks = 0;

    // Handle pagination to get all blocks
    while (hasMore) {
      const response = await this.notion.blocks.children.list({
        block_id: transcriptId,
        start_cursor: startCursor,
        page_size: 100
      });
      
      totalBlocks += response.results.length;

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


    console.log(`📝 Extracted ${content.length} characters of transcript content (${totalBlocks} blocks)`);
    return content;
  }

  async generatePosts(insight: InsightPage): Promise<{ posts: GeneratedPost, metrics: PostGenerationMetrics }> {
    console.log(`🤖 Generating posts for: "${insight.title}"`);
    
    const metrics: PostGenerationMetrics = {
      insightId: insight.id,
      insightTitle: insight.title,
      startTime: Date.now(),
      contentLength: 0,
      estimatedTokensUsed: 0,
      estimatedCost: 0,
      success: false
    };
    
    // Get the full insight content including hooks
    const fullContent = await this.getInsightContent(insight.id);
    
    // Get the original transcript for richer context
    const transcriptContent = await this.getTranscriptContent(insight.transcriptId || '');
    
    // Load external prompt template
    const promptTemplate = readFileSync(join('prompts', 'generate-posts.md'), 'utf-8');
    const postGenerationPrompt = promptTemplate
      .replace('{{INSIGHT_TITLE}}', insight.title)
      .replace('{{POST_TYPE}}', insight.postType)
      .replace('{{SCORE}}', insight.score.toString())
      .replace('{{SUMMARY}}', insight.summary || '')
      .replace('{{VERBATIM_QUOTE}}', insight.verbatimQuote || '')
      .replace('{{FULL_CONTENT}}', fullContent)
      .replace('{{TRANSCRIPT_CONTENT}}', transcriptContent);

    // Track content length and estimate tokens
    metrics.contentLength = postGenerationPrompt.length + fullContent.length + transcriptContent.length;
    
    console.log('🚀 Sending to Gemini 2.5 Pro for post generation...');
    
    try {
      const result = await this.proModel.generateContent(postGenerationPrompt, {
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.3,
          responseMimeType: "application/json"
        }
      });
      const response = await result.response;
      const text = response.text();
      
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      
      // Get actual token counts from API if available
      let inputTokens = this.estimateTokens(postGenerationPrompt);
      let outputTokens = this.estimateTokens(text);
      
      if (result.response?.usageMetadata) {
        const metadata = result.response.usageMetadata;
        if (metadata.promptTokenCount) inputTokens = metadata.promptTokenCount;
        if (metadata.candidatesTokenCount) outputTokens = metadata.candidatesTokenCount;
        console.log(`🎯 Using actual token counts from API`);
      }
      
      metrics.estimatedTokensUsed = inputTokens + outputTokens;
      metrics.estimatedCost = this.estimateCost(inputTokens, outputTokens);
      metrics.success = true;
      
      console.log(`⏱️  Post generation completed in ${metrics.duration}ms`);
      console.log(`🪙 Tokens - Input: ${inputTokens.toLocaleString()}, Output: ${outputTokens.toLocaleString()}`);
      console.log(`💰 Cost: $${metrics.estimatedCost.toFixed(4)}`);
      
      // Save AI response to debug file
      writeFileSync(join('debug', `post-generation-${Date.now()}.json`), text);
      console.log('💾 Saved post generation response to debug folder');
      
      // Parse response - try JSON first, fall back to text parsing
      let posts: GeneratedPost;
      try {
        // Remove markdown code block wrapping if present
        let cleanedText = text.trim();
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const jsonResponse = JSON.parse(cleanedText);
        posts = {
          linkedinPost: jsonResponse.linkedinPost || 'Failed to generate LinkedIn post',
          xPost: jsonResponse.xPost || 'Failed to generate X post',
          softCTA: jsonResponse.softCTA || 'What\'s your experience with this?',
          directCTA: jsonResponse.directCTA || 'Need help with this? Let\'s talk.'
        };
        console.log('✅ Successfully parsed JSON response');
      } catch (jsonError) {
        console.log('⚠️ JSON parsing failed, falling back to text parsing');
        console.log('  JSON Error:', jsonError instanceof Error ? jsonError.message : 'Unknown error');
        posts = this.parsePosts(text);
      }
      
      return { posts, metrics };
      
    } catch (error) {
      console.error('❌ Error during post generation:', error);
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.error = error instanceof Error ? error.message : 'Unknown error';
      metrics.success = false;
      throw error;
    }
  }

  parsePosts(response: string): GeneratedPost {
    const linkedinMatch = response.match(/---LINKEDIN POST---(.*?)(?:\*\*Soft CTA:\*\*|---X POST---|$)/s);
    const softCTAMatch = response.match(/\*\*Soft CTA:\*\*(.*?)(?:\*\*Direct CTA:\*\*|---X POST---|$)/s);
    const directCTAMatch = response.match(/\*\*Direct CTA:\*\*(.*?)(?:---X POST---|$)/s);
    const xPostMatch = response.match(/---X POST---(.*?)(?:---END---|$)/s);

    return {
      linkedinPost: linkedinMatch?.[1]?.trim() || 'Failed to parse LinkedIn post',
      xPost: xPostMatch?.[1]?.trim() || 'Failed to parse X post',
      softCTA: softCTAMatch?.[1]?.trim() || 'What\'s your experience with this?',
      directCTA: directCTAMatch?.[1]?.trim() || 'Need help with this? Let\'s talk.'
    };
  }

  async createPostPage(insight: InsightPage, generatedPost: GeneratedPost, platform: 'LinkedIn' | 'X'): Promise<void> {
    const postContent = platform === 'LinkedIn' ? generatedPost.linkedinPost : generatedPost.xPost;
    const title = `${platform === 'LinkedIn' ? 'LI' : 'X'} - ${insight.title}`;
    
    console.log(`📝 Creating ${platform} post: "${title}"`);
    
    await this.notion.pages.create({
      parent: {
        database_id: process.env.NOTION_POSTS_DATABASE_ID!
      },
      properties: {
        'Title': {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        },
        'Platform': {
          select: {
            name: platform
          }
        },
        'Status': {
          select: {
            name: 'Needs Review'
          }
        },
        'Source Insight': {
          relation: [
            {
              id: insight.id
            }
          ]
        }
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: postContent
                }
              }
            ]
          }
        },
        ...(platform === 'LinkedIn' ? [
          {
            object: 'block' as const,
            type: 'heading_3' as const,
            heading_3: {
              rich_text: [
                {
                  type: 'text' as const,
                  text: {
                    content: 'Call to Action Options'
                  }
                }
              ]
            }
          },
          {
            object: 'block' as const,
            type: 'paragraph' as const,
            paragraph: {
              rich_text: [
                {
                  type: 'text' as const,
                  text: {
                    content: `**Soft CTA:** ${generatedPost.softCTA}`
                  }
                }
              ]
            }
          },
          {
            object: 'block' as const,
            type: 'paragraph' as const,
            paragraph: {
              rich_text: [
                {
                  type: 'text' as const,
                  text: {
                    content: `**Direct CTA:** ${generatedPost.directCTA}`
                  }
                }
              ]
            }
          }
        ] : [])
      ]
    });
  }

  async updateInsightStatus(insightId: string, status: string): Promise<void> {
    console.log(`🔄 Updating insight status to: ${status}`);
    
    await this.notion.pages.update({
      page_id: insightId,
      properties: {
        'Status': {
          select: {
            name: status
          }
        }
      }
    });
  }

  async processInsightBatch(insights: InsightPage[]): Promise<void> {
    const batchPromises = insights.map(async (insight) => {
      console.log(`📋 Processing insight: "${insight.title}"`);
      
      try {
        const batchStartTime = Date.now();
        const result = await this.generatePosts(insight);
        
        // Save post generation metrics
        await this.savePostMetrics(result.metrics);
        
        // Create LinkedIn post
        await this.createPostPage(insight, result.posts, 'LinkedIn');
        
        // Create X post  
        await this.createPostPage(insight, result.posts, 'X');
        
        // Update insight status
        await this.updateInsightStatus(insight.id, 'Posts Drafted');
        
        const batchDuration = Date.now() - batchStartTime;
        console.log(`✅ Successfully created posts for: "${insight.title}" (${batchDuration}ms total)`);
        
        return { success: true, insight: insight.title, duration: batchDuration, cost: result.metrics.estimatedCost };
        
      } catch (error) {
        console.error(`❌ Error processing insight "${insight.title}":`, error);
        return { success: false, insight: insight.title, error: error instanceof Error ? error.message : 'Unknown error', cost: 0 };
      }
    });

    const results = await Promise.allSettled(batchPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    const totalDuration = results.reduce((sum, r) => {
      if (r.status === 'fulfilled' && r.value.success) {
        return sum + (r.value.duration || 0);
      }
      return sum;
    }, 0);
    const totalCost = results.reduce((sum, r) => {
      if (r.status === 'fulfilled' && r.value.success) {
        return sum + (r.value.cost || 0);
      }
      return sum;
    }, 0);
    
    // Log failed insights if any
    const failedInsights = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
    if (failedInsights.length > 0) {
      console.log('\n⚠️ Failed insights:');
      failedInsights.forEach((result) => {
        if (result.status === 'rejected') {
          console.log(`  • Promise rejected: ${result.reason}`);
        } else if (result.status === 'fulfilled' && !result.value.success) {
          console.log(`  • ${result.value.insight}: ${result.value.error}`);
        }
      });
    }
    
    console.log(`\n📊 Batch Results: ${successful} successful, ${failed} failed`);
    console.log(`  ⏱️ Total Duration: ${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)`);
    console.log(`  💰 Total Cost: $${totalCost.toFixed(4)}`);
  }

  async generatePostsFromInsights(testMode: boolean = false, batchSize: number = 3): Promise<void> {
    console.log('🚀 Starting post generation from insights...');
    
    try {
      const readyInsights = await this.getReadyInsights();
      
      if (readyInsights.length === 0) {
        console.log('❌ No insights found with status "Ready for Posts"');
        return;
      }

      let insightsToProcess = readyInsights;
      
      if (testMode) {
        insightsToProcess = readyInsights.slice(0, 1);
        console.log('🧪 TEST MODE: Processing only the highest-scoring insight');
      } else {
        console.log(`⚡ BATCH MODE: Processing ${batchSize} insights in parallel`);
      }

      // Process insights in batches
      for (let i = 0; i < insightsToProcess.length; i += batchSize) {
        const batch = insightsToProcess.slice(i, i + batchSize);
        console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} insights)`);
        
        await this.processInsightBatch(batch);
        
        // Small delay between batches to avoid rate limits
        if (i + batchSize < insightsToProcess.length) {
          console.log('⏸️  Brief pause between batches...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Display session summary
      this.displayPostSessionSummary();
      
      console.log('\n🎉 Post generation completed!');
      
    } catch (error) {
      console.error('❌ Fatal error in post generation:', error);
      throw error;
    }
  }
}

async function main() {
  try {
    const generator = new PostGenerator();
    
    // Check for test mode flag
    const testMode = process.argv.includes('--test') || process.argv.includes('-t');
    
    // Check for batch size parameter
    let batchSize = 3; // default
    const batchIndex = process.argv.findIndex(arg => arg === '--batch' || arg === '-b');
    if (batchIndex !== -1 && process.argv[batchIndex + 1]) {
      batchSize = parseInt(process.argv[batchIndex + 1]) || 3;
      console.log(`📦 Using custom batch size: ${batchSize}`);
    }
    
    await generator.generatePostsFromInsights(testMode, batchSize);
  } catch (error) {
    console.error('❌ Application error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}