import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublishResultEntity {
  @ApiProperty({
    description: 'Number of posts processed',
    example: 5
  })
  processed: number;

  @ApiProperty({
    description: 'Number of posts successfully published',
    example: 4
  })
  successful: number;

  @ApiProperty({
    description: 'Number of posts that failed to publish',
    example: 1
  })
  failed: number;

  @ApiProperty({
    description: 'List of error messages for failed posts',
    example: ['Post xyz123 failed: Invalid access token']
  })
  errors: string[];

  @ApiProperty({
    description: 'Timestamp when processing completed',
    example: '2025-08-26T14:30:00Z'
  })
  timestamp: string;
}