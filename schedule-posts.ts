import { Client } from '@notionhq/client';
import * as readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

interface ScheduledPost {
  id: string;
  title: string;
  platform: string;
  scheduledDate?: string;
  status: string;
  content: string;
}

interface PostToSchedule {
  id: string;
  title: string;
  platform: string;
  status: string;
  content: string;
}

export class PostScheduler {
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

  async getScheduledPosts(): Promise<ScheduledPost[]> {
    const response = await this.notion.databases.query({
      database_id: process.env.NOTION_POSTS_DATABASE_ID!,
      filter: {
        property: 'Status',
        select: {
          equals: 'Scheduled'
        }
      },
      sorts: [
        {
          property: 'Scheduled Date',
          direction: 'ascending'
        }
      ]
    });

    const posts: ScheduledPost[] = [];
    
    for (const page of response.results) {
      const pageData = page as any;
      posts.push({
        id: page.id,
        title: pageData.properties.Title?.title?.[0]?.plain_text || 'Untitled Post',
        platform: pageData.properties.Platform?.select?.name || 'Unknown',
        scheduledDate: pageData.properties['Scheduled Date']?.date?.start || undefined,
        status: pageData.properties.Status?.select?.name || 'Unknown',
        content: await this.getPostContent(page.id)
      });
    }

    return posts;
  }

  async getPostsToSchedule(): Promise<PostToSchedule[]> {
    const response = await this.notion.databases.query({
      database_id: process.env.NOTION_POSTS_DATABASE_ID!,
      filter: {
        property: 'Status',
        select: {
          equals: 'Ready to Schedule'
        }
      },
      sorts: [
        {
          property: 'Created time',
          direction: 'ascending'
        }
      ]
    });

    const posts: PostToSchedule[] = [];
    
    for (const page of response.results) {
      const pageData = page as any;
      posts.push({
        id: page.id,
        title: pageData.properties.Title?.title?.[0]?.plain_text || 'Untitled Post',
        platform: pageData.properties.Platform?.select?.name || 'Unknown',
        status: pageData.properties.Status?.select?.name || 'Unknown',
        content: await this.getPostContent(page.id)
      });
    }

    return posts;
  }

  async getPostContent(postId: string): Promise<string> {
    const response = await this.notion.blocks.children.list({
      block_id: postId,
      page_size: 10
    });

    let content = '';
    for (const block of response.results) {
      const fullBlock = block as any;
      if (fullBlock.type === 'paragraph' && fullBlock.paragraph?.rich_text) {
        const text = fullBlock.paragraph.rich_text.map((rt: any) => rt.plain_text).join('');
        content += text + ' ';
        if (content.length > 100) break; // Just get preview for scheduling
      }
    }

    return content.trim();
  }

  displayScheduledPosts(scheduledPosts: ScheduledPost[]): void {
    console.log('\n📅 CURRENT POSTING SCHEDULE');
    console.log('='.repeat(80));
    
    if (scheduledPosts.length === 0) {
      console.log('No posts currently scheduled.');
      return;
    }

    // Group by platform
    const postsByPlatform: Record<string, ScheduledPost[]> = {};
    scheduledPosts.forEach(post => {
      if (!postsByPlatform[post.platform]) {
        postsByPlatform[post.platform] = [];
      }
      postsByPlatform[post.platform].push(post);
    });

    Object.keys(postsByPlatform).sort().forEach(platform => {
      console.log(`\n${platform.toUpperCase()}:`);
      postsByPlatform[platform].forEach(post => {
        const date = post.scheduledDate ? new Date(post.scheduledDate) : null;
        const dateStr = date ? date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No date';
        const preview = post.content.length > 60 ? post.content.substring(0, 60) + '...' : post.content;
        console.log(`  - ${dateStr}: "${preview}"`);
      });
    });
    
    console.log();
  }

  async suggestTimeSlots(platform: string, scheduledPosts: ScheduledPost[]): Promise<string[]> {
    const today = new Date();
    const suggestions: string[] = [];
    
    // Get platform-specific optimal times
    const optimalTimes = this.getOptimalTimes(platform);
    
    // Look at next 14 days
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + dayOffset);
      checkDate.setHours(0, 0, 0, 0);
      
