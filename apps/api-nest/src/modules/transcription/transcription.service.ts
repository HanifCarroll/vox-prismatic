import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TranscriptionResponseEntity, ApiInfoEntity } from './entities';
import { TranscribeAudioDto } from './dto';

// Import existing transcription service
import { 
  TranscriptionService as HonoTranscriptionService,
  TranscriptionResponse
} from '../../../../api/src/services/transcription';
import { generateId } from '../../../../api/src/lib/id-generator';

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

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async transcribeAudio(audioFile: Express.Multer.File, audioDto: TranscribeAudioDto): Promise<TranscriptionResponseEntity> {
    const startTime = Date.now();
    this.logger.log('Starting transcription request');

    try {
      // Create transcription service from environment
      const serviceResult = HonoTranscriptionService.createFromEnv();
      if (!serviceResult.success) {
        this.logger.error('Failed to create transcription service:', serviceResult.error.message);
        throw new BadRequestException(serviceResult.error.message);
      }

      const transcriptionService = serviceResult.data;

      this.logger.log(`Received audio file: ${audioFile.originalname}, size: ${Math.round(audioFile.size / 1024)}KB, type: ${audioFile.mimetype}`);

      // Validate audio file
      const validationResult = HonoTranscriptionService.validateAudioFile(audioFile, audioDto.format);
      if (!validationResult.success) {
        throw new BadRequestException(validationResult.error.message);
      }

      // Parse audio parameters
      const parsedSampleRate = audioDto.sample_rate ? parseInt(audioDto.sample_rate) : 16000;
      const parsedChannels = audioDto.channels ? parseInt(audioDto.channels) : 1;

      // Convert file buffer for Deepgram
      const audioBuffer = Buffer.from(audioFile.buffer);

      // Create a File-like object for the service
      const fileForService = new File([audioBuffer], audioFile.originalname, {
        type: audioFile.mimetype
      });

      // Transcribe audio
      const transcriptionResult = await transcriptionService.transcribeAudio(
        audioBuffer,
        fileForService,
        validationResult.data.format,
        parsedSampleRate,
        parsedChannels
      );

      if (!transcriptionResult.success) {
        this.logger.error('Transcription failed:', transcriptionResult.error.message);
        throw new BadRequestException(transcriptionResult.error.message);
      }

      const { transcript, confidence, wordCount, generatedTitle, processingTime, metadata } = transcriptionResult.data;

      // Save transcript to database
      await this.saveTranscriptToDatabase(transcript, generatedTitle, audioFile, metadata, parsedSampleRate);

      // Prepare response in format expected by desktop app
      const response: TranscriptionResponseEntity = {
        transcript: transcript,
        confidence: confidence,
        processing_time: processingTime,
        word_count: wordCount
      };

      this.logger.log('Transcription request completed successfully');
      return response;

    } catch (error) {
      const processingTime = (Date.now() - startTime) / 1000;
      this.logger.error('Transcription API error:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown transcription error'
      );
    }
  }

  private async saveTranscriptToDatabase(
    transcript: string, 
    generatedTitle: string, 
    audioFile: Express.Multer.File, 
    metadata: any,
    sampleRate: number
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      const transcriptId = generateId('transcript');
      
      // Calculate estimated duration from audio size and sample rate
      const estimatedDurationSeconds = audioFile.size / (2 * sampleRate);
      
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

      // Save to database using Prisma
      await this.prisma.transcript.create({
        data: {
          id: transcriptData.id,
          title: transcriptData.title,
          rawContent: transcriptData.rawContent,
          status: transcriptData.status,
          sourceType: transcriptData.sourceType,
          duration: transcriptData.duration,
          wordCount: transcriptData.wordCount,
          filePath: transcriptData.filePath,
        }
      });

      this.logger.log(`Saved transcript to database: ${transcriptId}`);
    } catch (error) {
      this.logger.error('Failed to save transcript to database:', error);
      // Don't fail the request, just log the error
      this.logger.warn('Continuing without database save');
    }
  }

  getApiInfo(): ApiInfoEntity {
    return {
      endpoint: '/api/transcription',
      method: 'POST',
      description: 'Stream audio files to Deepgram for transcription via NestJS API server',
      supported_formats: ['opus', 'mp3', 'wav'],
      required_fields: ['audio'],
      optional_fields: ['format', 'sample_rate', 'channels'],
      server: 'nestjs',
      version: '1.0.0',
      example_curl: `curl -X POST http://localhost:3001/api/transcription \\
  -F "audio=@recording.opus" \\
  -F "format=opus" \\
  -F "sample_rate=16000" \\
  -F "channels=1"`
    };
  }
}