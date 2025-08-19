import { Client } from '@notionhq/client';
import * as readline from 'readline';
import { spawn } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import dotenv from 'dotenv';

dotenv.config();

interface PostForReview {
  id: string;
  title: string;
  platform: string;
  status: string;
  sourceInsightTitle?: string;
  createdTime: string;
  content: string;
  softCTA?: string;
  directCTA?: string;
}

export class PostReviewer {
  private notion: Client;
  private rl: readline.Interface;

  constructor() {
    if (!process.env.NOTION_API_KEY) {
      throw new Error('NOTION_API_KEY is required');
    }
    if (!process.env.NOTION_POSTS_DATABASE_ID) {
      throw new Error('NOTION_POSTS_DATABASE_ID is required');
    }

    this.notion = new Client({ auth: process.env.NOTION_API_KEY });
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async getPostsNeedingReview(): Promise<PostForReview[]> {
    console.log('🔍 Fetching posts that need review...');
    
    const response = await this.notion.databases.query({
      database_id: process.env.NOTION_POSTS_DATABASE_ID!,
      filter: {
        property: 'Status',
        select: {
          equals: 'Needs Review'
        }
      },
      sorts: [
        {
          property: 'Created time',
          direction: 'ascending'
        }
      ]
    });

    const posts: PostForReview[] = [];
    
    for (const page of response.results) {
      const pageData = page as any;
      const post: PostForReview = {
        id: page.id,
        title: pageData.properties.Title?.title?.[0]?.plain_text || 'Untitled Post',
        platform: pageData.properties.Platform?.select?.name || 'Unknown',
        status: pageData.properties.Status?.select?.name || 'Unknown',
        sourceInsightTitle: pageData.properties['Source Insight']?.relation?.[0] 
          ? await this.getInsightTitle(pageData.properties['Source Insight'].relation[0].id)
          : undefined,
        createdTime: pageData.created_time,
        content: await this.getPostContent(page.id)
      };

      // For LinkedIn posts, also get CTA options
      if (post.platform === 'LinkedIn') {
        const ctaOptions = await this.getCTAOptions(page.id);
        post.softCTA = ctaOptions.softCTA;
        post.directCTA = ctaOptions.directCTA;
      }

      posts.push(post);
    }

    console.log(`📊 Found ${posts.length} posts needing review`);
    return posts;
  }

  async getInsightTitle(insightId: string): Promise<string> {
    try {
      const insight = await this.notion.pages.retrieve({ page_id: insightId });
      const insightData = insight as any;
      return insightData.properties.Title?.title?.[0]?.plain_text || 'Unknown Insight';
    } catch (error) {
      return 'Unknown Insight';
    }
  }

  async getPostContent(postId: string): Promise<string> {
    let content = '';
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response = await this.notion.blocks.children.list({
        block_id: postId,
        start_cursor: startCursor,
        page_size: 100
      });

      for (const block of response.results) {
        const fullBlock = block as BlockObjectResponse;
        if (fullBlock.type === 'paragraph' && 'paragraph' in fullBlock && fullBlock.paragraph.rich_text) {
          content += fullBlock.paragraph.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        } else if (fullBlock.type === 'heading_3' && 'heading_3' in fullBlock && fullBlock.heading_3.rich_text) {
          // Skip CTA headings for main content
          const headingText = fullBlock.heading_3.rich_text.map((text: any) => text.plain_text).join('');
          if (!headingText.includes('Call to Action')) {
            content += headingText + '\n';
          }
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;
    }

    return content.trim();
  }

  async getCTAOptions(postId: string): Promise<{ softCTA?: string, directCTA?: string }> {
    let softCTA = '';
    let directCTA = '';
    let isInCTASection = false;

    const response = await this.notion.blocks.children.list({
      block_id: postId,
      page_size: 100
    });

    for (const block of response.results) {
      const fullBlock = block as BlockObjectResponse;
      
      if (fullBlock.type === 'heading_3' && 'heading_3' in fullBlock && fullBlock.heading_3.rich_text) {
        const headingText = fullBlock.heading_3.rich_text.map((text: any) => text.plain_text).join('');
        if (headingText.includes('Call to Action')) {
          isInCTASection = true;
          continue;
        }
      }

      if (isInCTASection && fullBlock.type === 'paragraph' && 'paragraph' in fullBlock && fullBlock.paragraph.rich_text) {
        const text = fullBlock.paragraph.rich_text.map((text: any) => text.plain_text).join('');
        if (text.startsWith('**Soft CTA:**')) {
          softCTA = text.replace('**Soft CTA:**', '').trim();
        } else if (text.startsWith('**Direct CTA:**')) {
          directCTA = text.replace('**Direct CTA:**', '').trim();
        }
      }
    }

    return { softCTA: softCTA || undefined, directCTA: directCTA || undefined };
  }

  displayPost(post: PostForReview, currentIndex: number, totalPosts: number): void {
    console.clear();
    console.log(`📝 REVIEWING POST ${currentIndex + 1}/${totalPosts} - ${post.platform.toUpperCase()}`);
    console.log();
    console.log(`Platform: ${post.platform}`);
    if (post.sourceInsightTitle) {
      console.log(`Source Insight: "${post.sourceInsightTitle}"`);
    }
    console.log(`Generated: ${new Date(post.createdTime).toLocaleString()}`);
    console.log();
    console.log('═'.repeat(80));
    console.log(post.content);
    console.log('═'.repeat(80));

    if (post.platform === 'LinkedIn' && (post.softCTA || post.directCTA)) {
      console.log();
      console.log('📢 Call to Action Options:');
      if (post.softCTA) console.log(`  Soft CTA: ${post.softCTA}`);
      if (post.directCTA) console.log(`  Direct CTA: ${post.directCTA}`);
    }

    console.log();
    console.log('[A]pprove  [E]dit  [R]eject  [S]kip  [Q]uit');
  }

  async editPostContent(post: PostForReview): Promise<string | null> {
    console.log('\nChoose editing method:');
    console.log('[1] External editor (recommended)');
    console.log('[2] Inline text entry');
    console.log('[3] Cancel');

    const choice = await this.askQuestion('\nChoice [1-3]: ');
    
    switch (choice.toLowerCase()) {
      case '1':
        return await this.editWithExternalEditor(post);
      case '2':
        return await this.editInline(post);
      case '3':
      default:
        return null;
    }
  }

  async editWithExternalEditor(post: PostForReview): Promise<string | null> {
    const tempFile = `/tmp/post-edit-${Date.now()}.txt`;
    
    try {
      // Write current content to temp file
      let fileContent = post.content;
      
      // Add CTA options for LinkedIn posts
      if (post.platform === 'LinkedIn' && (post.softCTA || post.directCTA)) {
        fileContent += '\n\n--- Call to Action Options ---\n';
        if (post.softCTA) fileContent += `Soft CTA: ${post.softCTA}\n`;
        if (post.directCTA) fileContent += `Direct CTA: ${post.directCTA}\n`;
      }

      writeFileSync(tempFile, fileContent);
      
      console.log('\n📝 Opening post in your default editor...');
      console.log('💡 Edit the content, then save and close the editor to continue.');
      
      if (post.platform === 'LinkedIn') {
        console.log('💡 You can also edit the CTA options at the bottom of the file.');
      }
      
      await this.askQuestion('Press Enter when ready to open editor...');

      // Get editor from environment or default to nano
      const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
      
      // Spawn editor process
      await new Promise<void>((resolve, reject) => {
        const editorProcess = spawn(editor, [tempFile], { 
          stdio: 'inherit',
          shell: true 
        });
        
        editorProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Editor exited with code ${code}`));
          }
        });
        
        editorProcess.on('error', (error) => {
          reject(error);
        });
      });

      // Read the edited content
      const editedContent = readFileSync(tempFile, 'utf-8');
      
      // Clean up temp file
      unlinkSync(tempFile);
      
      console.log('\n✅ Content edited successfully!');
      return editedContent;
      
    } catch (error) {
      console.error('❌ Error during editing:', error);
      try {
        unlinkSync(tempFile);
      } catch {}
      return null;
    }
  }

  async editInline(post: PostForReview): Promise<string | null> {
    console.log('\n📝 Current content:');
    console.log('─'.repeat(60));
    console.log(post.content);
    console.log('─'.repeat(60));
    
    console.log('\nEnter your new content (press Ctrl+D or type "END" on a new line when finished):');
    
    return new Promise((resolve) => {
      let newContent = '';
      const lineReader = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> '
      });
      
      lineReader.prompt();
      
      lineReader.on('line', (line) => {
        if (line.trim() === 'END') {
          lineReader.close();
          resolve(newContent.trim());
        } else {
          newContent += line + '\n';
          lineReader.prompt();
        }
      });
      
      lineReader.on('close', () => {
        resolve(newContent.trim() || null);
      });
    });
  }

  async updatePostContent(postId: string, newContent: string, platform: string): Promise<void> {
    // First, delete all existing blocks
    const existingBlocks = await this.notion.blocks.children.list({
      block_id: postId
    });

    for (const block of existingBlocks.results) {
      await this.notion.blocks.delete({
        block_id: block.id
      });
    }

    // Parse the new content
    const lines = newContent.split('\n');
    const blocks: any[] = [];
    let mainContent = '';
    let softCTA = '';
    let directCTA = '';
    let inCTASection = false;

    for (const line of lines) {
      if (line.includes('--- Call to Action Options ---')) {
        inCTASection = true;
        continue;
      }
      
      if (inCTASection) {
        if (line.startsWith('Soft CTA:')) {
          softCTA = line.replace('Soft CTA:', '').trim();
        } else if (line.startsWith('Direct CTA:')) {
          directCTA = line.replace('Direct CTA:', '').trim();
        }
      } else {
        mainContent += line + '\n';
      }
    }

    // Add main content as paragraph
    if (mainContent.trim()) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: mainContent.trim()
              }
            }
          ]
        }
      });
    }

    // Add CTA options for LinkedIn
    if (platform === 'LinkedIn' && (softCTA || directCTA)) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: 'Call to Action Options'
              }
            }
          ]
        }
      });

      if (softCTA) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `**Soft CTA:** ${softCTA}`
                }
              }
            ]
          }
        });
      }

      if (directCTA) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `**Direct CTA:** ${directCTA}`
                }
              }
            ]
          }
        });
      }
    }

    // Add all blocks to the post
    if (blocks.length > 0) {
      await this.notion.blocks.children.append({
        block_id: postId,
        children: blocks
      });
    }
  }

  async updatePostStatus(postId: string, status: string): Promise<void> {
    await this.notion.pages.update({
      page_id: postId,
      properties: {
        'Status': {
          select: {
            name: status
          }
        }
      }
    });
  }

  async askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async reviewPosts(): Promise<void> {
    try {
      const posts = await this.getPostsNeedingReview();
      
      if (posts.length === 0) {
        console.log('🎉 No posts need review! All posts are up to date.');
        return;
      }

      console.log(`\n📋 Starting review of ${posts.length} post${posts.length === 1 ? '' : 's'}...\n`);

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        let reviewComplete = false;

        while (!reviewComplete) {
          this.displayPost(post, i, posts.length);
          
          const choice = await this.askQuestion('\nChoice: ');
          
          switch (choice.toLowerCase()) {
            case 'a':
              console.log('\n✅ Approving post...');
              await this.updatePostStatus(post.id, 'Ready to Schedule');
              console.log('Post approved and ready for scheduling!');
              reviewComplete = true;
              break;
              
            case 'e':
              const editedContent = await this.editPostContent(post);
              if (editedContent) {
                console.log('\n💾 Saving changes...');
                await this.updatePostContent(post.id, editedContent, post.platform);
                // Update the post object with new content for display
                post.content = editedContent.split('\n--- Call to Action Options ---')[0].trim();
                console.log('Changes saved! Review the updated post.');
              } else {
                console.log('Edit cancelled.');
              }
              break;
              
            case 'r':
              const reason = await this.askQuestion('Reason for rejection (optional): ');
              console.log('\n❌ Rejecting post...');
              await this.updatePostStatus(post.id, 'Rejected');
              console.log(`Post rejected${reason ? ': ' + reason : ''}`);
              reviewComplete = true;
              break;
              
            case 's':
              console.log('\n⏭️  Skipping post...');
              reviewComplete = true;
              break;
              
            case 'q':
              console.log('\n👋 Exiting review process...');
              return;
              
            default:
              console.log('Invalid choice. Please choose A, E, R, S, or Q.');
              await this.askQuestion('Press Enter to continue...');
          }
          
          if (reviewComplete && i < posts.length - 1) {
            await this.askQuestion('\nPress Enter to continue to next post...');
          }
        }
      }
      
      console.log('\n🎉 Post review completed!');
      
    } catch (error) {
      console.error('❌ Error during post review:', error);
      throw error;
    }
  }

  close(): void {
    this.rl.close();
  }
}

async function main() {
  const reviewer = new PostReviewer();
  
  try {
    await reviewer.reviewPosts();
  } catch (error) {
    console.error('❌ Application error:', error);
    process.exit(1);
  } finally {
    reviewer.close();
  }
}

if (import.meta.main) {
  main();
}