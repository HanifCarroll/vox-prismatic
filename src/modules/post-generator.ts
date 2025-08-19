import { AppConfig, InsightPage, PostGenerationMetrics, Result } from '../lib/types.ts';
import { createNotionClient, insights, posts, getPageContent } from '../lib/notion.ts';
import { createAIClient, generatePosts } from '../lib/ai.ts';
import { saveToDebugFile, formatDuration, formatCost, formatNumber, createMetricsSummary } from '../lib/utils.ts';
import { display } from '../lib/io.ts';

/**
 * Functional post generation module
 */

/**
 * Gets full insight content from Notion page
 */
const getInsightContent = async (
  notionClient: any,
  insightId: string
): Promise<Result<string>> => {
  try {
    let content = '';
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response = await notionClient.blocks.children.list({
        block_id: insightId,
        start_cursor: startCursor,
        page_size: 100
      });

      for (const block of response.results) {
        const fullBlock = block as any;
        if (fullBlock.type === 'paragraph' && fullBlock.paragraph?.rich_text) {
          content += fullBlock.paragraph.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        } else if (fullBlock.type === 'quote' && fullBlock.quote?.rich_text) {
          content += '> ' + fullBlock.quote.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        } else if (fullBlock.type === 'numbered_list_item' && fullBlock.numbered_list_item?.rich_text) {
          content += '- ' + fullBlock.numbered_list_item.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;
    }

    return { success: true, data: content.trim() };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * Gets original transcript content for context
 */
const getTranscriptContent = async (
  notionClient: any,
  transcriptId: string
): Promise<Result<string>> => {
  if (!transcriptId) {
    return { success: true, data: '' };
  }
  
  try {
    let content = '';
    let hasMore = true;
    let startCursor: string | undefined;
    let totalBlocks = 0;

    // Handle pagination to get all blocks
    while (hasMore) {
      const response = await notionClient.blocks.children.list({
        block_id: transcriptId,
        start_cursor: startCursor,
        page_size: 100
      });
      
      totalBlocks += response.results.length;

      for (const block of response.results) {
        const fullBlock = block as any;
        if (fullBlock.type === 'paragraph' && fullBlock.paragraph?.rich_text) {
          content += fullBlock.paragraph.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        } else if (fullBlock.type === 'bulleted_list_item' && fullBlock.bulleted_list_item?.rich_text) {
          content += '• ' + fullBlock.bulleted_list_item.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        } else if (fullBlock.type === 'numbered_list_item' && fullBlock.numbered_list_item?.rich_text) {
          content += '1. ' + fullBlock.numbered_list_item.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;
    }

    console.log(`📝 Extracted ${formatNumber(content.length)} characters of transcript content (${totalBlocks} blocks)`);
    return { success: true, data: content };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * Generates posts for a single insight
 */
const generatePostsForInsight = async (
  insight: InsightPage,
  config: AppConfig
): Promise<PostGenerationMetrics> => {
  const startTime = Date.now();
  const notionClient = createNotionClient(config.notion);
  const { proModel } = createAIClient(config.ai);
  
  const metrics: PostGenerationMetrics = {
    insightId: insight.id,
    insightTitle: insight.title,
    startTime,
    contentLength: 0,
    estimatedTokensUsed: 0,
    estimatedCost: 0,
    success: false
  };

  try {
    console.log(`🤖 Generating posts for: "${insight.title}"`);
    
    // Get the full insight content
    const insightContentResult = await getInsightContent(notionClient, insight.id);
    const insightContent = insightContentResult.success ? insightContentResult.data : '';
    
    // Get the original transcript for context
    const transcriptContentResult = await getTranscriptContent(notionClient, insight.transcriptId || '');
    const transcriptContent = transcriptContentResult.success ? transcriptContentResult.data : '';
    
    // Generate posts using AI
    console.log('🚀 Sending to Gemini 2.5 Pro for post generation...');
    const postResult = await generatePosts(
      proModel,
      insightContent,
      transcriptContent,
      {
        title: insight.title,
        postType: insight.postType,
        score: insight.score,
        summary: insight.summary || '',
        verbatimQuote: insight.verbatimQuote || ''
      }
    );

    if (!postResult.success) {
      throw postResult.error;
    }

    const { posts: generatedPosts, duration, cost } = postResult.data;
    
    // Update metrics
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.contentLength = insightContent.length + transcriptContent.length;
    metrics.estimatedCost = cost;
    metrics.success = true;

    console.log(`⏱️  Post generation completed in ${formatDuration(duration)}`);
    console.log(`💰 Cost: ${formatCost(cost)}`);

    // Save AI response to debug
    saveToDebugFile('post-generation-response', {
      insightId: insight.id,
      insightTitle: insight.title,
      generatedPosts,
      metrics
    });

    // Create LinkedIn post
    console.log('📝 Creating LinkedIn post...');
    const linkedinResult = await posts.create(notionClient, config.notion, insight, generatedPosts, 'LinkedIn');
    if (!linkedinResult.success) {
      throw linkedinResult.error;
    }

    // Create X post  
    console.log('📝 Creating X post...');
    const xResult = await posts.create(notionClient, config.notion, insight, generatedPosts, 'X');
    if (!xResult.success) {
      throw xResult.error;
    }

    // Update insight status
    console.log('🔄 Updating insight status...');
    const statusResult = await insights.updateStatus(notionClient, insight.id, 'Posts Drafted');
    if (!statusResult.success) {
      console.log('⚠️ Failed to update insight status');
    }

    console.log(`✅ Successfully created posts for: "${insight.title}"`);
    return metrics;

  } catch (error) {
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.error = error instanceof Error ? error.message : 'Unknown error';
    
    display.error(`Failed to generate posts for "${insight.title}": ${metrics.error}`);
    return metrics;
  }
};

/**
 * Processes a batch of insights in parallel with controlled concurrency
 */
const processBatch = async (
  batchInsights: InsightPage[],
  config: AppConfig
): Promise<PostGenerationMetrics[]> => {
  console.log(`\n🔄 Processing batch of ${batchInsights.length} insight${batchInsights.length === 1 ? '' : 's'}...\n`);
  
  // Process with Promise.allSettled for resilient batch processing
  const batchPromises = batchInsights.map(insight => generatePostsForInsight(insight, config));
  const results = await Promise.allSettled(batchPromises);
  
  // Extract metrics from results
  const allMetrics: PostGenerationMetrics[] = [];
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allMetrics.push(result.value);
    } else {
      // Create failed metrics for rejected promises
      allMetrics.push({
        insightId: 'unknown',
        insightTitle: 'Failed Promise',
        startTime: Date.now(),
        contentLength: 0,
        estimatedTokensUsed: 0,
        estimatedCost: 0,
        success: false,
        error: result.reason?.message || 'Promise rejected'
      });
    }
  }
  
  return allMetrics;
};

/**
 * Displays session summary with metrics
 */
const displaySessionSummary = (allMetrics: PostGenerationMetrics[]): void => {
  if (allMetrics.length === 0) {
    return;
  }

  console.log('\n📊 POST GENERATION SESSION SUMMARY');
  display.separator();
  
  const successful = allMetrics.filter(m => m.success);
  const failed = allMetrics.filter(m => !m.success);
  const totalDuration = allMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
  const totalCost = allMetrics.reduce((sum, m) => sum + m.estimatedCost, 0);
  const totalTokens = allMetrics.reduce((sum, m) => sum + m.estimatedTokensUsed, 0);

  console.log(`📈 Results: ${successful.length} successful, ${failed.length} failed`);
  console.log(`⏱️  Total Duration: ${formatDuration(totalDuration)}`);
  console.log(`🪙 Total Tokens Used: ${formatNumber(totalTokens)}`);
  console.log(`💰 Total Estimated Cost: ${formatCost(totalCost)}`);

  if (successful.length > 0) {
    const avgDuration = totalDuration / successful.length;
    const avgCost = totalCost / successful.length;
    console.log(`📊 Averages per post: ${formatDuration(avgDuration)}, ${formatCost(avgCost)}`);
  }

  // Log failed insights if any
  if (failed.length > 0) {
    console.log('\n⚠️ Failed insights:');
    failed.forEach(metrics => {
      console.log(`  • ${metrics.insightTitle}: ${metrics.error}`);
    });
  }

  // Save session summary
  const sessionSummary = createMetricsSummary(allMetrics);
  saveToDebugFile('post-generation-session', sessionSummary);
  console.log(`💾 Saved post generation session summary to debug/`);
};

/**
 * Main post generator function
 */
export const runPostGenerator = async (
  config: AppConfig,
  batchSize: number = 3
): Promise<void> => {
  try {
    display.info('Starting post generation from insights...');
    
    const notionClient = createNotionClient(config.notion);
    
    // Get insights ready for posts
    const insightsResult = await insights.getReadyForPosts(notionClient, config.notion);
    if (!insightsResult.success) {
      throw insightsResult.error;
    }
    
    const readyInsights = insightsResult.data;
    
    if (readyInsights.length === 0) {
      display.success('No insights found with status "Ready for Posts"');
      return;
    }

    console.log(`📊 Found ${readyInsights.length} insight${readyInsights.length === 1 ? '' : 's'} ready for post generation`);
    readyInsights.forEach((insight, index) => {
      console.log(`  ${index + 1}. "${insight.title}" (Score: ${insight.score})`);
    });

    console.log(`\n⚡ Processing ${batchSize} insights in parallel`);

    // Process insights in batches
    const allMetrics: PostGenerationMetrics[] = [];
    
    for (let i = 0; i < readyInsights.length; i += batchSize) {
      const batch = readyInsights.slice(i, i + batchSize);
      console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} insights)`);
      
      const batchMetrics = await processBatch(batch, config);
      allMetrics.push(...batchMetrics);
      
      // Save individual metrics
      batchMetrics.forEach(metrics => {
        saveToDebugFile('post-generation-metrics', metrics);
      });
      
      // Small delay between batches to avoid rate limits
      if (i + batchSize < readyInsights.length) {
        console.log('⏸️  Brief pause between batches...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Display session summary
    displaySessionSummary(allMetrics);
    
    display.success('Post generation completed!');
    
  } catch (error) {
    display.error(`Fatal error in post generation: ${error}`);
    throw error;
  }
};