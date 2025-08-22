import { Client } from '@notionhq/client';
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionConfig, TranscriptPage, CleanedTranscriptPage, InsightPage, PostPage, Insight, GeneratedPost, Result } from './types.ts';

/**
 * Functional Notion API operations
 */

/**
 * Creates content blocks for large text, chunking to avoid Notion's 2000 character limit
 */
const createContentBlocks = (content: string): any[] => {
  const maxChunkSize = 1900; // Leave some margin under 2000 limit
  const blocks: any[] = [];
  
  if (content.length <= maxChunkSize) {
    return [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content } }]
        }
      }
    ];
  }
  
  // Split content into chunks at natural break points
  const chunks: string[] = [];
  let remaining = content;
  
  while (remaining.length > 0) {
    if (remaining.length <= maxChunkSize) {
      chunks.push(remaining);
      break;
    }
    
    // Find a good break point (paragraph, sentence, or word boundary)
    let breakPoint = maxChunkSize;
    const chunk = remaining.substring(0, breakPoint);
    
    // Try to break at paragraph boundary
    const lastParagraph = chunk.lastIndexOf('\n\n');
    if (lastParagraph > maxChunkSize * 0.7) {
      breakPoint = lastParagraph + 2;
    } else {
      // Try to break at sentence boundary
      const lastSentence = chunk.lastIndexOf('. ');
      if (lastSentence > maxChunkSize * 0.7) {
        breakPoint = lastSentence + 2;
      } else {
        // Break at word boundary
        const lastSpace = chunk.lastIndexOf(' ');
        if (lastSpace > maxChunkSize * 0.7) {
          breakPoint = lastSpace + 1;
        }
      }
    }
    
    chunks.push(remaining.substring(0, breakPoint));
    remaining = remaining.substring(breakPoint);
  }
  
  // Convert chunks to paragraph blocks
  return chunks.map(chunk => ({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: chunk.trim() } }]
    }
  }));
};

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
      const postData = platform === 'LinkedIn' ? generatedPost.linkedinPost : generatedPost.xPost;
      const title = `${platform === 'LinkedIn' ? 'LI' : 'X'} - ${insightPage.title}`;
      
      // Start with the full post content
      const children: any[] = [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Full Post' } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: postData.full } }]
          }
        }
      ];

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
  },

  getAll: async (client: Client, config: NotionConfig): Promise<Result<PostPage[]>> => {
    const result = await queryDatabase(
      client,
      config.postsDb,
      undefined, // No filter - get all posts
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
      title: page.properties.Title?.title?.[0]?.plain_text || 'Untitled',
      platform: page.properties.Platform?.select?.name || 'Unknown',
      status: page.properties.Status?.select?.name || 'Draft',
      createdTime: page.created_time,
      sourceInsightId: page.properties['Source Insight']?.relation?.[0]?.id || '',
      sourceInsightTitle: '', // Will be populated later if needed
      content: '', // Will be populated later if needed
      softCTA: undefined,
      directCTA: undefined
    }));

    return { success: true, data: postPages };
  }
};

export const cleanedTranscripts = {
  getReadyForProcessing: async (client: Client, config: NotionConfig): Promise<Result<CleanedTranscriptPage[]>> => {
    const result = await queryDatabase(
      client,
      config.cleanedTranscriptsDb,
      {
        property: 'Status',
        select: {
          equals: 'Ready'
        }
      }
    );

    if (!result.success) return result;

    const cleanedPages = result.data.map((page: any) => ({
      id: page.id,
      title: page.properties.Title?.title?.[0]?.plain_text || 'Untitled',
      status: page.properties.Status?.select?.name || 'Unknown',
      sourceTranscriptId: page.properties['Source Transcript']?.relation?.[0]?.id || '',
      createdTime: page.created_time
    }));

    return { success: true, data: cleanedPages };
  },

  getNeedsCleaning: async (client: Client, config: NotionConfig): Promise<Result<TranscriptPage[]>> => {
    const result = await queryDatabase(
      client,
      config.transcriptsDb,
      {
        property: 'Status',
        select: {
          equals: 'Needs Cleaning'
        }
      },
      [
        {
          property: 'Date Recorded',
          direction: 'ascending' as const
        }
      ]
    );

    if (!result.success) return result;

    const transcriptPages = result.data.map((page: any) => ({
      id: page.id,
      title: page.properties.Title?.title?.[0]?.plain_text || 'Untitled',
      status: page.properties.Status?.select?.name || 'Unknown',
      createdTime: page.created_time
    }));

    return { success: true, data: transcriptPages };
  },

  create: async (
    client: Client,
    config: NotionConfig,
    sourceTranscript: TranscriptPage,
    cleanedContent: string
  ): Promise<Result<string>> => {
    try {
      const title = `Cleaned: ${sourceTranscript.title}`;
      
      const page = await client.pages.create({
        parent: {
          database_id: config.cleanedTranscriptsDb
        },
        properties: {
          'Title': {
            title: [{ text: { content: title } }]
          },
          'Status': {
            select: { name: 'Ready' }
          },
          'Source Transcript': {
            relation: [{ id: sourceTranscript.id }]
          }
        },
        children: createContentBlocks(cleanedContent)
      });

      return { success: true, data: page.id };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  },

  getBySourceTranscript: async (
    client: Client,
    config: NotionConfig,
    sourceTranscriptId: string
  ): Promise<Result<CleanedTranscriptPage | null>> => {
    try {
      const response = await client.databases.query({
        database_id: config.cleanedTranscriptsDb,
        filter: {
          property: 'Source Transcript',
          relation: {
            contains: sourceTranscriptId
          }
        },
        page_size: 1
      });

      if (response.results.length === 0) {
        return { success: true, data: null };
      }

      const page = response.results[0] as any;
      const cleanedTranscript: CleanedTranscriptPage = {
        id: page.id,
        title: page.properties.Title?.title?.[0]?.plain_text || 'Untitled',
        status: page.properties.Status?.select?.name || 'Unknown',
        sourceTranscriptId: sourceTranscriptId,
        createdTime: page.created_time
      };

      return { success: true, data: cleanedTranscript };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  },

  updateStatus: async (client: Client, cleanedTranscriptId: string, status: string): Promise<Result<void>> => {
    try {
      await client.pages.update({
        page_id: cleanedTranscriptId,
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