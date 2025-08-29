import { ApiProperty } from '@nestjs/swagger';
import { SourceType, TranscriptStatus } from '@content-creation/types';

export class TranscriptEntity {
  @ApiProperty({ example: 'cm123abc456' })
  id: string;

  @ApiProperty({ example: 'My Podcast Episode 1' })
  title: string;

  @ApiProperty({ example: 'This is the raw transcript content...' })
  rawContent: string;

  @ApiProperty({ 
    required: false,
    example: 'This is the cleaned transcript content...' 
  })
  cleanedContent?: string;

  @ApiProperty({ enum: TranscriptStatus, example: TranscriptStatus.CLEANED })
  status: TranscriptStatus;

  @ApiProperty({ 
    enum: SourceType, 
    required: false,
    example: SourceType.PODCAST 
  })
  sourceType?: SourceType;

  @ApiProperty({ 
    required: false,
    example: 'https://example.com/podcast.mp3' 
  })
  sourceUrl?: string;

  @ApiProperty({ 
    required: false,
    example: 'podcast-episode-1.mp3' 
  })
  fileName?: string;

  @ApiProperty({ 
    required: false,
    example: 3600 
  })
  duration?: number;

  @ApiProperty({ example: 1500 })
  wordCount: number;

  @ApiProperty({ 
    required: false,
    example: '/uploads/transcripts/file.mp3' 
  })
  filePath?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ 
    required: false,
    example: 'clean-transcript-cm123abc456' 
  })
  queueJobId?: string;

  @ApiProperty({
    description: 'Error message if processing failed',
    required: false
  })
  errorMessage?: string | null;

  @ApiProperty({
    description: 'Timestamp when processing failed',
    required: false
  })
  failedAt?: Date | null;

  constructor(partial: Partial<TranscriptEntity>) {
    Object.assign(this, partial);
  }
}