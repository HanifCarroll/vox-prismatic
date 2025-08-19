import prompts from 'prompts';
import { AppConfig, PostPage, Result } from '../lib/types.ts';
import { createNotionClient, posts, getPageContent } from '../lib/notion.ts';
import { display, editWithExternalEditor } from '../lib/io.ts';

/**
 * Functional post review module
 */

/**
 * Gets full post content from Notion page
 */
const getPostContent = async (
  notionClient: any,
  postId: string
): Promise<Result<string>> => {
  try {
    let content = '';
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response = await notionClient.blocks.children.list({
        block_id: postId,
        start_cursor: startCursor,
        page_size: 100
      });

      for (const block of response.results) {
        const fullBlock = block as any;
        if (fullBlock.type === 'paragraph' && fullBlock.paragraph?.rich_text) {
          content += fullBlock.paragraph.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        } else if (fullBlock.type === 'heading_3' && fullBlock.heading_3?.rich_text) {
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

    return { success: true, data: content.trim() };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * Gets CTA options for LinkedIn posts
 */
const getCTAOptions = async (
  notionClient: any,
  postId: string
): Promise<{ softCTA?: string; directCTA?: string }> => {
  try {
    let softCTA = '';
    let directCTA = '';
    let isInCTASection = false;

    const response = await notionClient.blocks.children.list({
      block_id: postId,
      page_size: 100
    });

    for (const block of response.results) {
      const fullBlock = block as any;
      
      if (fullBlock.type === 'heading_3' && fullBlock.heading_3?.rich_text) {
        const headingText = fullBlock.heading_3.rich_text.map((text: any) => text.plain_text).join('');
        if (headingText.includes('Call to Action')) {
          isInCTASection = true;
          continue;
        }
      }

      if (isInCTASection && fullBlock.type === 'paragraph' && fullBlock.paragraph?.rich_text) {
        const text = fullBlock.paragraph.rich_text.map((text: any) => text.plain_text).join('');
        if (text.startsWith('**Soft CTA:**')) {
          softCTA = text.replace('**Soft CTA:**', '').trim();
        } else if (text.startsWith('**Direct CTA:**')) {
          directCTA = text.replace('**Direct CTA:**', '').trim();
        }
      }
    }

    return { 
      softCTA: softCTA || undefined, 
      directCTA: directCTA || undefined 
    };
  } catch (error) {
    return {};
  }
};

/**
 * Gets source insight title for a post
 */
const getSourceInsightTitle = async (
  notionClient: any,
  insightId: string
): Promise<string> => {
  try {
    const insight = await notionClient.pages.retrieve({ page_id: insightId });
    const insightData = insight as any;
    return insightData.properties.Title?.title?.[0]?.plain_text || 'Unknown Insight';
  } catch (error) {
    return 'Unknown Insight';
  }
};

/**
 * Populates full post data including content and metadata
 */
const populatePostData = async (
  notionClient: any,
  post: PostPage
): Promise<PostPage> => {
  const contentResult = await getPostContent(notionClient, post.id);
  const content = contentResult.success ? contentResult.data : 'Failed to load content';
  
  let ctaData = {};
  if (post.platform === 'LinkedIn') {
    ctaData = await getCTAOptions(notionClient, post.id);
  }
  
  // Get source insight title if available
  let sourceInsightTitle = post.sourceInsightTitle;
  if (!sourceInsightTitle) {
    // Try to get from properties
    try {
      const pageData = await notionClient.pages.retrieve({ page_id: post.id });
      const insightRelation = pageData.properties['Source Insight']?.relation?.[0];
      if (insightRelation) {
        sourceInsightTitle = await getSourceInsightTitle(notionClient, insightRelation.id);
      }
    } catch (error) {
      // Ignore error, use default
    }
  }
  
  return {
    ...post,
    content,
    sourceInsightTitle,
    ...ctaData
  };
};

/**
 * Displays a post for review
 */
const displayPostForReview = (
  post: PostPage,
  currentIndex: number,
  totalPosts: number
): void => {
  console.clear();
  console.log(`📝 REVIEWING POST ${currentIndex + 1}/${totalPosts} - ${post.platform.toUpperCase()}`);
  console.log();
  console.log(`Platform: ${post.platform}`);
  if (post.sourceInsightTitle) {
    console.log(`Source Insight: "${post.sourceInsightTitle}"`);
  }
  console.log(`Generated: ${new Date(post.createdTime).toLocaleString()}`);
  console.log();
  
  display.separator();
  console.log(post.content);
  display.separator();

  if (post.platform === 'LinkedIn' && (post.softCTA || post.directCTA)) {
    console.log();
    console.log('📢 Call to Action Options:');
    if (post.softCTA) console.log(`  Soft CTA: ${post.softCTA}`);
    if (post.directCTA) console.log(`  Direct CTA: ${post.directCTA}`);
  }

  console.log();
  console.log('[A]pprove  [E]dit  [R]eject  [S]kip  [Q]uit');
};

/**
 * Handles post editing workflow
 */
const editPostContent = async (
  post: PostPage
): Promise<string | null> => {
  const response = await prompts({
    type: 'confirm',
    name: 'edit',
    message: 'Open post in external editor?',
    initial: true
  });

  if (!response.edit) {
    return null;
  }
  
  return await editWithExternalEditor(post.content);
};

/**
 * Updates post content in Notion
 */
const updatePostContent = async (
  notionClient: any,
  postId: string,
  newContent: string,
  platform: string
): Promise<Result<void>> => {
  try {
    // First, delete all existing blocks
    const existingBlocks = await notionClient.blocks.children.list({
      block_id: postId
    });

    for (const block of existingBlocks.results) {
      await notionClient.blocks.delete({
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
          rich_text: [{
            type: 'text',
            text: { content: mainContent.trim() }
          }]
        }
      });
    }

    // Add CTA options for LinkedIn
    if (platform === 'LinkedIn' && (softCTA || directCTA)) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{
            type: 'text',
            text: { content: 'Call to Action Options' }
          }]
        }
      });

      if (softCTA) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: `**Soft CTA:** ${softCTA}` }
            }]
          }
        });
      }

      if (directCTA) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: `**Direct CTA:** ${directCTA}` }
            }]
          }
        });
      }
    }

    // Add all blocks to the post
    if (blocks.length > 0) {
      await notionClient.blocks.children.append({
        block_id: postId,
        children: blocks
      });
    }

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * Reviews a batch of posts interactively
 */
