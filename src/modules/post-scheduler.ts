import { AppConfig, PostPage, Result } from '../lib/types.ts';
import { createNotionClient, posts, getPageContent } from '../lib/notion.ts';
import { createReadlineInterface, askQuestion, closeReadlineInterface, display } from '../lib/io.ts';
import { suggestTimeSlots, parseCustomDateTime, formatNumber } from '../lib/utils.ts';

/**
 * Functional post scheduling module
 */

/**
 * Gets post content preview (first 100 characters)
 */
const getPostPreview = async (
  notionClient: any,
  postId: string
): Promise<string> => {
  try {
    const response = await notionClient.blocks.children.list({
      block_id: postId,
      page_size: 10
    });

    let content = '';
    for (const block of response.results) {
      const fullBlock = block as any;
      if (fullBlock.type === 'paragraph' && fullBlock.paragraph?.rich_text) {
        const text = fullBlock.paragraph.rich_text.map((rt: any) => rt.plain_text).join('');
        content += text + ' ';
        if (content.length > 100) break;
      }
    }

    return content.trim();
  } catch (error) {
    return 'Failed to load content';
  }
};

/**
 * Populates post data with content preview
 */
const populatePostsWithPreviews = async (
  notionClient: any,
  posts: PostPage[]
): Promise<PostPage[]> => {
  const postsWithContent: PostPage[] = [];
  
  for (const post of posts) {
    const content = await getPostPreview(notionClient, post.id);
    postsWithContent.push({ ...post, content });
  }
  
  return postsWithContent;
};

/**
 * Displays current posting schedule organized by platform
 */
const displayCurrentSchedule = (scheduledPosts: PostPage[]): void => {
  console.log('\n📅 CURRENT POSTING SCHEDULE');
  display.separator();
  
  if (scheduledPosts.length === 0) {
    console.log('No posts currently scheduled.');
    return;
  }

  // Group by platform
  const postsByPlatform: Record<string, PostPage[]> = {};
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
      const dateStr = date ? 
        date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
        'No date';
      const preview = post.content.length > 60 ? post.content.substring(0, 60) + '...' : post.content;
      console.log(`  - ${dateStr}: "${preview}"`);
    });
  });
  
  console.log();
};

/**
 * Displays post to be scheduled
 */
const displayPostToSchedule = (
  post: PostPage,
  currentIndex: number,
  totalPosts: number
): void => {
  console.clear();
  console.log(`📅 SCHEDULING POST ${currentIndex + 1}/${totalPosts}`);
  console.log();
  console.log(`Platform: ${post.platform}`);
  console.log(`Title: ${post.title}`);
  console.log();
  display.line();
  console.log(post.content.substring(0, 300) + (post.content.length > 300 ? '...' : ''));
  display.line();
};

/**
 * Handles scheduling a single post with time slot suggestions
 */
const schedulePost = async (
  rl: readline.Interface,
  post: PostPage,
  scheduledPosts: PostPage[],
  config: AppConfig
): Promise<boolean> => {
  const ask = askQuestion(rl);
  const notionClient = createNotionClient(config.notion);
  
  displayPostToSchedule(post, 0, 1);
  
  console.log('\nSuggested time slots:');
  
  const suggestions = suggestTimeSlots(post.platform, scheduledPosts);
  
  suggestions.forEach((slot, index) => {
    const date = new Date(slot);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    console.log(`${index + 1}. ${dateStr}`);
  });
  
  console.log(`${suggestions.length + 1}. Custom date/time`);
  console.log(`${suggestions.length + 2}. Skip this post`);
  
  const choice = await ask(`\nChoice [1-${suggestions.length + 2}]: `);
  const choiceNum = parseInt(choice);
  
  if (choiceNum >= 1 && choiceNum <= suggestions.length) {
    // Use suggested slot
    const selectedDate = suggestions[choiceNum - 1];
    const updateResult = await posts.updateStatus(notionClient, post.id, 'Scheduled', selectedDate);
    
    if (updateResult.success) {
      console.log(`\n✅ Post scheduled for ${new Date(selectedDate).toLocaleString()}`);
      return true;
    } else {
      display.error('Failed to schedule post');
      return false;
    }
    
  } else if (choiceNum === suggestions.length + 1) {
    // Custom date/time
    return await scheduleCustomDateTime(rl, post, notionClient);
    
  } else if (choiceNum === suggestions.length + 2) {
    // Skip
    console.log('\n⏭️  Skipping post...');
    return false;
    
  } else {
    display.error('Invalid choice. Skipping post.');
    return false;
  }
};

/**
 * Handles custom date/time scheduling
 */
