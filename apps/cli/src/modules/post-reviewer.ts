import prompts from 'prompts';
import { AppConfig, PostPage, Result } from '@content-creation/shared';
import { createNotionClient, posts, insights, cleanedTranscripts, getPageContent } from '@content-creation/notion';
import { createAIClient, loadPromptTemplate, estimateTokens, estimateCost } from '@content-creation/ai';
import { display, editWithExternalEditor } from '@content-creation/content-pipeline';
import { createReviewSession, recordReviewDecision, endReviewSession } from '@content-creation/shared';

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
};

/**
 * Preloads post data in parallel
 */
const preloadPostData = async (
  notionClient: any,
  post: PostPage
): Promise<PostPage> => {
  try {
    return await populatePostData(notionClient, post);
  } catch (error) {
    console.error(`Failed to preload post data for ${post.title}:`, error);
    return post; // Return basic post data if preload fails
  }
};

/**
 * Handles post editing workflow
 */
const editPostContent = async (
  post: PostPage
): Promise<string | null> => {
  return await editWithExternalEditor(post.content);
};

/**
 * Gets insight content and metadata for regeneration
 */
const getInsightForRegeneration = async (
  notionClient: any,
  insightId: string
): Promise<{
  content: string;
  metadata: {
    title: string;
    postType: string;
    score: number;
    summary: string;
    verbatimQuote: string;
  }
} | null> => {
  try {
    // Get insight metadata
    const insightPage = await notionClient.pages.retrieve({ page_id: insightId });
    const properties = insightPage.properties;
    
    // Get insight content
    const contentResult = await getPageContent(notionClient, insightId);
    const content = contentResult.success ? contentResult.data : '';
    
    return {
      content,
      metadata: {
        title: properties.Title?.title?.[0]?.plain_text || '',
        postType: properties['Post Type']?.select?.name || '',
        score: properties.Score?.number || 0,
        summary: properties.Summary?.rich_text?.[0]?.plain_text || '',
        verbatimQuote: properties['Verbatim Quote']?.rich_text?.[0]?.plain_text || ''
      }
    };
  } catch (error) {
    console.error('Error fetching insight:', error);
    return null;
  }
};

/**
 * Gets cleaned transcript content for regeneration
 */
const getCleanedTranscriptForRegeneration = async (
  notionClient: any,
  sourceTranscriptId: string
): Promise<string> => {
  try {
    // Find the cleaned transcript for this source
    const cleanedResult = await cleanedTranscripts.getBySourceTranscript(notionClient, { cleanedTranscriptsId: process.env.NOTION_CLEANED_TRANSCRIPTS_DATABASE_ID }, sourceTranscriptId);
    
    if (cleanedResult.success && cleanedResult.data) {
      const contentResult = await getPageContent(notionClient, cleanedResult.data.id);
      return contentResult.success ? contentResult.data : '';
    }
    
    return '';
  } catch (error) {
    console.error('Error fetching cleaned transcript:', error);
    return '';
  }
};

/**
 * Regenerates a post with custom user prompt
 */
const regeneratePostWithPrompt = async (
  post: PostPage,
  customPrompt: string,
  config: AppConfig
): Promise<Result<{ newContent: string; cost: number; duration: number }>> => {
  const startTime = Date.now();
  const notionClient = createNotionClient(config.notion);
  const { proModel } = createAIClient(config.ai);
  
  try {
    // Get the source insight ID from the post
    const postData = await notionClient.pages.retrieve({ page_id: post.id });
    const insightRelation = postData.properties['Source Insight']?.relation?.[0];
    
    if (!insightRelation) {
      return { success: false, error: new Error('No source insight found for this post') };
    }
    
    // Get insight data
    const insightData = await getInsightForRegeneration(notionClient, insightRelation.id);
    if (!insightData) {
      return { success: false, error: new Error('Failed to load insight data') };
    }
    
    // Get source transcript ID from insight
    const insightPage = await notionClient.pages.retrieve({ page_id: insightRelation.id });
    const transcriptRelation = insightPage.properties['Source Transcript']?.relation?.[0];
    
    let cleanedTranscriptContent = '';
    if (transcriptRelation) {
      cleanedTranscriptContent = await getCleanedTranscriptForRegeneration(notionClient, transcriptRelation.id);
    }
    
    // Create custom regeneration prompt
    const regenerationPrompt = `You are regenerating a ${post.platform} social media post based on user feedback.

**User's Feedback/Request:**
${customPrompt}

**Original Post Content:**
${post.content}

**Source Insight Details:**
Title: ${insightData.metadata.title}
Type: ${insightData.metadata.postType}
Score: ${insightData.metadata.score}
Summary: ${insightData.metadata.summary}
Verbatim Quote: ${insightData.metadata.verbatimQuote}

**Full Insight Content:**
${insightData.content}

**Cleaned Transcript Context:**
${cleanedTranscriptContent}

Please regenerate the ${post.platform} post incorporating the user's feedback while maintaining the core insight. Return ONLY the new post content as plain text, without any formatting, headers, or explanations.`;
    
    const result = await proModel.generateContent(regenerationPrompt, {
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.4
      }
    });
    
    const response = await result.response;
    const newContent = response.text().trim();
    
    const duration = Date.now() - startTime;
    const inputTokens = estimateTokens(regenerationPrompt);
    const outputTokens = estimateTokens(newContent);
    const cost = estimateCost(inputTokens, outputTokens, 'pro');
    
    return {
      success: true,
      data: { newContent, cost, duration }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error as Error
    };
  }
};

