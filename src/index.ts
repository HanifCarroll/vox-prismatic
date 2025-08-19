import * as readline from 'readline';
import { CLIOption, AppConfig } from './lib/types.ts';
import { createConfig } from './lib/config.ts';
import { createReadlineInterface, askQuestion, closeReadlineInterface, display } from './lib/io.ts';
import { runTranscriptProcessor } from './modules/transcript-processor.ts';
import { runInsightReviewer } from './modules/insight-reviewer.ts';
import { runPostGenerator } from './modules/post-generator.ts';
import { runPostReviewer } from './modules/post-reviewer.ts';
import { runPostScheduler } from './modules/post-scheduler.ts';

/**
 * Main CLI application using functional programming principles
 */

/**
 * Creates CLI menu options
 */
const createMenuOptions = (config: AppConfig): CLIOption[] => [
  {
    key: '1',
    label: 'Process Transcripts',
    description: 'Extract insights from coaching session transcripts',
    action: async () => {
      console.log('\n🔄 Launching transcript processor...\n');
      await runTranscriptProcessor(config);
    }
  },
  {
    key: '2',
    label: 'Review Insights',
    description: 'Review and approve/reject extracted insights',
    action: async () => {
      console.log('\n📋 Launching insight reviewer...\n');
      await runInsightReviewer(config);
    }
  },
  {
    key: '3',
    label: 'Generate Posts',
    description: 'Create LinkedIn and X posts from approved insights',
    action: async () => {
      console.log('\n🤖 Launching post generator...\n');
      await runPostGenerator(config);
    }
  },
  {
    key: '4',
    label: 'Review Posts',
    description: 'Review, edit, and approve generated posts',
    action: async () => {
      console.log('\n📝 Launching post reviewer...\n');
      await runPostReviewer(config);
    }
  },
  {
    key: '5',
    label: 'Schedule Posts',
    description: 'Schedule approved posts for publication',
    action: async () => {
      console.log('\n📅 Launching post scheduler...\n');
      await runPostScheduler(config);
    }
  },
  {
    key: 'q',
    label: 'Quit',
    description: 'Exit the system',
    action: async () => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    }
  }
];

/**
 * Displays welcome message and menu
 */
const displayWelcomeAndMenu = (options: CLIOption[]): void => {
  display.welcome('Content Creation System', 'Transform coaching transcripts into social media content');
  display.section('Available Actions');
  
  options.forEach(option => {
    if (option.key === 'q') {
      console.log(); // Add spacing before quit option
    }
    console.log(`[${option.key.toUpperCase()}] ${option.label}`);
    console.log(`    ${option.description}`);
    console.log();
  });
};

/**
 * Handles user choice and executes corresponding action
 */
const handleChoice = async (
  rl: readline.Interface,
  choice: string,
  options: CLIOption[]
): Promise<boolean> => {
  const selectedOption = options.find(opt => opt.key.toLowerCase() === choice.toLowerCase());
  
  if (!selectedOption) {
    display.error('Invalid choice. Please try again.');
    await askQuestion(rl)('Press Enter to continue...');
    return false;
  }

  try {
    await selectedOption.action();
    
    if (choice.toLowerCase() !== 'q') {
      console.log();
      await askQuestion(rl)('Press Enter to return to main menu...');
    }
  } catch (error) {
    display.error(`Error executing action: ${error}`);
    await askQuestion(rl)('Press Enter to return to main menu...');
  }

  return choice.toLowerCase() === 'q';
};

/**
 * Main CLI loop
 */
const runCLI = async (config: AppConfig): Promise<void> => {
  const rl = createReadlineInterface();
  const ask = askQuestion(rl);
  const options = createMenuOptions(config);
  let shouldExit = false;
  
  try {
    while (!shouldExit) {
      displayWelcomeAndMenu(options);
      const choice = await ask('Choose an action [1-5, Q]: ');
      shouldExit = await handleChoice(rl, choice, options);
    }
  } finally {
    closeReadlineInterface(rl);
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

export { runCLI, createMenuOptions };