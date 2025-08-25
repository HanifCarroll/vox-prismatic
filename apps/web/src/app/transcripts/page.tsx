import type { TranscriptView } from '@content-creation/database';
import { 
  initDatabase, 
  getDatabase, 
  transcripts as transcriptsTable,
  type Transcript
} from '@content-creation/database';
import { desc } from 'drizzle-orm';
import TranscriptsClient from './TranscriptsClient';

// Helper function to convert database transcript to TranscriptView
function convertToTranscriptView(transcript: Transcript): TranscriptView {
  
  // Use rawContent if available, fallback to cleanedContent, then empty string
  const content = transcript.rawContent || transcript.cleanedContent || '';
  
  // Log warnings for potential schema issues (helps detect problems during development)
  if (!transcript.rawContent && !transcript.cleanedContent) {
    console.warn('⚠️ Transcript missing both rawContent and cleanedContent:', transcript.id);
  }
  if (transcript.rawContent && transcript.cleanedContent) {
    console.debug('📄 Transcript has both raw and cleaned content:', transcript.id);
  }
  
  return {
    id: transcript.id,
    title: transcript.title,
    status: transcript.status as TranscriptView['status'],
    sourceType: transcript.sourceType as TranscriptView['sourceType'] || 'upload',
    rawContent: content,
    wordCount: content.split(' ').filter(word => word.length > 0).length,
    duration: transcript.duration || undefined,
    createdAt: new Date(transcript.createdAt),
    updatedAt: new Date(transcript.updatedAt)
  };
}

// Server-side data fetching function
async function getTranscripts(): Promise<TranscriptView[]> {
  try {
    // Initialize database connection
    initDatabase();
    const db = getDatabase();
    
    // Fetch all transcripts, ordered by creation date
    const dbTranscripts = await db
      .select()
      .from(transcriptsTable)
      .orderBy(desc(transcriptsTable.createdAt));
    
    // Convert to TranscriptView format
    return dbTranscripts.map(convertToTranscriptView);
  } catch (error) {
    console.error('Failed to fetch transcripts on server:', error);
    return [];
  }
}

// Server Component - fetches data and renders the page
export default async function TranscriptsPage() {
  // Fetch transcripts on the server
  const transcripts = await getTranscripts();

  return <TranscriptsClient initialTranscripts={transcripts} />;
}