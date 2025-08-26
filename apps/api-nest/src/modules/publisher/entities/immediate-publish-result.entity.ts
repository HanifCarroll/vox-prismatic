import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImmediatePublishResultEntity {
  @ApiProperty({
    description: 'ID of the published post',
    example: 'post_abc123'
  })
  postId: string;

  @ApiPropertyOptional({
    description: 'External post ID from the platform',
    example: 'urn:li:share:1234567890'
  })
  externalPostId?: string;

  @ApiProperty({
    description: 'Platform where the post was published',
    example: 'linkedin'
  })
  platform: string;

  @ApiProperty({
    description: 'Timestamp when the post was published',
    example: '2025-08-26T14:30:00Z'
  })
  timestamp: string;
}

export class RetryPublishResultEntity {
  @ApiProperty({
    description: 'ID of the scheduled post that was retried',
    example: 'scheduled_abc123'
  })
  scheduledPostId: string;

  @ApiPropertyOptional({
    description: 'External post ID from the platform',
    example: 'urn:li:share:1234567890'
  })
  externalPostId?: string;

  @ApiProperty({
    description: 'Platform where the post was published',
    example: 'linkedin'
  })
  platform: string;

  @ApiProperty({
    description: 'Timestamp when the retry was completed',
    example: '2025-08-26T14:30:00Z'
  })
  timestamp: string;
}