import prompts from 'prompts';
import { AppConfig, PostPage, Result } from '@content-creation/shared';
import { createNotionClient, posts, getPageContent } from '@content-creation/notion';
import { schedulePostToPlatform, getIntegrations, getScheduledPosts } from '@content-creation/postiz';
import { selectCustomDateTime } from '@content-creation/content-pipeline';
import { display, editWithExternalEditor } from '@content-creation/content-pipeline';
import { updatePostContent } from './post-reviewer.ts';
import { suggestTimeSlots, parseCustomDateTime, formatNumber } from '@content-creation/shared';

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
 * Populates post data with content preview (optimized with parallel requests)
 */
const populatePostsWithPreviews = async (
  notionClient: any,
  posts: PostPage[]
): Promise<PostPage[]> => {
  // Use Promise.all to fetch all previews in parallel for much faster loading
  const previewPromises = posts.map(async (post) => {
    const content = await getPostPreview(notionClient, post.id);
    return { ...post, content };
  });
  
  return await Promise.all(previewPromises);
};

/**
 * Converts Postiz posts to display format
 */
const convertPostizPostsToDisplay = (postizPosts: any[]): any[] => {
  return postizPosts.map(post => ({
    id: post.id,
    platform: post.integration?.identifier || post.integration?.providerIdentifier || 'unknown',  // Use identifier (correct field)
    content: post.content,
    scheduledDate: post.publishDate,
    state: post.state,
    releaseURL: post.releaseURL,
    integrationName: post.integration?.name
  }));
};

/**
 * Displays current posting schedule from Postiz API (real scheduled posts only)
 */
const displayCurrentSchedule = async (config: AppConfig): Promise<void> => {
  console.log('\n📅 CURRENT POSTING SCHEDULE (from Postiz)');
  display.separator();
  
  try {
    // Get real scheduled posts from Postiz API
    const scheduledResult = await getScheduledPosts(config.postiz);
    if (!scheduledResult.success) {
      console.log('❌ Failed to fetch scheduled posts from Postiz');
      return;
    }
    
    const postizPosts = scheduledResult.data;
    if (postizPosts.length === 0) {
      console.log('No upcoming posts scheduled in Postiz.');
      return;
    }

    // Convert to display format and group by platform
    const displayPosts = convertPostizPostsToDisplay(postizPosts);
    const postsByPlatform: Record<string, any[]> = {};
    
    displayPosts.forEach(post => {
      const platform = post.platform;
      if (!postsByPlatform[platform]) {
        postsByPlatform[platform] = [];
      }
      postsByPlatform[platform].push(post);
    });

    Object.keys(postsByPlatform).sort().forEach(platform => {
      console.log(`\n${platform.toUpperCase()}:`);
      
      // Sort posts by scheduled date within each platform
      postsByPlatform[platform]
        .sort((a, b) => {
          const dateA = new Date(a.scheduledDate);
          const dateB = new Date(b.scheduledDate);
          return dateA.getTime() - dateB.getTime();
        })
        .forEach(post => {
          const date = new Date(post.scheduledDate);
          const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          const preview = post.content.length > 60 ? post.content.substring(0, 60) + '...' : post.content;
          const statusIcon = post.state === 'QUEUE' ? '⏱️' : post.state === 'PUBLISHED' ? '✅' : '❓';
          console.log(`  ${statusIcon} ${dateStr}: "${preview}"`);
          if (post.integrationName) {
            console.log(`    └─ via ${post.integrationName}`);
          }
        });
    });
    
    console.log();
  } catch (error) {
    console.log('❌ Error fetching schedule from Postiz:', error.message);
  }
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
  config: AppConfig,
  currentIndex: number = 0,
  totalPosts: number = 1
): Promise<boolean> => {
  const notionClient = createNotionClient(config.notion);
  
  displayPostToSchedule(post, currentIndex, totalPosts);
  
  // Get real scheduled posts from Postiz for time slot suggestions
  let suggestions: string[] = [];
  try {
    const postizScheduledResult = await getScheduledPosts(config.postiz);
    if (postizScheduledResult.success) {
      const postizPosts = convertPostizPostsToDisplay(postizScheduledResult.data);
      suggestions = suggestTimeSlots(post.platform, postizPosts);
    }
  } catch (error) {
    console.log('⚠️  Could not fetch Postiz schedule for suggestions, using basic slots');
    suggestions = suggestTimeSlots(post.platform, []); // Fallback to empty array
  }
  
  // Create choices starting with custom option for flexibility
  const choices = [
    {
      title: '🛠️  Custom date/time',
      description: 'Choose your own date and time',
      value: 'custom'
    }
  ];
  
  // Add suggested time slots if any are available
  if (suggestions.length > 0) {
    suggestions.forEach((slot, index) => {
      const date = new Date(slot);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      choices.push({
        title: `📅 ${dateStr}`,
        description: 'Available time slot',
        value: slot
      });
    });
  }
  
  // Add view schedule, edit and skip options at the end
  choices.push({
    title: '📅 View Schedule',
    description: 'Show current scheduled posts',
    value: 'view'
  });
  
  choices.push({
    title: '✏️  Edit this post',
    description: 'Edit content before scheduling',
    value: 'edit'
  });
  
  choices.push({
    title: '⏭️  Skip this post',
    description: 'Don\'t schedule now',
    value: 'skip'
  });
  
  let currentContent = post.content;
  let keepSelecting = true;
  
  while (keepSelecting) {
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
    } else if (response.choice === 'view') {
      // Show current schedule
      await displayCurrentSchedule(config);
      await prompts({
        type: 'invisible',
        name: 'continue',
        message: 'Press Enter to continue...'
      });
      // Continue the loop to show time slots again
    } else if (response.choice === 'edit') {
      // Edit the post content
      console.log('\n✏️  Opening post in editor...');
      const editedContent = await editWithExternalEditor(currentContent);
      
      if (editedContent) {
        currentContent = editedContent;
        post.content = editedContent; // Update the post object
        
        // Update in Notion
        console.log('💾 Saving edited content to Notion...');
        const updateResult = await updatePostContent(notionClient, post.id, editedContent, post.platform);
        if (updateResult.success) {
          display.success('Post content updated! Continue with scheduling.');
        } else {
          display.error('Failed to save changes to Notion, but continuing with scheduling.');
        }
      } else {
        display.info('Edit cancelled.');
      }
      // Continue the loop to show time slots again
    } else if (response.choice === 'custom') {
      // Custom date/time
      keepSelecting = false;
      return await scheduleCustomDateTime(post, notionClient, config);
    } else {
      keepSelecting = false;
      // Use selected suggested slot - schedule through Postiz
      console.log('\n📤 Scheduling post through Postiz...');
      
      const scheduleResult = await schedulePostToPlatform(
        config.postiz,
        post.platform,
        currentContent,  // Use the potentially edited content
        response.choice
      );
    
    if (scheduleResult.success) {
      // Update Notion with scheduled status and Postiz post ID
      const updateResult = await posts.updateStatus(notionClient, post.id, 'Scheduled', response.choice);
      
      if (updateResult.success) {
        display.success(`Post scheduled through Postiz for ${new Date(response.choice).toLocaleString()}`);
        // Extract post ID from the array response: [{ "postId": "...", "integration": "..." }]
        const postId = Array.isArray(scheduleResult.data) && scheduleResult.data.length > 0 
          ? scheduleResult.data[0].postId 
          : 'unknown';
        console.log(`✅ Postiz Post ID: ${postId}`);
        return true;
      } else {
        display.error('Post scheduled in Postiz but failed to update Notion status');
        return true; // Still count as success since it's scheduled
      }
    } else {
      display.error(`Failed to schedule post through Postiz: ${scheduleResult.error.message}`);
      return false;
    }
    }
  }
};

