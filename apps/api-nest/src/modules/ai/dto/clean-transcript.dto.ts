import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CleanTranscriptDto {
  @ApiProperty({
    description: 'The ID of the transcript to clean',
    example: 'transcript_018c7f24-3b68-7950-9f38-5f3b42c9d523'
  })
  @IsString()
  @IsNotEmpty()
  transcriptId: string;

  @ApiProperty({
    description: 'The title of the transcript',
    example: 'AI and Future of Work Discussion'
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Raw transcript content to be cleaned',
    example: 'Um, so today we are, uh, discussing the impact of AI...'
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Optional custom prompt for cleaning',
    example: 'Remove filler words and format as paragraphs'
  })
  @IsOptional()
  @IsString()
  customPrompt?: string;
}