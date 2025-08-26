import { ApiProperty } from '@nestjs/swagger';

export class DashboardActivityEntity {
  @ApiProperty({
    description: 'Unique identifier for the activity item',
    example: 'insight_abc123'
  })
  id: string;

  @ApiProperty({
    description: 'Type of activity',
    enum: ['insight_created', 'post_created', 'post_scheduled', 'post_published'],
    example: 'insight_created'
  })
  type: 'insight_created' | 'post_created' | 'post_scheduled' | 'post_published';

  @ApiProperty({
    description: 'Title or preview of the activity item',
    example: 'Building resilience in uncertain times'
  })
  title: string;

  @ApiProperty({
    description: 'Timestamp when the activity occurred',
    example: '2025-08-26T14:30:00Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Current status of the activity item',
    example: 'draft'
  })
  status: string;
}