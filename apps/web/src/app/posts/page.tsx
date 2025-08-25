import { 
  initDatabase, 
  getDatabase, 
  posts as postsTable,
  insights as insightsTable,
  transcripts as transcriptsTable
} from '@content-creation/database';
import { desc, eq } from 'drizzle-orm';
import PostsClient from './PostsClient';

// Post view interface - matches the API route
export interface PostView {
  id: string;
  insightId: string;
  title: string;
  platform: 'linkedin' | 'x' | 'instagram' | 'facebook' | 'youtube';
  hook?: string;
  body: string;
  softCta?: string;
  directCta?: string;
  fullContent: string;
  status: 'draft' | 'needs_review' | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived';
  characterCount?: number;
  estimatedEngagementScore?: number;
  hashtags?: string[];
  mentions?: string[];
  processingDurationMs?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Related data
  insightTitle?: string;
  insightCategory?: string;
  transcriptTitle?: string;
}

// Helper function to convert database post to PostView
function convertToPostView(post: any): PostView {
  let hashtags: string[] = [];
  let mentions: string[] = [];
  
  try {
    if (post.hashtags && typeof post.hashtags === 'string') {
      hashtags = JSON.parse(post.hashtags);
    }
    if (post.mentions && typeof post.mentions === 'string') {
      mentions = JSON.parse(post.mentions);
    }
  } catch (error) {
    console.warn('Failed to parse post hashtags or mentions:', error);
  }
  
  return {
    id: post.id,
    insightId: post.insightId,
    title: post.title,
    platform: post.platform,
    hook: post.hook || undefined,
    body: post.body,
    softCta: post.softCta || undefined,
    directCta: post.directCta || undefined,
    fullContent: post.fullContent,
    status: post.status,
    characterCount: post.characterCount || undefined,
    estimatedEngagementScore: post.estimatedEngagementScore || undefined,
    hashtags,
    mentions,
    processingDurationMs: post.processingDurationMs || undefined,
    estimatedTokens: post.estimatedTokens || undefined,
    estimatedCost: post.estimatedCost || undefined,
    createdAt: new Date(post.createdAt),
    updatedAt: new Date(post.updatedAt),
    insightTitle: post.insightTitle || undefined,
    insightCategory: post.insightCategory || undefined,
    transcriptTitle: post.transcriptTitle || undefined,
  };
}

// Server-side data fetching function
async function getPosts(): Promise<PostView[]> {
  try {
    // Initialize database connection
    initDatabase();
    const db = getDatabase();
    
    // Fetch all posts with related insight and transcript data
    const dbPosts = await db
      .select({
        id: postsTable.id,
        insightId: postsTable.insightId,
        title: postsTable.title,
        platform: postsTable.platform,
        hook: postsTable.hook,
        body: postsTable.body,
        softCta: postsTable.softCta,
        directCta: postsTable.directCta,
        fullContent: postsTable.fullContent,
        status: postsTable.status,
        characterCount: postsTable.characterCount,
        estimatedEngagementScore: postsTable.estimatedEngagementScore,
        hashtags: postsTable.hashtags,
        mentions: postsTable.mentions,
        processingDurationMs: postsTable.processingDurationMs,
        estimatedTokens: postsTable.estimatedTokens,
        estimatedCost: postsTable.estimatedCost,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        insightTitle: insightsTable.title,
        insightCategory: insightsTable.category,
        transcriptTitle: transcriptsTable.title
      })
      .from(postsTable)
      .leftJoin(insightsTable, eq(postsTable.insightId, insightsTable.id))
      .leftJoin(transcriptsTable, eq(insightsTable.cleanedTranscriptId, transcriptsTable.id))
      .orderBy(desc(postsTable.createdAt));
    
    // Convert to PostView format
    return dbPosts.map(convertToPostView);
  } catch (error) {
    console.error('Failed to fetch posts on server:', error);
    return [];
  }
}

// Server Component - fetches data and renders the page
export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Fetch posts on the server
  const posts = await getPosts();
  
  // Ensure we always pass a valid array
  const safePosts = Array.isArray(posts) ? posts : [];
  
  // Await searchParams and get initial filter
  const params = await searchParams;
  const filter = params.filter;
  const initialFilter = (typeof filter === 'string' && ['all', 'draft', 'needs_review', 'approved', 'scheduled', 'published', 'failed', 'archived'].includes(filter)) 
    ? filter 
    : 'needs_review';

  return <PostsClient initialPosts={safePosts} initialFilter={initialFilter} />;
}