/**
 * Handles custom date/time scheduling using interactive picker
 */
const scheduleCustomDateTime = async (
  post: PostPage,
  notionClient: any,
  config: AppConfig
): Promise<boolean> => {
  // Use the new interactive date/time picker
  const selection = await selectCustomDateTime();
  
  if (!selection.confirmed) {
    display.info('Custom scheduling cancelled.');
    return false;
  }
  
  const targetDate = selection.dateTime;
  
  console.log('\n📤 Scheduling post through Postiz...');
  
  // Schedule through Postiz first
  const scheduleResult = await schedulePostToPlatform(
    config.postiz,
    post.platform,
    post.content,
    targetDate.toISOString()
  );
  
  if (scheduleResult.success) {
    // Update Notion with scheduled status
    const updateResult = await posts.updateStatus(notionClient, post.id, 'Scheduled', targetDate.toISOString());
    
    if (updateResult.success) {
      display.success(`Post scheduled through Postiz for ${targetDate.toLocaleString()}`);
      // Extract post ID from the array response: [{ "postId": "...", "integration": "..." }]
      const postId = Array.isArray(scheduleResult.data) && scheduleResult.data.length > 0 
        ? scheduleResult.data[0].postId 
        : 'unknown';
      console.log(`✅ Postiz Post ID: ${postId}`);
      return true;
    } else {
      display.error('Post scheduled in Postiz but failed to update Notion status');
      return true; // Still count as success since it's scheduled
    }
  } else {
    display.error(`Failed to schedule post through Postiz: ${scheduleResult.error.message}`);
    return false;
  }
};

/**
 * Schedules a batch of posts interactively
 */
