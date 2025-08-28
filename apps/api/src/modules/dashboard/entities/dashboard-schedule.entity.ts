import { ApiProperty } from '@nestjs/swagger';

export class NextPostEntity {
  @ApiProperty({
    description: 'Post ID',
    example: 'post_123'
  })
  id: string;

  @ApiProperty({
    description: 'Post title',
    example: 'Building resilience in uncertain times'
  })
  title: string;

  @ApiProperty({
    description: 'Platform for the post',
    example: 'linkedin'
  })
  platform: string;

  @ApiProperty({
    description: 'Scheduled time in ISO format',
    example: '2025-08-28T14:30:00Z'
  })
  scheduledTime: string;

  @ApiProperty({
    description: 'Minutes until the post goes live',
    example: 45
  })
  minutesUntil: number;

  @ApiProperty({
    description: 'Human-readable time until post',
    example: 'in 45 minutes'
  })
  timeUntil: string;
}

export class HourlySlotEntity {
  @ApiProperty({
    description: 'Hour in 24h format',
    example: 14
  })
  hour: number;

  @ApiProperty({
    description: 'Display label for the hour',
    example: '2:00 PM'
  })
  label: string;

  @ApiProperty({
    description: 'Posts scheduled in this hour',
    type: [Object],
    example: [{ id: 'post_123', platform: 'linkedin', title: 'Post title' }]
  })
  posts: Array<{
    id: string;
    platform: string;
    title: string;
  }>;

  @ApiProperty({
    description: 'Number of posts in this slot',
    example: 2
  })
  count: number;
}

export class DailyScheduleEntity {
  @ApiProperty({
    description: 'Date in YYYY-MM-DD format',
    example: '2025-08-28'
  })
  date: string;

  @ApiProperty({
    description: 'Day of week',
    example: 'Wednesday'
  })
  dayName: string;

  @ApiProperty({
    description: 'Number of posts scheduled',
    example: 5
  })
  postCount: number;

  @ApiProperty({
    description: 'Breakdown by platform',
    example: { linkedin: 3, x: 2 }
  })
  byPlatform: Record<string, number>;

  @ApiProperty({
    description: 'Is this today',
    example: true
  })
  isToday: boolean;

  @ApiProperty({
    description: 'Has scheduling gap (no posts)',
    example: false
  })
  hasGap: boolean;
}

export class PublishingScheduleEntity {
  @ApiProperty({
    description: 'Next scheduled post details',
    type: NextPostEntity,
    required: false
  })
  nextPost?: NextPostEntity;

  @ApiProperty({
    description: 'Today schedule broken down by hour',
    type: [HourlySlotEntity]
  })
  todayHourly: HourlySlotEntity[];

  @ApiProperty({
    description: 'This week schedule broken down by day',
    type: [DailyScheduleEntity]
  })
  weekDaily: DailyScheduleEntity[];

  @ApiProperty({
    description: 'Number of posts scheduled today',
    example: 3
  })
  todayCount: number;

  @ApiProperty({
    description: 'Number of posts scheduled this week',
    example: 15
  })
  weekCount: number;

  @ApiProperty({
    description: 'Number of posts scheduled this month',
    example: 45
  })
  monthCount: number;

  @ApiProperty({
    description: 'Platform distribution for this week',
    example: { linkedin: 10, x: 5 }
  })
  weekPlatformDistribution: Record<string, number>;

  @ApiProperty({
    description: 'Days with no scheduled posts in the next 7 days',
    type: [String],
    example: ['2025-08-30', '2025-08-31']
  })
  schedulingGaps: string[];

  @ApiProperty({
    description: 'Suggested best times to post based on past performance',
    type: [String],
    example: ['9:00 AM', '12:00 PM', '5:00 PM']
  })
  suggestedTimes: string[];
}