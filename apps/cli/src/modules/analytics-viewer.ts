import prompts from 'prompts';
import { displayTypeAnalytics } from '@content-creation/shared';
import { display } from '@content-creation/content-pipeline';

/**
 * Interactive analytics viewer module
 */

/**
 * Main analytics viewer function
 */
export const runAnalyticsViewer = async (): Promise<void> => {
  try {
    while (true) {
      console.clear();
      console.log('📊 REVIEW ANALYTICS');
      console.log('═'.repeat(30));
      console.log('View your review performance and patterns\n');

      const response = await prompts({
        type: 'select',
        name: 'action',
        message: 'What analytics would you like to view?',
        choices: [
          {
            title: '💡 Insight Analytics',
            description: 'View insight review statistics',
            value: 'insights'
          },
          {
            title: '📝 Post Analytics', 
            description: 'View post review statistics',
            value: 'posts'
          },
          {
            title: '🔙 Back to Main Menu',
            description: 'Return to main menu',
            value: 'back'
          }
        ],
        initial: 0
      });

      if (!response.action || response.action === 'back') {
        return;
      }

      // Show analytics for selected type
      displayTypeAnalytics(response.action as 'insights' | 'posts');
      
      // Wait for user to continue
      await prompts({
        type: 'confirm',
        name: 'continue',
        message: 'Press Enter to continue...',
        initial: true
      });
    }

  } catch (error) {
    display.error(`Error in analytics viewer: ${error}`);
  }
};