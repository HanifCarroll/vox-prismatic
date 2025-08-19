import * as readline from 'readline';
import { runTranscriptProcessor } from './process-transcripts.ts';
import { PostReviewer } from './review-posts.ts';
import { PostScheduler } from './schedule-posts.ts';
import { PostGenerator } from './generate-posts.ts';

interface CLIOption {
  key: string;
  label: string;
  description: string;
  action: () => Promise<void>;
}

class ContentCreationCLI {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  private async askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  private displayWelcome(): void {
    console.clear();
    console.log('🚀 Content Creation System');
    console.log('═'.repeat(50));
    console.log('Transform coaching transcripts into social media content');
    console.log();
  }

  private getMenuOptions(): CLIOption[] {
    return [
      {
        key: '1',
        label: 'Process Transcripts',
        description: 'Extract insights from coaching session transcripts',
        action: async () => {
          console.log('\n🔄 Launching transcript processor...\n');
          await runTranscriptProcessor();
        }
      },
      {
        key: '2',
        label: 'Review Insights',
        description: 'Review and approve/reject extracted insights',
        action: async () => {
          console.log('\n📋 Launching insight reviewer...\n');
          const { runInsightReviewer } = await import('./review-insights.ts');
          await runInsightReviewer();
        }
      },
      {
        key: '3',
        label: 'Generate Posts',
        description: 'Create LinkedIn and X posts from approved insights',
        action: async () => {
          console.log('\n🤖 Launching post generator...\n');
          const generator = new PostGenerator();
          const testMode = false;
          const batchSize = 3;
          await generator.generatePostsFromInsights(testMode, batchSize);
        }
      },
      {
        key: '4',
        label: 'Review Posts',
        description: 'Review, edit, and approve generated posts',
        action: async () => {
          console.log('\n📝 Launching post reviewer...\n');
          const reviewer = new PostReviewer();
          try {
            await reviewer.reviewPosts();
          } finally {
            reviewer.close();
          }
        }
      },
      {
        key: '5',
        label: 'Schedule Posts',
        description: 'Schedule approved posts for publication',
        action: async () => {
          console.log('\n📅 Launching post scheduler...\n');
          const scheduler = new PostScheduler();
          try {
            await scheduler.schedulePosts();
          } finally {
            scheduler.close();
          }
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
  }

  private displayMenu(): void {
    console.log('📋 Available Actions:');
    console.log('─'.repeat(50));
    
    const options = this.getMenuOptions();
    
    options.forEach(option => {
      if (option.key === 'q') {
        console.log(); // Add spacing before quit option
      }
      console.log(`[${option.key.toUpperCase()}] ${option.label}`);
      console.log(`    ${option.description}`);
      console.log();
    });
  }

  private async handleChoice(choice: string): Promise<boolean> {
    const options = this.getMenuOptions();
    const selectedOption = options.find(opt => opt.key.toLowerCase() === choice.toLowerCase());
    
    if (!selectedOption) {
      console.log('❌ Invalid choice. Please try again.');
      await this.askQuestion('Press Enter to continue...');
      return false;
    }

    try {
      await selectedOption.action();
      
      if (choice.toLowerCase() !== 'q') {
        console.log();
        await this.askQuestion('Press Enter to return to main menu...');
      }
    } catch (error) {
      console.error('❌ Error executing action:', error);
      await this.askQuestion('Press Enter to return to main menu...');
    }

    return choice.toLowerCase() === 'q';
  }

  async run(): Promise<void> {
    let shouldExit = false;
    
    while (!shouldExit) {
      this.displayWelcome();
      this.displayMenu();
      
      const choice = await this.askQuestion('Choose an action [1-5, Q]: ');
      shouldExit = await this.handleChoice(choice);
    }
  }

  close(): void {
    this.rl.close();
  }
}

async function main() {
  const cli = new ContentCreationCLI();
  
  try {
    await cli.run();
  } catch (error) {
    console.error('❌ System error:', error);
    process.exit(1);
  } finally {
    cli.close();
  }
}

if (import.meta.main) {
  main();
}