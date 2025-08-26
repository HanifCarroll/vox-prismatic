import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, DeepgramClient } from '@deepgram/sdk';

export interface DeepgramTranscriptionResult {
  transcript: string;
  confidence: number;
  wordCount: number;
  processingTime: number;
  metadata: {
    model: string;
    confidence: number;
    word_count: number;
    processing_time: number;
    audio_format: string;
    sample_rate: number;
    channels: number;
    file_size: number;
  };
}

export interface Result<T, E = Error> {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
}

@Injectable()
export class DeepgramService {
  private readonly logger = new Logger(DeepgramService.name);
  private deepgramClient: DeepgramClient;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('DEEPGRAM_API_KEY');
    if (!apiKey) {
      this.logger.warn('Deepgram API key not configured');
    } else {
      this.deepgramClient = createClient(apiKey);
      this.logger.log('Deepgram client initialized');
    }
  }

  /**
   * Validate audio file format
   */
  validateAudioFile(
    file: Express.Multer.File,
    format?: string,
  ): Result<{ format: string; isValid: boolean }> {
    const supportedFormats = ['opus', 'mp3', 'wav', 'flac', 'm4a', 'webm'];
    
    // Determine format from file or parameter
    let audioFormat = format;
    if (!audioFormat && file.mimetype) {
      const mimeToFormat: Record<string, string> = {
        'audio/opus': 'opus',
        'audio/ogg': 'opus',
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/wav': 'wav',
        'audio/wave': 'wav',
        'audio/x-wav': 'wav',
        'audio/flac': 'flac',
        'audio/mp4': 'm4a',
        'audio/webm': 'webm',
      };
      audioFormat = mimeToFormat[file.mimetype];
    }

    if (!audioFormat || !supportedFormats.includes(audioFormat)) {
      return {
        success: false,
        error: new Error(`Unsupported audio format: ${audioFormat || 'unknown'}`),
      };
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: new Error(`File too large. Maximum size is 100MB, got ${Math.round(file.size / 1024 / 1024)}MB`),
      };
    }

    return {
      success: true,
      data: { format: audioFormat, isValid: true },
    };
  }

  /**
   * Transcribe audio using Deepgram
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    format: string = 'opus',
    sampleRate: number = 16000,
    channels: number = 1,
  ): Promise<Result<DeepgramTranscriptionResult>> {
    if (!this.deepgramClient) {
      return {
        success: false,
        error: new Error('Deepgram client not initialized. Check API key configuration.'),
      };
    }

    const startTime = Date.now();

    try {
      this.logger.log('Processing audio with Deepgram...', {
        size: `${Math.round(audioBuffer.length / 1024)}KB`,
        format,
        sampleRate,
        channels,
      });

      // Configure Deepgram transcription options
      const transcriptionOptions = {
        model: 'nova-2',
        sample_rate: sampleRate,
        channels: channels,
        punctuate: true,
        diarize: false,
        smart_format: true,
        language: 'en',
        endpointing: 100,
        profanity_filter: false,
        redact: false,
      };

      // Transcribe with Deepgram
      const { result, error } = await this.deepgramClient.listen.prerecorded.transcribeFile(
        audioBuffer,
        transcriptionOptions,
      );

      if (error) {
        this.logger.error('Deepgram transcription error:', error);
        return {
          success: false,
          error: new Error(`Deepgram transcription failed: ${error.message}`),
        };
      }

      // Extract transcript and metadata
      const channel = result?.results?.channels?.[0];
      const alternative = channel?.alternatives?.[0];
      
      if (!alternative?.transcript) {
        return {
          success: false,
          error: new Error('No transcript generated from audio'),
        };
      }

      const transcript = alternative.transcript;
      const confidence = alternative.confidence || 0;
      const words = alternative.words || [];
      const wordCount = words.length;
      const processingTime = (Date.now() - startTime) / 1000;

      this.logger.log(`Transcription completed in ${processingTime}s`, {
        wordCount,
        confidence,
      });

      return {
        success: true,
        data: {
          transcript,
          confidence,
          wordCount,
          processingTime,
          metadata: {
            model: 'nova-2',
            confidence,
            word_count: wordCount,
            processing_time: processingTime,
            audio_format: format,
            sample_rate: sampleRate,
            channels: channels,
            file_size: audioBuffer.length,
          },
        },
      };
    } catch (error) {
      this.logger.error('Unexpected error during transcription:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown transcription error'),
      };
    }
  }

  /**
   * Check if Deepgram service is configured
   */
  isConfigured(): boolean {
    return !!this.deepgramClient;
  }
}