import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';

export enum TranscriptStatus {
  RAW = 'raw',
  PROCESSING = 'processing', 
  CLEANED = 'cleaned',
  ERROR = 'error'
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
}