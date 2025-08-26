import { ApiProperty } from '@nestjs/swagger';

export class PublishQueueItemEntity {
  @ApiProperty({
    description: 'Scheduled post ID',
    example: 'scheduled_abc123'
  })
  id: string;

  @ApiProperty({
    description: 'Post ID',
    example: 'post_xyz789'
  })
  postId: string;

  @ApiProperty({
    description: 'Platform for publishing',
    example: 'linkedin'
  })
  platform: string;

  @ApiProperty({
    description: 'Content to be published',
    example: 'Check out this amazing insight about resilience...'
  })
  content: string;

  @ApiProperty({
    description: 'Scheduled time for publication',
    example: '2025-08-26T14:30:00Z'
  })
  scheduledTime: string;

  @ApiProperty({
    description: 'Current status of the scheduled post',
    example: 'pending'
  })
  status: string;
}

export class PublishQueueEntity {
  @ApiProperty({
    description: 'Number of posts due for publication',
    example: 3
  })
  postsDue: number;

  @ApiProperty({
    description: 'List of posts pending publication',
    type: [PublishQueueItemEntity]
  })
  posts: PublishQueueItemEntity[];

  @ApiProperty({
    description: 'Timestamp when queue was retrieved',
    example: '2025-08-26T14:30:00Z'
  })
  timestamp: string;
}