const schedulePostsBatch = async (
  postsToSchedule: PostPage[],
  config: AppConfig
): Promise<number> => {
  let scheduledCount = 0;

  try {
    for (let i = 0; i < postsToSchedule.length; i++) {
      const post = postsToSchedule[i];
      
      console.log(`\n📅 SCHEDULING POST ${i + 1}/${postsToSchedule.length} - ${post.platform.toUpperCase()}`);
      console.log(`Title: ${post.title}`);
      
      const wasScheduled = await schedulePost(post, config, i, postsToSchedule.length);
      
      if (wasScheduled) {
        scheduledCount++;
        if (i < postsToSchedule.length - 1) {
          console.log(`\n✅ Post ${i + 1}/${postsToSchedule.length} scheduled! Auto-advancing to next post...\n`);
        }
      } else {
        // Post was skipped or failed - ask what to do next if there are more posts
        if (i < postsToSchedule.length - 1) {
          const continueResponse = await prompts({
            type: 'select',
            name: 'action',
            message: 'Post was skipped. What would you like to do next?',
            choices: [
              {
                title: '➡️  Continue',
                description: 'Continue with the next post',
                value: 'continue'
              },
              {
                title: '❌ Stop Scheduling',
                description: 'Stop scheduling posts',
                value: 'quit'
              }
            ]
          });
          
          if (!continueResponse.action || continueResponse.action === 'quit') {
            break;
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
 * Creates post selection choices for individual scheduling
 */
const createPostSelectionChoices = (posts: PostPage[]) => {
  return posts.map((post, index) => {
    const preview = post.content.length > 60 ? post.content.substring(0, 60) + '...' : post.content;
    const created = new Date(post.createdTime).toLocaleDateString();
    return {
      title: `📝 ${post.platform} - ${post.title}`,
      description: `${created} • ${preview}`,
      value: index
    };
  });
};

/**
 * Handles individual post selection and scheduling
 */
const scheduleSelectedPosts = async (
  postsToSchedule: PostPage[],
  config: AppConfig
): Promise<number> => {
  const choices = createPostSelectionChoices(postsToSchedule);
  
  // Add option to schedule all posts
  choices.unshift({
    title: '📋 Schedule All Posts',
    description: 'Auto-schedule all posts from the beginning',
    value: 'all'
  });
  
  const response = await prompts({
    type: 'select',
    name: 'selection',
    message: `Select posts to schedule (${postsToSchedule.length} available):`,
    choices: choices
  });
  
  if (response.selection === undefined) {
    return 0;
  }
  
  if (response.selection === 'all') {
    // Auto-schedule flow from beginning
    return await schedulePostsBatch(postsToSchedule, config);
  } else {
    // Schedule individual post
    const selectedPost = postsToSchedule[response.selection];
    const result = await schedulePostsBatch([selectedPost], config);
    
    // Ask if they want to continue with more posts
    const continueResponse = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do next?',
      choices: [
        {
          title: '🔄 Schedule Another Post',
          description: 'Continue scheduling individual posts',
          value: 'continue'
        },
        {
          title: '📋 Schedule All Remaining Posts',
          description: 'Auto-schedule all remaining posts',
          value: 'all'
        },
        {
          title: '✅ Finish Scheduling Session',
          description: 'Stop scheduling posts',
          value: 'finish'
        }
      ]
    });
    
    if (continueResponse.action === 'continue') {
      // Remove the scheduled post and continue with individual selection
      const remainingPosts = postsToSchedule.filter((_, i) => i !== response.selection);
      if (remainingPosts.length > 0) {
        const nextResult = await scheduleSelectedPosts(remainingPosts, config);
        return result + nextResult;
      }
    } else if (continueResponse.action === 'all') {
      // Schedule all remaining posts
      const remainingPosts = postsToSchedule.filter((_, i) => i !== response.selection);
      if (remainingPosts.length > 0) {
        const nextResult = await schedulePostsBatch(remainingPosts, config);
        return result + nextResult;
      }
    }
    
    return result;
  }
};

/**
 * Main post scheduler function
 */
export const runPostScheduler = async (config: AppConfig): Promise<void> => {
  try {
    display.info('Starting post scheduling system...');
    
    const notionClient = createNotionClient(config.notion);
    
    // Display current schedule from Postiz
    await displayCurrentSchedule(config);
    
    // Get posts ready to schedule
    console.log('📋 Fetching posts ready to schedule...');
    const readyResult = await posts.getReadyToSchedule(notionClient, config.notion);
    if (!readyResult.success) {
      throw readyResult.error;
    }
    
    console.log(`📄 Loading content previews for ${readyResult.data.length} posts...`);
    const postsToSchedule = await populatePostsWithPreviews(notionClient, readyResult.data);
    
    if (postsToSchedule.length === 0) {
      display.success('No posts need scheduling! All approved posts are already scheduled.');
      return;
    }

    console.log(`\n📋 Found ${postsToSchedule.length} post${postsToSchedule.length === 1 ? '' : 's'} ready to schedule...\n`);

    // Use the new selection-based scheduling flow
    const scheduledCount = await scheduleSelectedPosts(postsToSchedule, config);
    
    console.log(`\n🎉 Scheduling completed! ${scheduledCount} post${scheduledCount === 1 ? '' : 's'} scheduled.`);
    
    // Show final schedule
    if (scheduledCount > 0) {
      await displayCurrentSchedule(config);
    }
    
    display.success('Post scheduling completed!');
    
  } catch (error) {
    display.error(`Error during post scheduling: ${error}`);
    throw error;
  }
};