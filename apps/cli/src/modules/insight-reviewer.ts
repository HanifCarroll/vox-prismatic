import prompts from 'prompts';
import { AppConfig, InsightPage, Result } from '@content-creation/shared';
import { createNotionClient, insights, getPageContent } from '@content-creation/notion';
import { display } from '@content-creation/content-pipeline';
import { createReviewSession, recordReviewDecision, endReviewSession } from '@content-creation/shared';

/**
 * Functional insight review module
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
        } else if (fullBlock.type === 'heading_2' && fullBlock.heading_2?.rich_text) {
          content += '\n## ' + fullBlock.heading_2.rich_text.map((text: any) => text.plain_text).join('') + '\n';
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
 * Displays a single insight for review
 */
const displayInsightForReview = (
  insight: InsightPage & { content: string },
  currentIndex: number,
  totalInsights: number
): void => {
  console.clear();
  console.log(`📋 REVIEWING INSIGHT ${currentIndex + 1}/${totalInsights}`);
  console.log();
  console.log(`Title: ${insight.title}`);
  console.log(`Score: ${insight.score}/20`);
  console.log(`Post Type: ${insight.postType}`);
  console.log();
  
  display.separator();
  console.log('CONTENT:');
  display.line();
  console.log(insight.content);
  
  display.separator();
  console.log();
};

/**
 * Gets hooks content from insight
 */
const getInsightHooks = async (
  notionClient: any,
  insightId: string
): Promise<string> => {
  try {
    const insight = await notionClient.pages.retrieve({ page_id: insightId });
    const insightData = insight as any;
    return insightData.properties.Hooks?.rich_text?.[0]?.plain_text || '';
  } catch (error) {
    return '';
  }
};

/**
 * Preloads insight content and hooks in parallel
 */
const preloadInsightData = async (
  notionClient: any,
  insight: InsightPage
): Promise<{ content: string; hooks: string }> => {
  try {
    // Run content and hooks fetching in parallel
    const [contentResult, hooks] = await Promise.all([
      getInsightContent(notionClient, insight.id),
      getInsightHooks(notionClient, insight.id)
    ]);
    
    return {
      content: contentResult.success ? contentResult.data : 'Failed to load content',
      hooks
    };
  } catch (error) {
    return {
      content: 'Failed to load content',
      hooks: ''
    };
  }
};

/**
 * Reviews a batch of insights interactively with parallel preloading and navigation
 */
