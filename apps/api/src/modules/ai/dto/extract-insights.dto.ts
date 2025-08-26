import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExtractInsightsDto {
  @ApiProperty({
    description: 'The ID of the cleaned transcript',
    example: 'transcript_018c7f24-3b68-7950-9f38-5f3b42c9d523'
  })
  @IsString()
  @IsNotEmpty()
  transcriptId: string;

  @ApiProperty({
    description: 'Cleaned transcript content to extract insights from',
    example: 'Today we discussed the transformative impact of AI on various industries...'
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Optional custom prompt for insight extraction',
    example: 'Focus on actionable business insights and controversial opinions'
  })
  @IsOptional()
  @IsString()
  customPrompt?: string;
}