const reviewPostsBatch = async (
  postsToReview: PostPage[],
  config: AppConfig
): Promise<{ approved: number; rejected: number; skipped: number }> => {
  const notionClient = createNotionClient(config.notion);
  
  let approved = 0;
  let rejected = 0;
  let skipped = 0;

  try {
    for (let i = 0; i < postsToReview.length; i++) {
      // Populate full post data
      const post = await populatePostData(notionClient, postsToReview[i]);
      
      let reviewComplete = false;
      
      while (!reviewComplete) {
        displayPostForReview(post, i, postsToReview.length);
        
        const response = await prompts({
          type: 'select',
          name: 'action',
          message: 'What would you like to do with this post?',
          choices: [
            {
              title: '✅ Approve',
              description: 'Mark as ready for scheduling',
              value: 'approve'
            },
            {
              title: '📝 Edit',
              description: 'Edit post content',
              value: 'edit'
            },
            {
              title: '❌ Reject',
              description: 'Mark as rejected',
              value: 'reject'
            },
            {
              title: '⏭️  Skip',
              description: 'Skip for now (no status change)',
              value: 'skip'
            },
            {
              title: '❌ Exit Review',
              description: 'Stop reviewing and return to main menu',
              value: 'quit'
            }
          ],
          initial: 0
        });
        
        // Handle user cancellation (Ctrl+C or ESC)
        if (!response.action) {
          console.log('\n👋 Exiting review process...');
          return { approved, rejected, skipped };
        }
        
        switch (response.action) {
          case 'approve':
            console.log('\n✅ Approving post...');
            const approveResult = await posts.updateStatus(notionClient, post.id, 'Ready to Schedule');
            if (approveResult.success) {
              display.success('Post approved and ready for scheduling!');
              approved++;
            } else {
              display.error('Failed to approve post');
            }
            reviewComplete = true;
            break;
            
          case 'edit':
            const editedContent = await editPostContent(post);
            if (editedContent) {
              console.log('\n💾 Saving changes...');
              const updateResult = await updatePostContent(notionClient, post.id, editedContent, post.platform);
              if (updateResult.success) {
                // Update the post object with new content for display
                post.content = editedContent;
                display.success('Changes saved! Review the updated post.');
              } else {
                display.error('Failed to save changes');
              }
            } else {
              display.info('Edit cancelled.');
            }
            break;
            
          case 'reject':
            const reasonResponse = await prompts({
              type: 'text',
              name: 'reason',
              message: 'Reason for rejection (optional):'
            });
            
            console.log('\n❌ Rejecting post...');
            const rejectResult = await posts.updateStatus(notionClient, post.id, 'Rejected');
            if (rejectResult.success) {
              const reason = reasonResponse.reason;
              display.success(`Post rejected${reason ? ': ' + reason : ''}`);
              rejected++;
            } else {
              display.error('Failed to reject post');
            }
            reviewComplete = true;
            break;
            
          case 'skip':
            display.info('Skipping post (no status change)');
            skipped++;
            reviewComplete = true;
            break;
            
          case 'quit':
            console.log('\n👋 Exiting review process...');
            return { approved, rejected, skipped };
        }
        
        // Auto-continue to next post (no prompt needed - users can quit anytime)
      }
    }
    
    return { approved, rejected, skipped };
    
  } catch (error) {
    display.error(`Error during post review: ${error}`);
    return { approved, rejected, skipped };
  }
};

/**
 * Displays review summary
 */
const displayReviewSummary = (
  approved: number,
  rejected: number,
  skipped: number
): void => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 POST REVIEW SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Approved: ${approved}`);
  console.log(`❌ Rejected: ${rejected}`);
  console.log(`⏭️ Skipped: ${skipped}`);
  console.log('='.repeat(60) + '\n');
  
  if (approved > 0) {
    console.log(`📅 ${approved} posts are now ready for scheduling!`);
    console.log('   Next step: Schedule Posts');
  }
};

/**
 * Main post reviewer function
 */
export const runPostReviewer = async (config: AppConfig): Promise<void> => {
  try {
    display.info('Starting post review process...');
    console.log('Review, edit, and approve generated posts for publication.\n');
    
    const notionClient = createNotionClient(config.notion);
    
    // Get posts that need review
    const postsResult = await posts.getNeedsReview(notionClient, config.notion);
    if (!postsResult.success) {
      throw postsResult.error;
    }
    
    const postsToReview = postsResult.data;
    
    if (postsToReview.length === 0) {
      display.success('No posts need review! All posts are up to date.');
      return;
    }
    
    console.log(`📋 Starting review of ${postsToReview.length} post${postsToReview.length === 1 ? '' : 's'}...\n`);
    
    // Review posts
    const results = await reviewPostsBatch(postsToReview, config);
    
    // Display summary
    displayReviewSummary(results.approved, results.rejected, results.skipped);
    
    display.success('Post review completed!');
    
  } catch (error) {
    display.error(`Error during post review: ${error}`);
    throw error;
  }
};