      for (const time of optimalTimes) {
        const slotDateTime = new Date(checkDate);
        slotDateTime.setHours(time.hour, time.minute);
        
        // Skip past times
        if (slotDateTime <= new Date()) continue;
        
        // Check if this slot is available
        const isSlotTaken = scheduledPosts.some(post => {
          if (post.platform !== platform || !post.scheduledDate) return false;
          const postDate = new Date(post.scheduledDate);
          return Math.abs(postDate.getTime() - slotDateTime.getTime()) < 30 * 60 * 1000; // 30 min buffer
        });
        
        if (!isSlotTaken) {
          suggestions.push(slotDateTime.toISOString());
          if (suggestions.length >= 5) return suggestions; // Return top 5 suggestions
        }
      }
    }
    
    return suggestions;
  }

  getOptimalTimes(platform: string): Array<{hour: number, minute: number}> {
    // Based on best engagement times for each platform
    switch (platform.toLowerCase()) {
      case 'linkedin':
        return [
          {hour: 8, minute: 0},   // 8:00 AM
          {hour: 12, minute: 0},  // 12:00 PM
          {hour: 17, minute: 0},  // 5:00 PM
          {hour: 9, minute: 30},  // 9:30 AM
          {hour: 14, minute: 30}  // 2:30 PM
        ];
      case 'x':
        return [
          {hour: 9, minute: 0},   // 9:00 AM
          {hour: 15, minute: 0},  // 3:00 PM
          {hour: 18, minute: 0},  // 6:00 PM
          {hour: 11, minute: 30}, // 11:30 AM
          {hour: 20, minute: 0}   // 8:00 PM
        ];
      default:
        return [
          {hour: 9, minute: 0},
          {hour: 12, minute: 0},
          {hour: 15, minute: 0},
          {hour: 18, minute: 0}
        ];
    }
  }

  displayPostToSchedule(post: PostToSchedule, currentIndex: number, totalPosts: number): void {
    console.clear();
    console.log(`📅 SCHEDULING POST ${currentIndex + 1}/${totalPosts}`);
    console.log();
    console.log(`Platform: ${post.platform}`);
    console.log(`Title: ${post.title}`);
    console.log();
    console.log('─'.repeat(60));
    console.log(post.content.substring(0, 300) + (post.content.length > 300 ? '...' : ''));
    console.log('─'.repeat(60));
  }

  async schedulePost(post: PostToSchedule, scheduledPosts: ScheduledPost[]): Promise<boolean> {
    this.displayPostToSchedule(post, 0, 1);
    
    console.log('\nSuggested time slots:');
    
    const suggestions = await this.suggestTimeSlots(post.platform, scheduledPosts);
    
    suggestions.forEach((slot, index) => {
      const date = new Date(slot);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      console.log(`${index + 1}. ${dateStr}`);
    });
    
    console.log(`${suggestions.length + 1}. Custom date/time`);
    console.log(`${suggestions.length + 2}. Skip this post`);
    
    const choice = await this.askQuestion(`\nChoice [1-${suggestions.length + 2}]: `);
    const choiceNum = parseInt(choice);
    
    if (choiceNum >= 1 && choiceNum <= suggestions.length) {
      // Use suggested slot
      const selectedDate = suggestions[choiceNum - 1];
      await this.updatePostSchedule(post.id, selectedDate);
      console.log(`\n✅ Post scheduled for ${new Date(selectedDate).toLocaleString()}`);
      return true;
      
    } else if (choiceNum === suggestions.length + 1) {
      // Custom date/time
      return await this.scheduleCustomDateTime(post);
      
    } else if (choiceNum === suggestions.length + 2) {
      // Skip
      console.log('\n⏭️  Skipping post...');
      return false;
      
    } else {
      console.log('Invalid choice. Skipping post.');
      return false;
    }
  }

  async scheduleCustomDateTime(post: PostToSchedule): Promise<boolean> {
    console.log('\n📅 Enter custom date and time:');
    
    const dateStr = await this.askQuestion('Date (YYYY-MM-DD) or "today", "tomorrow": ');
    let targetDate: Date;
    
    const today = new Date();
    
    switch (dateStr.toLowerCase()) {
      case 'today':
        targetDate = new Date(today);
        break;
      case 'tomorrow':
        targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 1);
        break;
      default:
        targetDate = new Date(dateStr + 'T00:00:00');
        if (isNaN(targetDate.getTime())) {
          console.log('❌ Invalid date format. Skipping post.');
          return false;
        }
    }
    
    const timeStr = await this.askQuestion('Time (HH:MM in 24-hour format): ');
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    
    if (!timeMatch) {
      console.log('❌ Invalid time format. Skipping post.');
      return false;
    }
    
    const hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]);
    
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      console.log('❌ Invalid time values. Skipping post.');
      return false;
    }
    
    targetDate.setHours(hour, minute, 0, 0);
    
    // Check if the time is in the past
    if (targetDate <= new Date()) {
      console.log('❌ Cannot schedule posts in the past. Skipping post.');
      return false;
    }
    
    console.log(`\nSchedule post for ${targetDate.toLocaleString()}?`);
    const confirm = await this.askQuestion('Confirm [y/N]: ');
    
    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      await this.updatePostSchedule(post.id, targetDate.toISOString());
      console.log(`\n✅ Post scheduled for ${targetDate.toLocaleString()}`);
      return true;
    }
    
    console.log('Scheduling cancelled.');
    return false;
  }

  async updatePostSchedule(postId: string, scheduledDate: string): Promise<void> {
    await this.notion.pages.update({
      page_id: postId,
      properties: {
        'Status': {
          select: {
            name: 'Scheduled'
          }
        },
        'Scheduled Date': {
          date: {
            start: scheduledDate
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

  async schedulePosts(): Promise<void> {
    try {
      console.log('📅 Starting post scheduling system...');
      
      // Get current schedule
      const scheduledPosts = await this.getScheduledPosts();
      this.displayScheduledPosts(scheduledPosts);
      
      // Get posts ready to schedule
      const postsToSchedule = await this.getPostsToSchedule();
      
      if (postsToSchedule.length === 0) {
        console.log('\n🎉 No posts need scheduling! All approved posts are already scheduled.');
        return;
      }

      console.log(`\n📋 Found ${postsToSchedule.length} post${postsToSchedule.length === 1 ? '' : 's'} ready to schedule.\n`);

      let scheduledCount = 0;

      for (let i = 0; i < postsToSchedule.length; i++) {
        const post = postsToSchedule[i];
        
        console.log(`\n📅 SCHEDULING POST ${i + 1}/${postsToSchedule.length} - ${post.platform.toUpperCase()}`);
        console.log(`Title: ${post.title}`);
        
        const wasScheduled = await this.schedulePost(post, scheduledPosts);
        
        if (wasScheduled) {
          scheduledCount++;
          // Add this post to our scheduledPosts array for conflict checking
          const updatedPost: ScheduledPost = {
            id: post.id,
            title: post.title,
            platform: post.platform,
            scheduledDate: new Date().toISOString(), // This would be the actual scheduled date
            status: 'Scheduled',
            content: post.content
          };
          scheduledPosts.push(updatedPost);
        }
        
        if (i < postsToSchedule.length - 1) {
          const continueChoice = await this.askQuestion('\n[C]ontinue  [Q]uit  [V]iew schedule: ');
          if (continueChoice.toLowerCase() === 'q') {
            break;
          } else if (continueChoice.toLowerCase() === 'v') {
            const currentScheduled = await this.getScheduledPosts();
            this.displayScheduledPosts(currentScheduled);
            await this.askQuestion('\nPress Enter to continue...');
          }
        }
      }
      
      console.log(`\n🎉 Scheduling completed! ${scheduledCount} post${scheduledCount === 1 ? '' : 's'} scheduled.`);
      
      // Show final schedule
      if (scheduledCount > 0) {
        const finalSchedule = await this.getScheduledPosts();
        this.displayScheduledPosts(finalSchedule);
      }
      
    } catch (error) {
      console.error('❌ Error during post scheduling:', error);
      throw error;
    }
  }

  close(): void {
    this.rl.close();
  }
}

async function main() {
  const scheduler = new PostScheduler();
  
  try {
    await scheduler.schedulePosts();
  } catch (error) {
    console.error('❌ Application error:', error);
    process.exit(1);
  } finally {
    scheduler.close();
  }
}

if (import.meta.main) {
  main();
}