/**
 * Updates post content in Notion
 */
export const updatePostContent = async (
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
 * Reviews a batch of posts interactively with parallel preloading and navigation
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
    // Create analytics session
    const sessionId = createReviewSession('post');
    
    // Cache for preloaded post data
    const postCache = new Map<string, PostPage>();
    
    // Preload first post
    if (postsToReview.length > 0) {
      const firstData = await preloadPostData(notionClient, postsToReview[0]);
      postCache.set(postsToReview[0].id, firstData);
    }
    
    let currentIndex = 0;
    
    while (currentIndex >= 0 && currentIndex < postsToReview.length) {
      const postBase = postsToReview[currentIndex];
      
      // Preload next post if not already cached
      if (currentIndex + 1 < postsToReview.length) {
        const nextPost = postsToReview[currentIndex + 1];
        if (!postCache.has(nextPost.id)) {
          // Start preloading in background (don't await)
          preloadPostData(notionClient, nextPost).then(data => {
            postCache.set(nextPost.id, data);
          }).catch(() => {
            // Ignore preload errors - will load synchronously if needed
          });
        }
      }
      
      // Get current post data from cache or load it
      let post = postCache.get(postBase.id);
      if (!post) {
        post = await preloadPostData(notionClient, postBase);
        postCache.set(postBase.id, post);
      }
      
      let reviewComplete = false;
      
      while (!reviewComplete) {
        displayPostForReview(post, currentIndex, postsToReview.length);
        
        // Build choices dynamically based on position
        const choices = [
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
            title: '🔄 Regenerate with Prompt',
            description: 'Regenerate post with custom AI prompt',
            value: 'regenerate'
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
          }
        ];
        
        // Add Previous option if not on first post
        if (currentIndex > 0) {
          choices.push({
            title: '⬅️  Previous',
            description: 'Go back to previous post',
            value: 'previous'
          });
        }
        
        choices.push({
          title: '❌ Exit Review',
          description: 'Stop reviewing and return to main menu',
          value: 'quit'
        });
        
        const response = await prompts({
          type: 'select',
          name: 'action',
          message: 'What would you like to do with this post?',
          choices,
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
              // Record analytics
              recordReviewDecision(sessionId, 'post', {
                id: post.id,
                title: post.title,
                action: 'approved',
                timestamp: new Date().toISOString(),
                metadata: {
                  platform: post.platform,
                  sourceInsightId: post.sourceInsightId
                }
              });
            } else {
              display.error('Failed to approve post');
            }
            currentIndex++;
            reviewComplete = true;
            break;
            
          case 'edit':
            const editedContent = await editPostContent(post);
            if (editedContent) {
              console.log('\n💾 Saving changes...');
              const updateResult = await updatePostContent(notionClient, post.id, editedContent, post.platform);
              if (updateResult.success) {
                // Auto-approve the edited post
                console.log('✅ Auto-approving edited post...');
                const approveResult = await posts.updateStatus(notionClient, post.id, 'Ready to Schedule');
                if (approveResult.success) {
                  // Update the post object with new content for display
                  post.content = editedContent;
                  display.success('Post edited and approved! Ready for scheduling.');
                  approved++;
                  // Record analytics
                  recordReviewDecision(sessionId, 'post', {
                    id: post.id,
                    title: post.title,
                    action: 'edited',
                    timestamp: new Date().toISOString(),
                    metadata: {
                      platform: post.platform,
                      sourceInsightId: post.sourceInsightId,
                      editReason: 'Manual edit - auto-approved'
                    }
                  });
                  currentIndex++;
                  reviewComplete = true;
                } else {
                  display.error('Content saved but failed to approve post');
                  // Still exit the loop even if approval failed - content is saved
                  currentIndex++;
                  reviewComplete = true;
                }
              } else {
                display.error('Failed to save changes');
              }
            } else {
              display.info('Edit cancelled.');
            }
            break;
            
          case 'regenerate':
            const promptResponse = await prompts({
              type: 'text',
              name: 'customPrompt',
              message: 'Enter your regeneration prompt (what should be changed/improved):',
              validate: (value: string) => value.length > 0 ? true : 'Please enter a prompt'
            });
            
            if (promptResponse.customPrompt) {
              console.log('\n🤖 Regenerating post with AI...');
              display.info(`Prompt: "${promptResponse.customPrompt}"`);
              
              const regenResult = await regeneratePostWithPrompt(post, promptResponse.customPrompt, config);
              
              if (regenResult.success) {
                const { newContent, cost, duration } = regenResult.data;
                console.log(`\n✨ Post regenerated in ${duration}ms`);
                console.log(`💰 Cost: $${cost.toFixed(6)}`);
                console.log('\n💾 Saving regenerated post...');
                
                const updateResult = await updatePostContent(notionClient, post.id, newContent, post.platform);
                if (updateResult.success) {
                  post.content = newContent;
                  display.success('Post regenerated and saved! Review the new version.');
                  // Record analytics
                  recordReviewDecision(sessionId, 'post', {
                    id: post.id,
                    title: post.title,
                    action: 'regenerated',
                    timestamp: new Date().toISOString(),
                    metadata: {
                      platform: post.platform,
                      sourceInsightId: post.sourceInsightId,
                      regenerationPrompt: promptResponse.customPrompt
                    }
                  });
                } else {
                  display.error('Failed to save regenerated post');
                }
              } else {
                display.error(`Regeneration failed: ${regenResult.error.message}`);
              }
            } else {
              display.info('Regeneration cancelled.');
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
              // Record analytics
              recordReviewDecision(sessionId, 'post', {
                id: post.id,
                title: post.title,
                action: 'rejected',
                timestamp: new Date().toISOString(),
                metadata: {
                  platform: post.platform,
                  sourceInsightId: post.sourceInsightId,
                  editReason: reason || 'No reason provided'
                }
              });
            } else {
              display.error('Failed to reject post');
            }
            currentIndex++;
            reviewComplete = true;
            break;
            
          case 'skip':
            display.info('Skipping post (no status change)');
            skipped++;
            // Record analytics
            recordReviewDecision(sessionId, 'post', {
              id: post.id,
              title: post.title,
              action: 'skipped',
              timestamp: new Date().toISOString(),
              metadata: {
                platform: post.platform,
                sourceInsightId: post.sourceInsightId
              }
            });
            currentIndex++;
            reviewComplete = true;
            break;
            
          case 'previous':
            currentIndex--;
            reviewComplete = true;
            break;
            
          case 'quit':
            console.log('\n👋 Exiting review process...');
            endReviewSession(sessionId);
            return { approved, rejected, skipped };
        }
        
        // Auto-continue to next post (no prompt needed - users can quit anytime)
      }
    }
    
    // End session when complete
    endReviewSession(sessionId);
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
 * Creates post selection choices for individual review
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
 * Handles individual post selection and review
 */
