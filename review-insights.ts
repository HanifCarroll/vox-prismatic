import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import * as readline from 'readline/promises';

dotenv.config();

type PostType = 'Problem' | 'Proof' | 'Framework' | 'Contrarian Take' | 'Mental Model';

interface InsightForReview {
  id: string;
  title: string;
  score: number;
  summary: string;
  verbatimQuote: string;
  postType: PostType | string; // Allow string for backward compatibility
  hooks: string;
}

class InsightReviewer {
  private notion: Client;
  private rl: readline.Interface;

  constructor() {
    if (!process.env.NOTION_API_KEY) {
      throw new Error('NOTION_API_KEY is required');
    }
    if (!process.env.NOTION_INSIGHTS_DATABASE_ID) {
      throw new Error('NOTION_INSIGHTS_DATABASE_ID is required');
    }

    this.notion = new Client({ auth: process.env.NOTION_API_KEY });
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async getInsightsForReview(): Promise<InsightForReview[]> {
    console.log('🔍 Fetching insights that need review...\n');
    
    const response = await this.notion.databases.query({
      database_id: process.env.NOTION_INSIGHTS_DATABASE_ID!,
      filter: {
        property: 'Status',
        select: {
          equals: 'Needs Review'
        }
      },
      sorts: [
        {
          property: 'Score',
          direction: 'descending'
        }
      ]
    });

    return response.results.map((page: any) => ({
      id: page.id,
      title: page.properties.Title?.title?.[0]?.plain_text || 'Untitled',
      score: page.properties.Score?.number || 0,
      summary: page.properties.Summary?.rich_text?.[0]?.plain_text || 'No summary',
      verbatimQuote: page.properties['Verbatim Quote']?.rich_text?.[0]?.plain_text || 'No quote',
      postType: page.properties['Post Type']?.select?.name || 'Unknown',
      hooks: page.properties.Hooks?.rich_text?.[0]?.plain_text || 'No hooks available'
    }));
  }

  async updateInsightStatus(insightId: string, status: string): Promise<void> {
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

  displayInsight(insight: InsightForReview, index: number, total: number): void {
    console.log('\n' + '='.repeat(60));
    console.log(`📄 INSIGHT ${index + 1} of ${total}`);
    console.log('='.repeat(60));
    console.log(`\n📌 Title: ${insight.title}`);
    console.log(`⭐ Score: ${insight.score}`);
    console.log(`📝 Type: ${insight.postType}`);
    console.log(`\n📖 Summary:\n${insight.summary}`);
    console.log(`\n🎣 Potential Hooks:\n${insight.hooks}`);
    console.log(`\n💬 Verbatim Quote:\n"${insight.verbatimQuote.substring(0, 200)}${insight.verbatimQuote.length > 200 ? '...' : ''}"`);
    console.log('\n' + '-'.repeat(60));
  }

  async reviewInsights(): Promise<void> {
    try {
      const insights = await this.getInsightsForReview();
      
      if (insights.length === 0) {
        console.log('✅ No insights need review! All caught up.\n');
        return;
      }

      console.log(`Found ${insights.length} insights to review.\n`);
      
      let approved = 0;
      let rejected = 0;
      let skipped = 0;

      for (let i = 0; i < insights.length; i++) {
        const insight = insights[i];
        this.displayInsight(insight, i, insights.length);
        
        console.log('\n🤔 What would you like to do?');
        console.log('  [a] Approve - Mark as "Ready for Posts"');
        console.log('  [r] Reject - Mark as "Rejected"');
        console.log('  [s] Skip - Leave as "Needs Review" for later');
        console.log('  [q] Quit - Exit the review process');
        
        const answer = await this.rl.question('\nYour choice: ');
        
        switch (answer.toLowerCase()) {
          case 'a':
          case 'approve':
            await this.updateInsightStatus(insight.id, 'Ready for Posts');
            console.log('✅ Approved! Marked as "Ready for Posts"');
            approved++;
            break;
            
          case 'r':
          case 'reject':
            await this.updateInsightStatus(insight.id, 'Rejected');
            console.log('❌ Rejected! Marked as "Rejected"');
            rejected++;
            break;
            
          case 's':
          case 'skip':
            console.log('⏭️ Skipped! Left as "Needs Review"');
            skipped++;
            break;
            
          case 'q':
          case 'quit':
            console.log('\n👋 Exiting review process...');
            this.displaySummary(approved, rejected, skipped, i + 1);
            return;
            
          default:
            console.log('⚠️ Invalid choice, skipping this insight');
            skipped++;
        }
      }
      
      this.displaySummary(approved, rejected, skipped, insights.length);
    } finally {
      this.rl.close();
    }
  }

  displaySummary(approved: number, rejected: number, skipped: number, total: number): void {
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
      console.log('   Run: bun generate-posts.ts');
    }
  }
}

async function main() {
  try {
    console.log('🚀 Starting Insight Review Process\n');
    console.log('This tool helps you quickly review AI-extracted insights');
    console.log('and approve them for social media post generation.\n');
    
    const reviewer = new InsightReviewer();
    await reviewer.reviewInsights();
    
    console.log('\n✨ Review process completed!');
  } catch (error) {
    console.error('❌ Error during review:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}