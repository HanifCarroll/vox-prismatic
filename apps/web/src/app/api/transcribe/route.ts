import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';
import { 
  initDatabase, 
  getDatabase, 
  transcripts as transcriptsTable 
} from '@content-creation/database';
import { createAIClient } from '@content-creation/ai';
import { loadPromptTemplate } from '@content-creation/prompts';

// Response type matching desktop app expectations
interface TranscriptionResponse {
  transcript: string;
  confidence?: number;
  processing_time?: number;
  word_count?: number;
}

// POST /api/transcribe - Stream Opus audio to Deepgram for transcription
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Validate Deepgram API key
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      console.error('❌ DEEPGRAM_API_KEY not found in environment variables');
      return NextResponse.json(
        { success: false, error: 'Deepgram API key not configured' },
        { status: 500 }
      );
    }

    // Initialize Deepgram client
    const deepgram = createClient(deepgramApiKey);
    console.log('🎙️ Deepgram client initialized');

    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const format = formData.get('format') as string;
    const sampleRate = formData.get('sample_rate') as string;
    const channels = formData.get('channels') as string;

    // Validate audio file
    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate Opus format
    if (format !== 'opus' && !audioFile.type.includes('opus')) {
      return NextResponse.json(
        { success: false, error: 'Only Opus audio format is supported' },
        { status: 400 }
      );
    }

    console.log('📁 Received audio file:', {
      name: audioFile.name,
      size: `${Math.round(audioFile.size / 1024)}KB`,
      type: audioFile.type,
      format: format,
      sampleRate: sampleRate,
      channels: channels
    });

    // Convert File to Buffer for Deepgram (Node.js/Next.js environment)
    const audioArrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    console.log('🔄 Streaming to Deepgram for transcription...');

    // Configure Deepgram transcription options for Opus
    // Try more flexible settings for better Opus compatibility
    const transcriptionOptions = {
      model: 'nova', // Use base nova model (available in all plans)
      // Remove encoding to let Deepgram auto-detect
      // encoding: 'opus' as const,
      sample_rate: sampleRate ? parseInt(sampleRate) : 16000,
      channels: channels ? parseInt(channels) : 1,
      punctuate: true,
      diarize: false, // Single speaker for most recordings
      smart_format: true,
      language: 'en', // Explicitly set language
      // Reduce endpointing for better speech detection
      endpointing: 100, // 100ms silence detection (more sensitive)
      // Enable confidence scores and word-level timestamps
      include_metadata: true,
      // Add additional debugging options
      profanity_filter: false,
      redact: false
    };

    // Send audio buffer to Deepgram for transcription
    // Note: Using Buffer for Node.js/Next.js environment
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      transcriptionOptions
    );

    if (error) {
      console.error('❌ Deepgram transcription error:', error);
      return NextResponse.json(
        { success: false, error: `Transcription failed: ${error.message || error}` },
        { status: 500 }
      );
    }

    if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
      console.error('❌ No transcription results returned from Deepgram');
      return NextResponse.json(
        { success: false, error: 'No transcription results received' },
        { status: 500 }
      );
    }

    // Extract transcription data
    const alternative = result.results.channels[0].alternatives[0];
    const transcript = alternative.transcript;
    const confidence = alternative.confidence;
    const words = alternative.words || [];
    const wordCount = words.length;
    
    const processingTime = (Date.now() - startTime) / 1000;

    console.log('✅ Transcription completed:', {
      transcript: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''),
      confidence: confidence,
      wordCount: wordCount,
      processingTime: `${processingTime}s`
    });
    
    // Debug: Log full result structure if transcript is empty
    if (!transcript || transcript.length === 0) {
      console.log('🔍 Debug - Empty transcript. Full result structure:');
      console.log('Channels:', result.results.channels.length);
      console.log('Alternatives:', result.results.channels[0].alternatives.length);
      console.log('Metadata:', JSON.stringify(result.metadata, null, 2));
      console.log('Audio duration:', result.metadata?.duration);
      console.log('Audio encoding detected:', result.metadata?.encoding);
    }

    // Generate AI title if transcript has content
    let generatedTitle = audioFile.name.replace(/\.[^/.]+$/, '') || 'Audio Transcription'; // Default title
    
    if (transcript && transcript.trim().length > 0) {
      try {
        console.log('🤖 Generating title with Gemini...');
        
        // Load the prompt template
        const titlePrompt = loadPromptTemplate('generate-transcript-title', {
          TRANSCRIPT_CONTENT: transcript.substring(0, 2000) // Limit to first 2000 chars for title generation
        });
        
        // Initialize AI client
        const aiConfig = {
          apiKey: process.env.GOOGLE_AI_API_KEY || '',
          model: 'gemini-2.0-flash-exp' as const
        };
        const { flashModel } = createAIClient({ ai: aiConfig });
        
        // Generate title
        const titleResult = await flashModel.generateContent(titlePrompt);
        const aiTitle = titleResult.response.text().trim();
        
        if (aiTitle && aiTitle.length > 0 && aiTitle.length < 100) {
          generatedTitle = aiTitle;
          console.log('✅ AI-generated title:', generatedTitle);
        }
      } catch (error) {
        console.warn('⚠️ Failed to generate AI title, using default:', error);
        // Continue with default title if AI generation fails
      }
    }
    
    // Initialize database connection for saving
    initDatabase();
    const db = getDatabase();

    // Create transcript record in database
    const now = new Date().toISOString();
    const transcriptId = `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate estimated duration from audio size and sample rate
    const estimatedDurationSeconds = audioFile.size / (2 * (parseInt(sampleRate) || 16000)); // Rough estimate
    
    const transcriptData = {
      id: transcriptId,
      title: generatedTitle, // Use AI-generated or default title
      content: transcript,
      status: 'raw' as const, // Ready for insight extraction
      sourceType: 'recording' as const,
      durationSeconds: Math.round(estimatedDurationSeconds),
      filePath: null, // Audio not stored, only transcription
      metadata: JSON.stringify({
        deepgram: {
          model: transcriptionOptions.model,
          confidence: confidence,
          word_count: wordCount,
          processing_time: processingTime,
          audio_format: 'opus',
          sample_rate: transcriptionOptions.sample_rate,
          channels: transcriptionOptions.channels,
          file_size: audioFile.size
        },
        source: 'desktop_app_streaming',
        original_filename: audioFile.name
      }),
      createdAt: now,
      updatedAt: now
    };

    // Save to database
    await db.insert(transcriptsTable).values(transcriptData);
    
    console.log('💾 Saved transcript to database:', transcriptId);

    // Prepare response matching desktop app expectations
    const response: TranscriptionResponse = {
      transcript: transcript,
      confidence: confidence,
      processing_time: processingTime,
      word_count: wordCount
    };

    // Return direct response format expected by desktop app
    return NextResponse.json(response);

  } catch (error) {
    const processingTime = (Date.now() - startTime) / 1000;
    console.error('❌ Transcription API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown transcription error',
        processing_time: processingTime
      },
      { status: 500 }
    );
  }
}

// GET /api/transcribe - API information endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/transcribe',
    method: 'POST',
    description: 'Stream Opus audio files to Deepgram for transcription',
    supported_formats: ['opus'],
    required_fields: ['audio'],
    optional_fields: ['format', 'sample_rate', 'channels'],
    example_curl: `curl -X POST http://localhost:3000/api/transcribe \\
  -F "audio=@recording.opus" \\
  -F "format=opus" \\
  -F "sample_rate=16000" \\
  -F "channels=1"`
  });
}