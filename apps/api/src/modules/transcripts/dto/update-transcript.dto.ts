import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
import { TranscriptStatus } from '@content-creation/types';

export class UpdateTranscriptDto {
  @ApiProperty({ 
    description: 'Title of the transcript',
    minLength: 1,
    maxLength: 500,
    required: false
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Raw content of the transcript',
    required: false
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  rawContent?: string;

  // Status field removed - use TranscriptStateService for state transitions
  // Available transitions: startProcessing(), markCleaned(), markFailed(), retry()

  @ApiProperty({
    description: 'Cleaned content of the transcript',
    required: false
  })
  @IsString()
  @IsOptional()
  cleanedContent?: string;

  @ApiProperty({
    description: 'Last updated timestamp',
    required: false
  })
  @IsOptional()
  updatedAt?: Date;

  @ApiProperty({
    description: 'Processing duration in milliseconds',
    required: false
  })
  @IsOptional()
  processingDurationMs?: number;

  @ApiProperty({
    description: 'Estimated tokens used',
    required: false
  })
  @IsOptional()
  estimatedTokens?: number;

  @ApiProperty({
    description: 'Estimated cost',
    required: false
  })
  @IsOptional()
  estimatedCost?: number;

  @ApiProperty({
    description: 'Queue job ID for async processing',
    required: false
  })
  @IsString()
  @IsOptional()
  queueJobId?: string | null;

  @ApiProperty({
    description: 'Error message if processing failed',
    required: false
  })
  @IsString()
  @IsOptional()
  errorMessage?: string | null;

  @ApiProperty({
    description: 'Timestamp when processing failed',
    required: false
  })
  @IsOptional()
  failedAt?: Date | null;
}