const scheduleCustomDateTime = async (
  rl: readline.Interface,
  post: PostPage,
  notionClient: any
): Promise<boolean> => {
  const ask = askQuestion(rl);
  
  console.log('\n📅 Enter custom date and time:');
  
  const dateStr = await ask('Date (YYYY-MM-DD) or "today", "tomorrow": ');
  const timeStr = await ask('Time (HH:MM in 24-hour format): ');
  
  const targetDate = parseCustomDateTime(dateStr, timeStr);
  
  if (!targetDate) {
    display.error('Invalid date/time format. Skipping post.');
    return false;
  }
  
  console.log(`\nSchedule post for ${targetDate.toLocaleString()}?`);
  const confirm = await ask('Confirm [y/N]: ');
  
  if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
    const updateResult = await posts.updateStatus(notionClient, post.id, 'Scheduled', targetDate.toISOString());
    
    if (updateResult.success) {
      console.log(`\n✅ Post scheduled for ${targetDate.toLocaleString()}`);
      return true;
    } else {
      display.error('Failed to schedule post');
      return false;
    }
  }
  
  console.log('Scheduling cancelled.');
  return false;
};

/**
 * Schedules a batch of posts interactively
 */
const schedulePostsBatch = async (
  postsToSchedule: PostPage[],
  scheduledPosts: PostPage[],
  config: AppConfig
): Promise<number> => {
  const rl = createReadlineInterface();
  const ask = askQuestion(rl);
  let scheduledCount = 0;

  try {
    for (let i = 0; i < postsToSchedule.length; i++) {
      const post = postsToSchedule[i];
      
      console.log(`\n📅 SCHEDULING POST ${i + 1}/${postsToSchedule.length} - ${post.platform.toUpperCase()}`);
      console.log(`Title: ${post.title}`);
      
      const wasScheduled = await schedulePost(rl, post, scheduledPosts, config);
      
      if (wasScheduled) {
        scheduledCount++;
        // Add this post to our scheduledPosts array for conflict checking
        const updatedPost: PostPage = {
          ...post,
          status: 'Scheduled',
          scheduledDate: new Date().toISOString() // This would be the actual scheduled date
        };
        scheduledPosts.push(updatedPost);
      }
      
      if (i < postsToSchedule.length - 1) {
        const continueChoice = await ask('\n[C]ontinue  [Q]uit  [V]iew schedule: ');
        if (continueChoice.toLowerCase() === 'q') {
          break;
        } else if (continueChoice.toLowerCase() === 'v') {
          const notionClient = createNotionClient(config.notion);
          const currentScheduledResult = await posts.getScheduled(notionClient, config.notion);
          if (currentScheduledResult.success) {
            const currentScheduled = await populatePostsWithPreviews(notionClient, currentScheduledResult.data);
            displayCurrentSchedule(currentScheduled);
            await ask('\nPress Enter to continue...');
          }
        }
      }
    }
    
    return scheduledCount;
    
  } finally {
    closeReadlineInterface(rl);
  }
};

/**
 * Main post scheduler function
 */
export const runPostScheduler = async (config: AppConfig): Promise<void> => {
  try {
    display.info('Starting post scheduling system...');
    
    const notionClient = createNotionClient(config.notion);
    
    // Get current schedule
    const scheduledResult = await posts.getScheduled(notionClient, config.notion);
    if (!scheduledResult.success) {
      throw scheduledResult.error;
    }
    
    const scheduledPosts = await populatePostsWithPreviews(notionClient, scheduledResult.data);
    displayCurrentSchedule(scheduledPosts);
    
    // Get posts ready to schedule
    const readyResult = await posts.getReadyToSchedule(notionClient, config.notion);
    if (!readyResult.success) {
      throw readyResult.error;
    }
    
    const postsToSchedule = await populatePostsWithPreviews(notionClient, readyResult.data);
    
    if (postsToSchedule.length === 0) {
      display.success('No posts need scheduling! All approved posts are already scheduled.');
      return;
    }

    console.log(`\n📋 Found ${postsToSchedule.length} post${postsToSchedule.length === 1 ? '' : 's'} ready to schedule.\n`);

    // Schedule posts
    const scheduledCount = await schedulePostsBatch(postsToSchedule, scheduledPosts, config);
    
    console.log(`\n🎉 Scheduling completed! ${scheduledCount} post${scheduledCount === 1 ? '' : 's'} scheduled.`);
    
    // Show final schedule
    if (scheduledCount > 0) {
      const finalScheduleResult = await posts.getScheduled(notionClient, config.notion);
      if (finalScheduleResult.success) {
        const finalSchedule = await populatePostsWithPreviews(notionClient, finalScheduleResult.data);
        displayCurrentSchedule(finalSchedule);
      }
    }
    
    display.success('Post scheduling completed!');
    
  } catch (error) {
    display.error(`Error during post scheduling: ${error}`);
    throw error;
  }
};