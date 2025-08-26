import { createClient } from '@deepgram/sdk';
import { createAIClient, type Result } from '../ai';
import { loadPromptTemplate } from '../prompts';

/**
 * Transcription Service for API Server
 * Handles Deepgram integration and AI title generation
 */

export interface TranscriptionConfig {
  deepgramApiKey: string;
  aiConfig?: {
    apiKey: string;
    flashModel: string;
    proModel: string;
  };
}

export interface TranscriptionResponse {
  transcript: string;
  confidence?: number;
  processing_time?: number;
  word_count?: number;
}

export interface TranscriptionResult {
  transcript: string;
  confidence?: number;
  wordCount: number;
  generatedTitle: string;
  processingTime: number;
  metadata: {
    deepgram: {
      model: string;
      confidence?: number;
      word_count: number;
      processing_time: number;
      audio_format: string;
      sample_rate: number;
      channels: number;
      file_size: number;
    };
    source: string;
    original_filename: string;
  };
}

/**
 * Transcription service class
 */
export class TranscriptionService {
  private deepgramClient;
  
  constructor(private config: TranscriptionConfig) {
    this.deepgramClient = createClient(config.deepgramApiKey);
  }

  /**
   * Transcribe audio file using Deepgram
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    audioFile: File,
    format: string = 'opus',
    sampleRate: number = 16000,
    channels: number = 1
  ): Promise<Result<TranscriptionResult>> {
    const startTime = Date.now();

    try {
      console.log('🔄 Processing audio with Deepgram...', {
        size: `${Math.round(audioBuffer.length / 1024)}KB`,
        format,
        sampleRate,
        channels
      });

      // Configure Deepgram transcription options
      const transcriptionOptions = {
        model: 'nova',
        sample_rate: sampleRate,
        channels: channels,
        punctuate: true,
        diarize: false,
        smart_format: true,
        language: 'en',
        endpointing: 100,
        include_metadata: true,
        profanity_filter: false,
        redact: false
      };

      // Transcribe with Deepgram
      const { result, error } = await this.deepgramClient.listen.prerecorded.transcribeFile(
        audioBuffer,
        transcriptionOptions
      );

      if (error) {
        return {
          success: false,
          error: new Error(`Deepgram transcription failed: ${error.message || error}`)
        };
      }

      if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
        return {
          success: false,
          error: new Error('No transcription results received from Deepgram')
        };
      }

      // Extract transcription data
      const alternative = result.results.channels[0].alternatives[0];
      const transcript = alternative.transcript;
      const confidence = alternative.confidence;
      const words = alternative.words || [];
      const wordCount = words.length;
      const processingTime = (Date.now() - startTime) / 1000;

      // Generate AI title
      const generatedTitle = await this.generateTitle(
        transcript,
        audioFile.name.replace(/\.[^/.]+$/, '') || 'Audio Transcription'
      );

      // Prepare metadata
      const metadata = {
        deepgram: {
          model: transcriptionOptions.model,
          confidence: confidence,
          word_count: wordCount,
          processing_time: processingTime,
          audio_format: format,
          sample_rate: sampleRate,
          channels: channels,
          file_size: audioBuffer.length
        },
        source: 'api_server_hono',
        original_filename: audioFile.name
      };

      console.log('✅ Transcription completed:', {
        transcript: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''),
        confidence: confidence,
        wordCount: wordCount,
        processingTime: `${processingTime}s`,
        generatedTitle
      });

      return {
        success: true,
        data: {
          transcript,
          confidence,
          wordCount,
          generatedTitle,
          processingTime,
          metadata
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Generate AI title for transcript
   */
  private async generateTitle(transcript: string, fallbackTitle: string): Promise<string> {
    // If no AI config provided, use fallback
    if (!this.config.aiConfig) {
      console.log('⚠️ No AI config provided, using fallback title');
      return fallbackTitle;
    }

    // If transcript is empty or too short, use fallback
    if (!transcript || transcript.trim().length < 10) {
      return fallbackTitle;
    }

    try {
      console.log('🤖 Generating AI title...');
      
      // Load prompt template
      const promptResult = loadPromptTemplate('generate-transcript-title', {
        TRANSCRIPT_CONTENT: transcript.substring(0, 2000) // Limit for title generation
      });

      if (!promptResult.success) {
        console.warn('⚠️ Failed to load prompt template, using fallback title');
        return fallbackTitle;
      }

      // Initialize AI client
      const { flashModel } = createAIClient(this.config.aiConfig);
      
      // Generate title
      const titleResult = await flashModel.generateContent(promptResult.data);
      const aiTitle = titleResult.response.text().trim();
      
      // Validate AI title
      if (aiTitle && aiTitle.length > 0 && aiTitle.length < 100) {
        console.log('✅ AI-generated title:', aiTitle);
        return aiTitle;
      }
      
      console.warn('⚠️ AI title invalid, using fallback');
      return fallbackTitle;

    } catch (error) {
      console.warn('⚠️ Failed to generate AI title, using fallback:', error);
      return fallbackTitle;
    }
  }

  /**
   * Validate audio file format and parameters
   */
  static validateAudioFile(
    audioFile: File,
    format?: string
  ): Result<{ format: string; isValid: boolean }> {
    if (!audioFile) {
      return {
        success: false,
        error: new Error('No audio file provided')
      };
    }

    // Validate Opus format
    const detectedFormat = format || 'opus';
    if (detectedFormat !== 'opus' && !audioFile.type.includes('opus')) {
      return {
        success: false,
        error: new Error('Only Opus audio format is supported')
      };
    }

    return {
      success: true,
      data: { format: detectedFormat, isValid: true }
    };
  }

  /**
   * Create transcription service instance with environment config
   */
  static createFromEnv(): Result<TranscriptionService> {
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      return {
        success: false,
        error: new Error('DEEPGRAM_API_KEY not found in environment variables')
      };
    }

    const config: TranscriptionConfig = {
      deepgramApiKey
    };

    // Add AI config if available
    const googleAIApiKey = process.env.GOOGLE_AI_API_KEY;
    if (googleAIApiKey) {
      config.aiConfig = {
        apiKey: googleAIApiKey,
        flashModel: process.env.AI_FLASH_MODEL || 'gemini-2.0-flash-exp',
        proModel: process.env.AI_PRO_MODEL || 'gemini-2.0-flash-exp'
      };
    }

    return {
      success: true,
      data: new TranscriptionService(config)
    };
  }
}