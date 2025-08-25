import { 
  initDatabase, 
  getDatabase, 
  posts as postsTable,
  insights as insightsTable,
  transcripts as transcriptsTable
} from '@content-creation/database';
import type { PostView } from '@/types';
import { desc, eq } from 'drizzle-orm';
import PostsClient from './PostsClient';


// Helper function to convert database post to PostView
function convertToPostView(post: any): PostView {
  return {
    id: post.id,
    insightId: post.insightId,
    title: post.title,
    platform: post.platform,
    content: post.content,
    status: post.status,
    characterCount: post.characterCount || undefined,
    createdAt: new Date(post.createdAt),
    updatedAt: new Date(post.updatedAt),
    insightTitle: post.insightTitle || undefined,
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
        content: postsTable.content,
        status: postsTable.status,
        characterCount: postsTable.characterCount,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        insightTitle: insightsTable.title,
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