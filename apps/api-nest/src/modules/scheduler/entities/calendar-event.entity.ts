import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SchedulePlatform, ScheduleEventStatus } from '../dto';

export class CalendarEventEntity {
  @ApiProperty({
    description: 'Unique identifier for the scheduled event',
    example: 'scheduled_abc123'
  })
  id: string;

  @ApiPropertyOptional({
    description: 'ID of the post this event is scheduled for (if any)',
    example: 'post_abc123'
  })
  postId?: string;

  @ApiProperty({
    description: 'Title for calendar display (truncated content)',
    example: 'Building resilience requires developing systems...'
  })
  title: string;

  @ApiProperty({
    description: 'Full content to be posted',
    example: 'Building resilience requires developing systems that help you maintain focus during challenging periods...'
  })
  content: string;

  @ApiProperty({
    description: 'Platform where the event is scheduled',
    enum: SchedulePlatform,
    example: SchedulePlatform.LINKEDIN
  })
  platform: SchedulePlatform;

  @ApiProperty({
    description: 'When the event is scheduled to be published',
    example: '2025-08-27T14:30:00.000Z'
  })
  scheduledTime: Date;

  @ApiProperty({
    description: 'Current status of the scheduled event',
    enum: ScheduleEventStatus,
    example: ScheduleEventStatus.PENDING
  })
  status: ScheduleEventStatus;

  @ApiProperty({
    description: 'Number of publication retry attempts',
    example: 0
  })
  retryCount: number;

  @ApiPropertyOptional({
    description: 'Last attempt timestamp (if any)',
    example: '2025-08-27T14:35:00.000Z'
  })
  lastAttempt?: Date;

  @ApiPropertyOptional({
    description: 'Error message from last failed attempt',
    example: 'API rate limit exceeded'
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'External post ID from successful publication',
    example: 'linkedin_post_123456'
  })
  externalPostId?: string;

  @ApiProperty({
    description: 'When the event was created',
    example: '2025-08-26T10:30:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the event was last updated',
    example: '2025-08-26T15:45:00.000Z'
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Additional metadata for the scheduled event',
    example: { priority: 'high', campaign: 'productivity-series' }
  })
  metadata?: Record<string, any>;
}