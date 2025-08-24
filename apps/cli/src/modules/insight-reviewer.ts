import prompts from 'prompts';
import { AppConfig, Result } from '@content-creation/shared';
import {
  initDatabase,
  getInsights,
  updateInsightStatus,
  type InsightRecord
} from '@content-creation/database';
import { display } from '@content-creation/content-pipeline';
import { createReviewSession, recordReviewDecision, endReviewSession } from '@content-creation/shared';

/**
 * Functional insight review module
 */

/**
 * Formats insight content for display
 */
const formatInsightContent = (insight: InsightRecord): string => {
  const sections = [];
  
  sections.push(`**Summary:** ${insight.summary}`);
  sections.push(`**Category:** ${insight.category}`);
  sections.push(`**Post Type:** ${insight.postType}`);
  sections.push('');
  
  sections.push('**Scoring:**');
  sections.push(`  • Urgency: ${insight.urgencyScore}/10`);
  sections.push(`  • Relatability: ${insight.relatabilityScore}/10`);
  sections.push(`  • Specificity: ${insight.specificityScore}/10`);
  sections.push(`  • Authority: ${insight.authorityScore}/10`);
  sections.push('');
  
  sections.push('**Verbatim Quote:**');
  sections.push(`"${insight.verbatimQuote}"`);
  
  return sections.join('\n');
};

/**
 * Displays a single insight for review
 */
const displayInsightForReview = (
  insight: InsightRecord,
  currentIndex: number,
  totalInsights: number
): void => {
  console.clear();
  console.log(`📋 REVIEWING INSIGHT ${currentIndex + 1}/${totalInsights}`);
  console.log();
  console.log(`Title: ${insight.title}`);
  console.log(`Score: ${insight.totalScore}/40`);
  console.log(`Status: ${insight.status}`);
  console.log();
  
  display.separator();
  console.log('CONTENT:');
  display.line();
  console.log(formatInsightContent(insight));
  
  display.separator();
  console.log();
};


/**
 * Reviews a batch of insights interactively with navigation
 */
const reviewInsightsBatch = async (
  insightsToReview: InsightRecord[],
  config: AppConfig
): Promise<{ approved: number; rejected: number; skipped: number }> => {
  let approved = 0;
  let rejected = 0;
  let skipped = 0;

  try {
    // Create analytics session
    const sessionId = createReviewSession('insight');
    
    let currentIndex = 0;
    
    while (currentIndex >= 0 && currentIndex < insightsToReview.length) {
      const insight = insightsToReview[currentIndex];
      
      let reviewComplete = false;
      
      while (!reviewComplete) {
        displayInsightForReview(insight, currentIndex, insightsToReview.length);
        
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
            const approveResult = updateInsightStatus(insight.id, 'approved');
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
                  score: insight.totalScore,
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
            const rejectResult = updateInsightStatus(insight.id, 'rejected');
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
                  score: insight.totalScore,
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
                score: insight.totalScore,
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
    
    // Initialize database
    initDatabase();
    
    // Get insights that need review (draft status with high scores)
    const insightsResult = getInsights({ 
      status: 'draft',
      minScore: 15, // Minimum score of 15/40 to be worth reviewing
      sortBy: 'total_score',
      sortOrder: 'DESC',
      limit: 50
    });
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