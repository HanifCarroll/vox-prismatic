import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TranscriptionResponseEntity {
  @ApiProperty({
    description: 'The transcribed text',
    example: 'This is the transcribed content from the audio file.'
  })
  transcript: string;

  @ApiPropertyOptional({
    description: 'Confidence score from the transcription service',
    example: 0.95
  })
  confidence?: number;

  @ApiPropertyOptional({
    description: 'Processing time in seconds',
    example: 2.5
  })
  processing_time?: number;

  @ApiPropertyOptional({
    description: 'Number of words in the transcript',
    example: 150
  })
  word_count?: number;
}