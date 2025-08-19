import prompts from 'prompts';
import { AppConfig } from './lib/types.ts';
import { createConfig } from './lib/config.ts';
import { display } from './lib/io.ts';
import { runTranscriptProcessor } from './modules/transcript-processor.ts';
import { runInsightReviewer } from './modules/insight-reviewer.ts';
import { runPostGenerator } from './modules/post-generator.ts';
import { runPostReviewer } from './modules/post-reviewer.ts';
import { runPostScheduler } from './modules/post-scheduler.ts';

/**
 * Main CLI application using functional programming principles
 */

/**
 * Creates CLI menu choices for prompts
 */
const createMenuChoices = () => [
  {
    title: '🔄 Process Transcripts',
    description: 'Extract insights from coaching session transcripts',
    value: 'process-transcripts'
  },
  {
    title: '📋 Review Insights', 
    description: 'Review and approve/reject extracted insights',
    value: 'review-insights'
  },
  {
    title: '🤖 Generate Posts',
    description: 'Create LinkedIn and X posts from approved insights',
    value: 'generate-posts'
  },
  {
    title: '📝 Review Posts',
    description: 'Review, edit, and approve generated posts', 
    value: 'review-posts'
  },
  {
    title: '📅 Schedule Posts',
    description: 'Schedule approved posts for publication',
    value: 'schedule-posts'
  },
  {
    title: '❌ Exit',
    description: 'Exit the system',
    value: 'exit'
  }
];

/**
 * Executes the selected action
 */
const executeAction = async (action: string, config: AppConfig): Promise<boolean> => {
  switch (action) {
    case 'process-transcripts':
      console.log('\n🔄 Launching transcript processor...\n');
      await runTranscriptProcessor(config);
      return false;
      
    case 'review-insights':
      console.log('\n📋 Launching insight reviewer...\n');
      await runInsightReviewer(config);
      return false;
      
    case 'generate-posts':
      console.log('\n🤖 Launching post generator...\n');
      await runPostGenerator(config);
      return false;
      
    case 'review-posts':
      console.log('\n📝 Launching post reviewer...\n');
      await runPostReviewer(config);
      return false;
      
    case 'schedule-posts':
      console.log('\n📅 Launching post scheduler...\n');
      await runPostScheduler(config);
      return false;
      
    case 'exit':
      console.log('\n👋 Goodbye!');
      return true;
      
    default:
      display.error('Invalid action selected');
      return false;
  }
};

/**
 * Main CLI loop using prompts
 */
const runCLI = async (config: AppConfig): Promise<void> => {
  // Configure prompts to handle Ctrl+C gracefully
  prompts.override({ onCancel: () => process.exit(0) });
  
  let shouldExit = false;
  
  while (!shouldExit) {
    // Display welcome message
    display.welcome('Content Creation System', 'Transform coaching transcripts into social media content');
    
    try {
      const response = await prompts({
        type: 'select',
        name: 'action',
        message: 'What would you like to do?',
        choices: createMenuChoices(),
        initial: 0
      });
      
      // Handle user cancellation (Ctrl+C or ESC)
      if (!response.action) {
        console.log('\n👋 Goodbye!');
        return;
      }
      
      shouldExit = await executeAction(response.action, config);
      
      // If not exiting, show continue prompt
      if (!shouldExit) {
        await prompts({
          type: 'invisible',
          name: 'continue',
          message: 'Press Enter to return to main menu'
        });
      }
    } catch (error) {
      display.error(`System error: ${error}`);
      const shouldRetry = await prompts({
        type: 'confirm',
        name: 'retry',
        message: 'Would you like to try again?',
        initial: true
      });
      
      if (!shouldRetry.retry) {
        shouldExit = true;
      }
    }
  }
};

/**
 * Application entry point
 */
const main = async (): Promise<void> => {
  try {
    const config = createConfig();
    await runCLI(config);
  } catch (error) {
    display.error(`System error: ${error}`);
    process.exit(1);
  }
};

// Run the application if this is the main module
if (import.meta.main) {
  main();
}

export { runCLI, createMenuChoices, executeAction };