import prompts from 'prompts';
import { AppConfig, PostPage, Result } from '../lib/types.ts';
import { createNotionClient, posts, getPageContent } from '../lib/notion.ts';
import { display } from '../lib/io.ts';
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
  post: PostPage,
  scheduledPosts: PostPage[],
  config: AppConfig
): Promise<boolean> => {
  const notionClient = createNotionClient(config.notion);
  
  displayPostToSchedule(post, 0, 1);
  
  const suggestions = suggestTimeSlots(post.platform, scheduledPosts);
  
  // Create choices for suggested slots
  const choices = suggestions.map((slot, index) => {
    const date = new Date(slot);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    return {
      title: `📅 ${dateStr}`,
      value: slot
    };
  });
  
  // Add custom and skip options
  choices.push(
    {
      title: '🛠️  Custom date/time',
      description: 'Enter your own date and time',
      value: 'custom'
    },
    {
      title: '⏭️  Skip this post',
      description: 'Don\'t schedule now',
      value: 'skip'
    }
  );
  
  const response = await prompts({
    type: 'select',
    name: 'choice',
    message: 'Choose a time slot for this post:',
    choices: choices
  });
  
  if (!response.choice) {
    console.log('\n⏭️  Skipping post...');
    return false;
  }
  
  if (response.choice === 'skip') {
    console.log('\n⏭️  Skipping post...');
    return false;
  } else if (response.choice === 'custom') {
    // Custom date/time
    return await scheduleCustomDateTime(post, notionClient);
  } else {
    // Use selected suggested slot
    const updateResult = await posts.updateStatus(notionClient, post.id, 'Scheduled', response.choice);
    
    if (updateResult.success) {
      display.success(`Post scheduled for ${new Date(response.choice).toLocaleString()}`);
      return true;
    } else {
      display.error('Failed to schedule post');
      return false;
    }
  }
};

/**
 * Handles custom date/time scheduling
 */
const scheduleCustomDateTime = async (
  post: PostPage,
  notionClient: any
): Promise<boolean> => {
  console.log('\n📅 Enter custom date and time:');
  
  const dateResponse = await prompts({
    type: 'text',
    name: 'date',
    message: 'Date (YYYY-MM-DD) or "today", "tomorrow":'
  });
  
  if (!dateResponse.date) {
    display.info('Custom scheduling cancelled.');
    return false;
  }
  
  const timeResponse = await prompts({
    type: 'text',
    name: 'time', 
    message: 'Time (HH:MM in 24-hour format):'
  });
  
  if (!timeResponse.time) {
    display.info('Custom scheduling cancelled.');
    return false;
  }
  
  const targetDate = parseCustomDateTime(dateResponse.date, timeResponse.time);
  
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
  let scheduledCount = 0;

  try {
    for (let i = 0; i < postsToSchedule.length; i++) {
      const post = postsToSchedule[i];
      
      console.log(`\n📅 SCHEDULING POST ${i + 1}/${postsToSchedule.length} - ${post.platform.toUpperCase()}`);
      console.log(`Title: ${post.title}`);
      
      const wasScheduled = await schedulePost(post, scheduledPosts, config);
      
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
        const continueResponse = await prompts({
          type: 'select',
          name: 'action',
          message: 'What would you like to do next?',
          choices: [
            {
              title: '➡️  Continue',
              description: 'Schedule the next post',
              value: 'continue'
            },
            {
              title: '📅 View Schedule',
              description: 'Show current scheduled posts',
              value: 'view'
            },
            {
              title: '❌ Quit',
              description: 'Stop scheduling posts',
              value: 'quit'
            }
          ]
        });
        
        if (!continueResponse.action || continueResponse.action === 'quit') {
          break;
        } else if (continueResponse.action === 'view') {
          const notionClient = createNotionClient(config.notion);
          const currentScheduledResult = await posts.getScheduled(notionClient, config.notion);
          if (currentScheduledResult.success) {
            const currentScheduled = await populatePostsWithPreviews(notionClient, currentScheduledResult.data);
            displayCurrentSchedule(currentScheduled);
            await prompts({
              type: 'invisible',
              name: 'continue',
              message: 'Press Enter to continue...'
            });
          }
        }
      }
    }
    
    return scheduledCount;
    
  } catch (error) {
    display.error(`Error during post scheduling: ${error}`);
    return scheduledCount;
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