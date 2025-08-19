import { Client } from '@notionhq/client';
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionConfig, TranscriptPage, InsightPage, PostPage, Insight, GeneratedPost, Result } from './types.ts';

/**
 * Functional Notion API operations
 */

/**
 * Creates a Notion client
 */
export const createNotionClient = (config: NotionConfig): Client =>
  new Client({ auth: config.apiKey });

/**
 * Generic database query function
 */
const queryDatabase = async (
  client: Client,
  databaseId: string,
  filter?: any,
  sorts?: any[]
): Promise<Result<any[]>> => {
  try {
    const response = await client.databases.query({
      database_id: databaseId,
      filter,
      sorts
    });
    return { success: true, data: response.results };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * Gets page content as text
 */
export const getPageContent = async (client: Client, pageId: string): Promise<Result<string>> => {
  try {
    let content = '';
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response = await client.blocks.children.list({
        block_id: pageId,
        start_cursor: startCursor,
        page_size: 100
      });

      for (const block of response.results) {
        const fullBlock = block as BlockObjectResponse;
        if (fullBlock.type === 'paragraph' && 'paragraph' in fullBlock && fullBlock.paragraph.rich_text) {
          content += fullBlock.paragraph.rich_text.map((text: any) => text.plain_text).join('') + '\n';
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
 * Transcript operations
 */
export const transcripts = {
  getPending: async (client: Client, config: NotionConfig): Promise<Result<TranscriptPage[]>> => {
    const result = await queryDatabase(
      client,
      config.transcriptsDb,
      {
        property: 'Status',
        select: {
          equals: 'Needs Processing'
        }
      }
    );

    if (!result.success) return result;

    const transcripts = result.data.map((page: any) => ({
      id: page.id,
      title: page.properties.Title?.title?.[0]?.plain_text || 'Untitled',
      status: page.properties.Status?.select?.name || 'Unknown'
    }));

    return { success: true, data: transcripts };
  },

  updateStatus: async (client: Client, transcriptId: string, status: string): Promise<Result<void>> => {
    try {
      await client.pages.update({
        page_id: transcriptId,
        properties: {
          'Status': {
            select: { name: status }
          }
        }
      });
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
};

/**
 * Insight operations
 */
export const insights = {
  getNeedsReview: async (client: Client, config: NotionConfig): Promise<Result<InsightPage[]>> => {
    const result = await queryDatabase(
      client,
      config.insightsDb,
      {
        property: 'Status',
        select: {
          equals: 'Needs Review'
        }
      },
      [
        {
          property: 'Score',
          direction: 'descending' as const
        }
      ]
    );

    if (!result.success) return result;

    const insightPages = result.data.map((page: any) => ({
      id: page.id,
      title: page.properties.Title?.title?.[0]?.plain_text || 'Untitled',
      score: page.properties.Score?.number || 0,
      status: page.properties.Status?.select?.name || 'Unknown',
      postType: page.properties['Post Type']?.select?.name || 'Unknown',
      summary: page.properties.Summary?.rich_text?.[0]?.plain_text || '',
      verbatimQuote: page.properties['Verbatim Quote']?.rich_text?.[0]?.plain_text || ''
    }));

    return { success: true, data: insightPages };
  },

  getReadyForPosts: async (client: Client, config: NotionConfig): Promise<Result<InsightPage[]>> => {
    const result = await queryDatabase(
      client,
      config.insightsDb,
      {
        property: 'Status',
        select: {
          equals: 'Ready for Posts'
        }
      },
      [
        {
          property: 'Score',
          direction: 'descending' as const
        }
      ]
    );

    if (!result.success) return result;

    const insightPages = result.data.map((page: any) => ({
      id: page.id,
      title: page.properties.Title?.title?.[0]?.plain_text || 'Untitled',
      score: page.properties.Score?.number || 0,
      status: page.properties.Status?.select?.name || 'Unknown',
      postType: page.properties['Post Type']?.select?.name || 'Unknown',
      category: page.properties.Category?.select?.name || '',
      summary: page.properties.Summary?.rich_text?.[0]?.plain_text || '',
      verbatimQuote: page.properties['Verbatim Quote']?.rich_text?.[0]?.plain_text || '',
      transcriptId: page.properties.Transcript?.relation?.[0]?.id
    }));

    return { success: true, data: insightPages };
  },

  create: async (client: Client, config: NotionConfig, insight: Insight, sourceTranscriptId: string): Promise<Result<void>> => {
    try {
      await client.pages.create({
        parent: {
          database_id: config.insightsDb
        },
        properties: {
          'Title': {
            title: [{ text: { content: insight.title } }]
          },
          'Score': {
            number: insight.scores.total
          },
          'Post Type': {
            select: { name: insight.postType }
          },
          'Summary': {
            rich_text: [{ text: { content: insight.summary || '' } }]
          },
          'Verbatim Quote': {
            rich_text: [{ text: { content: insight.quote || '' } }]
          },
          'Status': {
            select: { name: 'Needs Review' }
          },
          'Transcript': {
            relation: [{ id: sourceTranscriptId }]
          },
          'Hooks': {
            rich_text: [{ text: { content: (insight.hooks || []).map((hook, index) => `${index + 1}. ${hook}`).join('\n') } }]
          }
        },
        children: [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: 'Summary' } }]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: insight.summary } }]
            }
          },
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: 'Verbatim Quote' } }]
            }
          },
          {
            object: 'block',
            type: 'quote',
            quote: {
              rich_text: [{ type: 'text', text: { content: insight.quote } }]
            }
          }
        ]
      });
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  },

  updateStatus: async (client: Client, insightId: string, status: string): Promise<Result<void>> => {
    try {
      await client.pages.update({
        page_id: insightId,
        properties: {
          'Status': {
            select: { name: status }
          }
        }
      });
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
};

/**
 * Post operations
 */
export const posts = {
  getNeedsReview: async (client: Client, config: NotionConfig): Promise<Result<PostPage[]>> => {
    const result = await queryDatabase(
      client,
      config.postsDb,
      {
        property: 'Status',
        select: {
          equals: 'Needs Review'
        }
      },
      [
        {
          property: 'Created time',
          direction: 'ascending' as const
        }
      ]
    );

    if (!result.success) return result;

    const postPages: PostPage[] = [];
    
    for (const page of result.data) {
      const pageData = page as any;
      const post: PostPage = {
        id: page.id,
        title: pageData.properties.Title?.title?.[0]?.plain_text || 'Untitled Post',
        platform: pageData.properties.Platform?.select?.name || 'Unknown',
        status: pageData.properties.Status?.select?.name || 'Unknown',
        createdTime: pageData.created_time,
        content: '', // Will be populated by separate content fetch
      };

      postPages.push(post);
    }

    return { success: true, data: postPages };
  },

  getReadyToSchedule: async (client: Client, config: NotionConfig): Promise<Result<PostPage[]>> => {
    const result = await queryDatabase(
      client,
      config.postsDb,
      {
        property: 'Status',
        select: {
          equals: 'Ready to Schedule'
        }
      },
      [
        {
          property: 'Created time',
          direction: 'ascending' as const
        }
      ]
    );

    if (!result.success) return result;

    const postPages = result.data.map((page: any) => ({
      id: page.id,
      title: page.properties.Title?.title?.[0]?.plain_text || 'Untitled Post',
      platform: page.properties.Platform?.select?.name || 'Unknown',
      status: page.properties.Status?.select?.name || 'Unknown',
      content: '', // Will be populated separately
    }));

    return { success: true, data: postPages };
  },

  getScheduled: async (client: Client, config: NotionConfig): Promise<Result<PostPage[]>> => {
    const result = await queryDatabase(
      client,
      config.postsDb,
      {
        property: 'Status',
        select: {
          equals: 'Scheduled'
        }
      },
      [
        {
          property: 'Scheduled Date',
          direction: 'ascending' as const
        }
      ]
    );

    if (!result.success) return result;

    const postPages = result.data.map((page: any) => ({
      id: page.id,
      title: page.properties.Title?.title?.[0]?.plain_text || 'Untitled Post',
      platform: page.properties.Platform?.select?.name || 'Unknown',
      status: page.properties.Status?.select?.name || 'Unknown',
      scheduledDate: page.properties['Scheduled Date']?.date?.start || undefined,
      content: '', // Will be populated separately
    }));

    return { success: true, data: postPages };
  },

  create: async (client: Client, config: NotionConfig, insightPage: InsightPage, generatedPost: GeneratedPost, platform: 'LinkedIn' | 'X'): Promise<Result<void>> => {
    try {
      const postContent = platform === 'LinkedIn' ? generatedPost.linkedinPost : generatedPost.xPost;
      const title = `${platform === 'LinkedIn' ? 'LI' : 'X'} - ${insightPage.title}`;
      
      const children: any[] = [{
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: postContent } }]
        }
      }];

      // Add CTA options for LinkedIn posts
      if (platform === 'LinkedIn') {
        children.push(
          {
            object: 'block',
            type: 'heading_3',
            heading_3: {
              rich_text: [{ type: 'text', text: { content: 'Call to Action Options' } }]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: `**Soft CTA:** ${generatedPost.softCTA}` } }]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: `**Direct CTA:** ${generatedPost.directCTA}` } }]
            }
          }
        );
      }

      await client.pages.create({
        parent: {
          database_id: config.postsDb
        },
        properties: {
          'Title': {
            title: [{ text: { content: title } }]
          },
          'Platform': {
            select: { name: platform }
          },
          'Status': {
            select: { name: 'Needs Review' }
          },
          'Source Insight': {
            relation: [{ id: insightPage.id }]
          }
        },
        children
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  },

  updateStatus: async (client: Client, postId: string, status: string, scheduledDate?: string): Promise<Result<void>> => {
    try {
      const properties: any = {
        'Status': {
          select: { name: status }
        }
      };

      if (scheduledDate && status === 'Scheduled') {
        properties['Scheduled Date'] = {
          date: { start: scheduledDate }
        };
      }

      await client.pages.update({
        page_id: postId,
        properties
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
};