const reviewInsightsBatch = async (
  insightsToReview: InsightPage[],
  config: AppConfig
): Promise<{ approved: number; rejected: number; skipped: number }> => {
  const notionClient = createNotionClient(config.notion);
  
  let approved = 0;
  let rejected = 0;
  let skipped = 0;

  try {
    // Create analytics session
    const sessionId = createReviewSession('insight');
    
    // Cache for preloaded insight data
    const insightCache = new Map<string, { content: string; hooks: string }>();
    
    // Preload first insight
    if (insightsToReview.length > 0) {
      const firstData = await preloadInsightData(notionClient, insightsToReview[0]);
      insightCache.set(insightsToReview[0].id, firstData);
    }
    
    let currentIndex = 0;
    
    while (currentIndex >= 0 && currentIndex < insightsToReview.length) {
      const insight = insightsToReview[currentIndex];
      
      // Preload next insight if not already cached
      if (currentIndex + 1 < insightsToReview.length) {
        const nextInsight = insightsToReview[currentIndex + 1];
        if (!insightCache.has(nextInsight.id)) {
          // Start preloading in background (don't await)
          preloadInsightData(notionClient, nextInsight).then(data => {
            insightCache.set(nextInsight.id, data);
          }).catch(() => {
            // Ignore preload errors - will load synchronously if needed
          });
        }
      }
      
      // Get current insight data from cache or load it
      let insightData = insightCache.get(insight.id);
      if (!insightData) {
        insightData = await preloadInsightData(notionClient, insight);
        insightCache.set(insight.id, insightData);
      }
      
      const insightWithContent = { ...insight, content: insightData.content, hooks: insightData.hooks };
      
      let reviewComplete = false;
      
      while (!reviewComplete) {
        displayInsightForReview(insightWithContent, currentIndex, insightsToReview.length);
        
        // Build choices dynamically based on position
        const choices = [
          {
            title: '✅ Approve',
            description: 'Mark as ready for post generation',
            value: 'approve'
          },
          {
            title: '❌ Reject', 
            description: 'Mark as rejected',
            value: 'reject'
          },
          {
            title: '⏭️  Skip',
            description: 'Skip for now (no status change)',
            value: 'skip'
          }
        ];
        
        // Add Previous option if not on first insight
        if (currentIndex > 0) {
          choices.push({
            title: '⬅️  Previous',
            description: 'Go back to previous insight',
            value: 'previous'
          });
        }
        
        choices.push({
          title: '❌ Exit Review',
          description: 'Stop reviewing and return to main menu',
          value: 'quit'
        });
        
        const response = await prompts({
          type: 'select',
          name: 'action',
          message: 'What would you like to do with this insight?',
          choices,
          initial: 0
        });
        
        // Handle user cancellation (Ctrl+C or ESC)
        if (!response.action) {
          console.log('\n👋 Exiting review process...');
          return { approved, rejected, skipped };
        }
        
        switch (response.action) {
          case 'approve':
            console.log('\n✅ Approving insight...');
            const approveResult = await insights.updateStatus(notionClient, insight.id, 'Ready for Posts');
            if (approveResult.success) {
              display.success('Insight approved and ready for post generation!');
              approved++;
              // Record analytics
              recordReviewDecision(sessionId, 'insight', {
                id: insight.id,
                title: insight.title,
                action: 'approved',
                timestamp: new Date().toISOString(),
                metadata: {
                  score: insight.score,
                  postType: insight.postType
                }
              });
            } else {
              display.error('Failed to approve insight');
            }
            currentIndex++;
            reviewComplete = true;
            break;
            
          case 'reject':
            console.log('\n❌ Rejecting insight...');
            const rejectResult = await insights.updateStatus(notionClient, insight.id, 'Rejected');
            if (rejectResult.success) {
              display.success('Insight rejected');
              rejected++;
              // Record analytics
              recordReviewDecision(sessionId, 'insight', {
                id: insight.id,
                title: insight.title,
                action: 'rejected',
                timestamp: new Date().toISOString(),
                metadata: {
                  score: insight.score,
                  postType: insight.postType
                }
              });
            } else {
              display.error('Failed to reject insight');
            }
            currentIndex++;
            reviewComplete = true;
            break;
            
          case 'skip':
            display.info('Skipping insight (no status change)');
            skipped++;
            // Record analytics
            recordReviewDecision(sessionId, 'insight', {
              id: insight.id,
              title: insight.title,
              action: 'skipped',
              timestamp: new Date().toISOString(),
              metadata: {
                score: insight.score,
                postType: insight.postType
              }
            });
            currentIndex++;
            reviewComplete = true;
            break;
            
          case 'previous':
            currentIndex--;
            reviewComplete = true;
            break;
            
          case 'quit':
            console.log('\n👋 Exiting review process...');
            endReviewSession(sessionId);
            return { approved, rejected, skipped };
        }
        
        // Auto-continue to next insight (no prompt needed - users can quit anytime)
      }
    }
    
    // End session when complete
    endReviewSession(sessionId);
    return { approved, rejected, skipped };
    
  } catch (error) {
    display.error(`Error during review: ${error}`);
    return { approved, rejected, skipped };
  }
};

/**
 * Displays review summary
 */
const displayReviewSummary = (
  approved: number,
  rejected: number,
  skipped: number,
  total: number
): void => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 REVIEW SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Approved: ${approved}`);
  console.log(`❌ Rejected: ${rejected}`);
  console.log(`⏭️ Skipped: ${skipped}`);
  console.log(`📄 Total Reviewed: ${total}`);
  console.log('='.repeat(60) + '\n');
  
  if (approved > 0) {
    console.log(`💡 ${approved} insights are now ready for post generation!`);
    console.log('   Next step: Generate Posts');
  }
};

/**
 * Main insight reviewer function
 */
export const runInsightReviewer = async (config: AppConfig): Promise<void> => {
  try {
    display.info('Starting Insight Review Process');
    console.log('This tool helps you quickly review AI-extracted insights');
    console.log('and approve them for social media post generation.\n');
    
    const notionClient = createNotionClient(config.notion);
    
    // Get insights that need review
    const insightsResult = await insights.getNeedsReview(notionClient, config.notion);
    if (!insightsResult.success) {
      throw insightsResult.error;
    }
    
    const insightsToReview = insightsResult.data;
    
    if (insightsToReview.length === 0) {
      display.success('No insights need review! All caught up.');
      return;
    }
    
    console.log(`Found ${insightsToReview.length} insights to review.\n`);
    
    // Review insights
    const results = await reviewInsightsBatch(insightsToReview, config);
    const total = results.approved + results.rejected + results.skipped;
    
    // Display summary
    displayReviewSummary(results.approved, results.rejected, results.skipped, total);
    
    display.success('Review process completed!');
    
  } catch (error) {
    display.error(`Error during review: ${error}`);
    throw error;
  }
};