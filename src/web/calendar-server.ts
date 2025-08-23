import { createNotionClient, posts } from '../lib/notion.ts';
import { schedulePostToPlatform, getScheduledPosts } from '../lib/postiz.ts';
import type { AppConfig } from '../lib/types.ts';
import { createConfig } from '../lib/config.ts';
import { join } from 'path';

/**
 * Visual calendar scheduler server
 * Provides drag-and-drop interface for post scheduling
 */

let config: AppConfig;

/**
 * Initialize configuration
 */
const initConfig = async (): Promise<void> => {
  try {
    config = createConfig();
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Handle API requests for posts
 */
const handleGetPosts = async (): Promise<Response> => {
  try {
    const notionClient = createNotionClient(config.notion);
    const result = await posts.getReadyToSchedule(notionClient, config.notion);
    
    if (!result.success) {
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    // Add content preview for each post
    const postsWithContent = await Promise.all(
      result.data.map(async (post) => {
        try {
          const response = await notionClient.blocks.children.list({
            block_id: post.id,
            page_size: 5
          });

          let content = '';
          for (const block of response.results) {
            const fullBlock = block as any;
            if (fullBlock.type === 'paragraph' && fullBlock.paragraph?.rich_text) {
              const text = fullBlock.paragraph.rich_text.map((rt: any) => rt.plain_text).join('');
              content += text + ' ';
              if (content.length > 200) break;
            }
          }

          return {
            ...post,
            content: content.trim() || 'No content preview available'
          };
        } catch (error) {
          return {
            ...post,
            content: 'Failed to load content'
          };
        }
      })
    );

    return Response.json({ success: true, data: postsWithContent });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return Response.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
};

/**
 * Handle API requests for scheduled posts
 */
const handleGetScheduled = async (): Promise<Response> => {
  try {
    const result = await getScheduledPosts(config.postiz);
    
    if (!result.success) {
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    // Transform for FullCalendar format
    const events = result.data.map((post: any) => {
      // Get platform from integration.providerIdentifier (lowercase)
      const platform = post.integration?.providerIdentifier || post.platform || 'unknown';
      
      return {
        id: post.id,
        title: `${platform.toUpperCase()}: ${post.content.substring(0, 50)}...`,
        start: post.publishDate || post.scheduledDate,
        backgroundColor: platform === 'linkedin' ? '#0077b5' : '#1da1f2',
        borderColor: platform === 'linkedin' ? '#005885' : '#1991db',
        extendedProps: {
          platform: platform,
          content: post.content,
          integrationName: post.integration?.name,
          fullPost: post // Store the full post data for the modal
        }
      };
    });

    return Response.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    return Response.json({ error: 'Failed to fetch scheduled posts' }, { status: 500 });
  }
};

/**
 * Handle post editing requests
 */
const handleEditPost = async (req: Request): Promise<Response> => {
  try {
    const { postId, content } = await req.json();
    
    console.log(`✏️ Editing post ${postId}`);
    
    const notionClient = createNotionClient(config.notion);
    
    // Update the post content in Notion
    await notionClient.blocks.children.list({
      block_id: postId
    }).then(async (response) => {
      // Delete existing content blocks
      const blockIds = response.results.map((block: any) => block.id);
      for (const blockId of blockIds) {
        await notionClient.blocks.delete({ block_id: blockId });
      }
      
      // Add new content as paragraph blocks
      const paragraphs = content.split('\n').filter((p: string) => p.trim());
      const blocks = paragraphs.map((paragraph: string) => ({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: paragraph }
          }]
        }
      }));
      
      if (blocks.length > 0) {
        await notionClient.blocks.children.append({
          block_id: postId,
          children: blocks
        });
      }
    });

    return Response.json({ 
      success: true, 
      message: 'Post updated successfully'
    });
  } catch (error) {
    console.error('Error editing post:', error);
    return Response.json({ error: 'Failed to edit post' }, { status: 500 });
  }
};

/**
 * Handle post scheduling requests
 */
const handleSchedulePost = async (req: Request): Promise<Response> => {
  try {
    const { postId, platform, content, datetime } = await req.json();
    
    console.log(`📅 Scheduling post ${postId} for ${datetime}`);
    
    const result = await schedulePostToPlatform(
      config.postiz,
      platform,
      content,
      datetime
    );
    
    if (!result.success) {
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    // Update Notion status
    const notionClient = createNotionClient(config.notion);
    await posts.updateStatus(notionClient, postId, 'Scheduled', datetime);

    return Response.json({ 
      success: true, 
      message: 'Post scheduled successfully',
      data: result.data 
    });
  } catch (error) {
    console.error('Error scheduling post:', error);
    return Response.json({ error: 'Failed to schedule post' }, { status: 500 });
  }
};

/**
 * Serve static files
 */
const serveStaticFile = async (filePath: string): Promise<Response> => {
  try {
    const file = Bun.file(filePath);
    const exists = await file.exists();
    
    if (!exists) {
      return new Response('File not found', { status: 404 });
    }
    
    // Determine content type based on file extension
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json'
    };
    
    const contentType = contentTypes[ext || ''] || 'text/plain';
    
    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
  } catch (error) {
    console.error('Error serving static file:', error);
    return new Response('Internal server error', { status: 500 });
  }
};

/**
 * Get the main calendar HTML (now reads from file)
 */
const getCalendarHTML = async (): Promise<Response> => {
  return serveStaticFile('./src/web/static/index.html');
};

/**
 * Start the visual calendar server
 */
export const startCalendarServer = async (): Promise<void> => {
  await initConfig();
  
  const server = Bun.serve({
    port: 3001,
    async fetch(req) {
      const url = new URL(req.url);
      
      // Handle static file requests
      if (url.pathname.startsWith('/static/')) {
        const filePath = join('./src/web', url.pathname);
        return serveStaticFile(filePath);
      }
      
      // Handle API routes
      if (url.pathname === '/api/posts') {
        return handleGetPosts();
      }
      
      if (url.pathname === '/api/scheduled') {
        return handleGetScheduled();
      }
      
      if (url.pathname === '/api/schedule' && req.method === 'POST') {
        return handleSchedulePost(req);
      }
      
      if (url.pathname === '/api/edit-post' && req.method === 'POST') {
        return handleEditPost(req);
      }
      
      // Serve calendar HTML for all other routes
      if (url.pathname === '/' || url.pathname.startsWith('/calendar')) {
        return getCalendarHTML();
      }
      
      return new Response('Not found', { status: 404 });
    }
  });

  console.log(`🌐 Visual calendar scheduler started at http://localhost:${server.port}`);
  console.log(`📅 Drag posts from the sidebar onto the calendar to schedule them!`);
  
  // Auto-open browser (optional)
  try {
    Bun.spawn(['open', `http://localhost:${server.port}`]);
  } catch (error) {
    // Browser opening failed - that's okay
  }
};

// Run if called directly
if (import.meta.main) {
  startCalendarServer().catch(console.error);
}