const reviewSelectedPosts = async (
  postsToReview: PostPage[],
  config: AppConfig
): Promise<{ approved: number; rejected: number; skipped: number }> => {
  const choices = createPostSelectionChoices(postsToReview);
  
  // Add option to review all posts
  choices.unshift({
    title: '📋 Review All Posts',
    description: 'Auto-review all posts from the beginning',
    value: 'all'
  });
  
  const response = await prompts({
    type: 'select',
    name: 'selection',
    message: `Select posts to review (${postsToReview.length} available):`,
    choices: choices
  });
  
  if (response.selection === undefined) {
    return { approved: 0, rejected: 0, skipped: 0 };
  }
  
  if (response.selection === 'all') {
    // Auto-review flow from beginning
    return await reviewPostsBatch(postsToReview, config);
  } else {
    // Review individual post
    const selectedPost = postsToReview[response.selection];
    const result = await reviewPostsBatch([selectedPost], config);
    
    // Ask if they want to continue with more posts
    const continueResponse = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do next?',
      choices: [
        {
          title: '🔄 Review Another Post',
          description: 'Continue reviewing individual posts',
          value: 'continue'
        },
        {
          title: '📋 Review All Remaining Posts',
          description: 'Auto-review all remaining posts',
          value: 'all'
        },
        {
          title: '✅ Finish Review Session',
          description: 'Stop reviewing posts',
          value: 'finish'
        }
      ]
    });
    
    if (continueResponse.action === 'continue') {
      // Remove the reviewed post and continue with individual selection
      const remainingPosts = postsToReview.filter((_, i) => i !== response.selection);
      if (remainingPosts.length > 0) {
        const nextResult = await reviewSelectedPosts(remainingPosts, config);
        return {
          approved: result.approved + nextResult.approved,
          rejected: result.rejected + nextResult.rejected,
          skipped: result.skipped + nextResult.skipped
        };
      }
    } else if (continueResponse.action === 'all') {
      // Review all remaining posts
      const remainingPosts = postsToReview.filter((_, i) => i !== response.selection);
      if (remainingPosts.length > 0) {
        const nextResult = await reviewPostsBatch(remainingPosts, config);
        return {
          approved: result.approved + nextResult.approved,
          rejected: result.rejected + nextResult.rejected,
          skipped: result.skipped + nextResult.skipped
        };
      }
    }
    
    return result;
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
    
    console.log(`📋 Found ${postsToReview.length} post${postsToReview.length === 1 ? '' : 's'} needing review...\n`);
    
    // Use the new selection-based review flow
    const results = await reviewSelectedPosts(postsToReview, config);
    
    // Display summary
    displayReviewSummary(results.approved, results.rejected, results.skipped);
    
    display.success('Post review completed!');
    
  } catch (error) {
    display.error(`Error during post review: ${error}`);
    throw error;
  }
};