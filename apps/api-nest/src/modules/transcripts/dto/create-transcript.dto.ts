import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsUrl, IsNumber, IsPositive, MinLength, MaxLength } from 'class-validator';

export enum SourceType {
  RECORDING = 'recording',
  UPLOAD = 'upload',  
  MANUAL = 'manual',
  YOUTUBE = 'youtube',
  PODCAST = 'podcast',
  ARTICLE = 'article'
}

export class CreateTranscriptDto {
  @ApiProperty({ 
    description: 'Title of the transcript',
    minLength: 1,
    maxLength: 500,
    example: 'My Podcast Episode 1'
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @ApiProperty({
    description: 'Raw content of the transcript',
    example: 'This is the raw transcript content...'
  })
  @IsString()
  @MinLength(1)
  rawContent: string;

  @ApiProperty({
    description: 'Source type of the transcript',
    enum: SourceType,
    default: SourceType.MANUAL
  })
  @IsEnum(SourceType)
  @IsOptional()
  sourceType?: SourceType = SourceType.MANUAL;

  @ApiProperty({
    description: 'Source URL if applicable',
    required: false,
    example: 'https://example.com/video'
  })
  @IsUrl()
  @IsOptional()
  sourceUrl?: string;

  @ApiProperty({
    description: 'Original filename if uploaded',
    required: false,
    example: 'recording.mp3'
  })
  @IsString()
  @IsOptional()
  fileName?: string;

  @ApiProperty({
    description: 'Duration in seconds',
    required: false,
    example: 3600
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  duration?: number;
}