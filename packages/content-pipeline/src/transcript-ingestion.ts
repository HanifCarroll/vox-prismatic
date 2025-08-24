import { Result } from '@content-creation/shared';
import { createTranscript, initDatabase, type CreateTranscriptData } from '@content-creation/database';

/**
 * Functional transcript ingestion utilities
 * Handles saving transcripts from external sources (desktop app, file uploads, etc.)
 */

/**
 * Saves a transcript from external source to database
 */
export const saveTranscript = (data: {
  title: string;
  content: string;
  sourceType: 'recording' | 'video' | 'article' | 'manual';
  durationSeconds?: number;
  metadata?: Record<string, any>;
}): Result<{ id: string; title: string }> => {
  try {
    // Ensure database is initialized
    initDatabase();

    const transcriptData: CreateTranscriptData = {
      title: data.title,
      content: data.content,
      sourceType: data.sourceType,
      durationSeconds: data.durationSeconds,
      metadata: data.metadata
    };

    const result = createTranscript(transcriptData);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: {
        id: result.data.id,
        title: result.data.title
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Saves multiple transcripts in batch
 */
export const saveTranscriptsBatch = (
  transcripts: Array<{
    title: string;
    content: string;
    sourceType: 'recording' | 'video' | 'article' | 'manual';
    durationSeconds?: number;
    metadata?: Record<string, any>;
  }>
): Result<{ saved: number; failed: number; results: Array<{ id?: string; title: string; error?: string }> }> => {
  try {
    initDatabase();
    
    let saved = 0;
    let failed = 0;
    const results: Array<{ id?: string; title: string; error?: string }> = [];

    for (const transcript of transcripts) {
      const result = saveTranscript(transcript);
      if (result.success) {
        saved++;
        results.push({
          id: result.data.id,
          title: result.data.title
        });
      } else {
        failed++;
        results.push({
          title: transcript.title,
          error: result.error.message
        });
      }
    }

    return {
      success: true,
      data: { saved, failed, results }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Validates transcript content before saving
 */
export const validateTranscript = (data: {
  title: string;
  content: string;
  sourceType: string;
}): Result<{ isValid: true }> => {
  const errors: string[] = [];

  // Check required fields
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!data.content || data.content.trim().length === 0) {
    errors.push('Content is required');
  }

  if (!data.sourceType || !['recording', 'video', 'article', 'manual'].includes(data.sourceType)) {
    errors.push('Valid sourceType is required (recording, video, article, or manual)');
  }

  // Check content length (minimum)
  if (data.content && data.content.trim().length < 50) {
    errors.push('Content must be at least 50 characters long');
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: new Error(`Validation failed: ${errors.join(', ')}`)
    };
  }

  return {
    success: true,
    data: { isValid: true }
  };
};