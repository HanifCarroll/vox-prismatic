import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';

export enum TranscriptStatus {
  RAW = 'raw',
  PROCESSING = 'processing',
  CLEANED = 'cleaned',
  FAILED = 'failed'
}

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

  @ApiProperty({
    description: 'Status of the transcript',
    enum: TranscriptStatus,
    required: false
  })
  @IsEnum(TranscriptStatus)
  @IsOptional()
  status?: TranscriptStatus;

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
}