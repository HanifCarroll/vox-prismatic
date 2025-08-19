import { AppConfig, InsightPage, Result } from '../lib/types.ts';
import { createNotionClient, insights, getPageContent } from '../lib/notion.ts';
import { createReadlineInterface, askQuestion, closeReadlineInterface, display } from '../lib/io.ts';

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
  insight: InsightPage & { content: string; hooks: string },
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
  
  if (insight.hooks) {
    console.log();
    console.log('HOOKS:');
    display.line();
    console.log(insight.hooks);
  }
  
  display.separator();
  console.log();
  console.log('[A]pprove  [R]eject  [S]kip  [Q]uit');
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
 * Reviews a batch of insights interactively
 */
const reviewInsightsBatch = async (
  insightsToReview: InsightPage[],
  config: AppConfig
): Promise<{ approved: number; rejected: number; skipped: number }> => {
  const rl = createReadlineInterface();
  const ask = askQuestion(rl);
  const notionClient = createNotionClient(config.notion);
  
  let approved = 0;
  let rejected = 0;
  let skipped = 0;

  try {
    for (let i = 0; i < insightsToReview.length; i++) {
      const insight = insightsToReview[i];
      
      // Get full content and hooks
      const contentResult = await getInsightContent(notionClient, insight.id);
      const content = contentResult.success ? contentResult.data : 'Failed to load content';
      const hooks = await getInsightHooks(notionClient, insight.id);
      
      const insightWithContent = { ...insight, content, hooks };
      
      let reviewComplete = false;
      
      while (!reviewComplete) {
        displayInsightForReview(insightWithContent, i, insightsToReview.length);
        
        const choice = await ask('\nChoice: ');
        
        switch (choice.toLowerCase()) {
          case 'a':
            console.log('\n✅ Approving insight...');
            const approveResult = await insights.updateStatus(notionClient, insight.id, 'Ready for Posts');
            if (approveResult.success) {
              console.log('Insight approved and ready for post generation!');
              approved++;
            } else {
              display.error('Failed to approve insight');
            }
            reviewComplete = true;
            break;
            
          case 'r':
            console.log('\n❌ Rejecting insight...');
            const rejectResult = await insights.updateStatus(notionClient, insight.id, 'Rejected');
            if (rejectResult.success) {
              console.log('Insight rejected');
              rejected++;
            } else {
              display.error('Failed to reject insight');
            }
            reviewComplete = true;
            break;
            
          case 's':
            console.log('\n⏭️  Skipping insight...');
            skipped++;
            reviewComplete = true;
            break;
            
          case 'q':
            console.log('\n👋 Exiting review process...');
            return { approved, rejected, skipped };
            
          default:
            display.error('Invalid choice. Please choose A, R, S, or Q.');
            await ask('Press Enter to continue...');
        }
        
        if (reviewComplete && i < insightsToReview.length - 1) {
          await ask('\nPress Enter to continue to next insight...');
        }
      }
    }
    
    return { approved, rejected, skipped };
    
  } finally {
    closeReadlineInterface(rl);
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