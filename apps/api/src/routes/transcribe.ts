import { Hono } from 'hono';
import { 
  TranscriptionService, 
  type TranscriptionResponse 
} from '../services/transcription';
import { TranscriptRepository } from '../repositories';

// Define the interface locally for now
interface CreateTranscriptData {
  id: string;
  title: string;
  rawContent: string;
  status: 'raw' | 'processing' | 'cleaned' | 'insights_generated' | 'posts_created' | 'error';
  sourceType: 'recording' | 'upload' | 'manual' | 'youtube' | 'podcast' | 'article';
  duration?: number;
  wordCount: number;
  filePath?: string | null;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
}

const transcribe = new Hono();

// Initialize repositories
const transcriptRepo = new TranscriptRepository();

/**
 * POST /transcribe - Stream audio to Deepgram for transcription
 * Handles multipart form data with audio files
 */
transcribe.post('/', async (c) => {
  const startTime = Date.now();
  
  try {
    console.log('🎙️ Starting transcription request...');
    
    // Create transcription service from environment
    const serviceResult = TranscriptionService.createFromEnv();
    if (!serviceResult.success) {
      console.error('❌ Failed to create transcription service:', serviceResult.error.message);
      return c.json(
        { 
          success: false, 
          error: serviceResult.error.message 
        },
        500
      );
    }
    
    const transcriptionService = serviceResult.data;

    // Parse multipart form data
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File;
    const format = formData.get('format') as string;
    const sampleRate = formData.get('sample_rate') as string;
    const channels = formData.get('channels') as string;

    console.log('📁 Received audio file:', {
      name: audioFile?.name,
      size: audioFile ? `${Math.round(audioFile.size / 1024)}KB` : 'unknown',
      type: audioFile?.type,
      format: format,
      sampleRate: sampleRate,
      channels: channels
    });

    // Validate audio file
    const validationResult = TranscriptionService.validateAudioFile(audioFile, format);
    if (!validationResult.success) {
      return c.json(
        { success: false, error: validationResult.error.message },
        400
      );
    }

    // Convert File to Buffer for Deepgram
    const audioArrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    // Parse audio parameters
    const parsedSampleRate = sampleRate ? parseInt(sampleRate) : 16000;
    const parsedChannels = channels ? parseInt(channels) : 1;

    // Transcribe audio
    const transcriptionResult = await transcriptionService.transcribeAudio(
      audioBuffer,
      audioFile,
      validationResult.data.format,
      parsedSampleRate,
      parsedChannels
    );

    if (!transcriptionResult.success) {
      console.error('❌ Transcription failed:', transcriptionResult.error.message);
      return c.json(
        { 
          success: false, 
          error: transcriptionResult.error.message,
          processing_time: (Date.now() - startTime) / 1000
        },
        500
      );
    }

    const { transcript, confidence, wordCount, generatedTitle, processingTime, metadata } = transcriptionResult.data;

    // Save transcript to database
    const now = new Date().toISOString();
    const transcriptId = `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate estimated duration from audio size and sample rate
    const estimatedDurationSeconds = audioFile.size / (2 * parsedSampleRate);
    
    const transcriptData: CreateTranscriptData = {
      id: transcriptId,
      title: generatedTitle,
      rawContent: transcript,
      status: 'raw',
      sourceType: 'recording',
      duration: Math.round(estimatedDurationSeconds),
      wordCount: transcript.split(' ').filter((word: string) => word.length > 0).length,
      filePath: null, // Audio not stored, only transcription
      metadata: JSON.stringify(metadata),
      createdAt: now,
      updatedAt: now
    };

    // Save to database using repository
    const saveResult = await transcriptRepo.create(transcriptData);
    if (!saveResult.success) {
      console.error('❌ Failed to save transcript to database:', saveResult.error.message);
      // Don't fail the request, just log the error
      console.warn('⚠️ Continuing without database save');
    } else {
      console.log('💾 Saved transcript to database:', transcriptId);
    }

    // Prepare response in format expected by desktop app
    const response: TranscriptionResponse = {
      transcript: transcript,
      confidence: confidence,
      processing_time: processingTime,
      word_count: wordCount
    };

    console.log('✅ Transcription request completed successfully');
    return c.json(response);

  } catch (error) {
    const processingTime = (Date.now() - startTime) / 1000;
    console.error('❌ Transcription API error:', error);
    
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown transcription error',
        processing_time: processingTime
      },
      500
    );
  }
});

/**
 * GET /transcribe - API information endpoint
 */
transcribe.get('/', async (c) => {
  return c.json({
    endpoint: '/api/transcribe',
    method: 'POST',
    description: 'Stream audio files to Deepgram for transcription via Hono API server',
    supported_formats: ['opus'],
    required_fields: ['audio'],
    optional_fields: ['format', 'sample_rate', 'channels'],
    server: 'hono',
    version: '1.0.0',
    example_curl: `curl -X POST http://localhost:3001/api/transcribe \\
  -F "audio=@recording.opus" \\
  -F "format=opus" \\
  -F "sample_rate=16000" \\
  -F "channels=1"`
  });
});

export default transcribe;