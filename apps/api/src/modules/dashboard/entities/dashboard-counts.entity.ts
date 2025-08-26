import { ApiProperty } from '@nestjs/swagger';

export class DashboardItemCount {
  @ApiProperty({
    description: 'Total count of items',
    example: 42
  })
  total: number;

  @ApiProperty({
    description: 'Count breakdown by status',
    example: { draft: 5, published: 10, archived: 2 }
  })
  byStatus: Record<string, number>;
}

export class DashboardScheduledCount {
  @ApiProperty({
    description: 'Total count of scheduled posts',
    example: 15
  })
  total: number;

  @ApiProperty({
    description: 'Count breakdown by platform',
    example: { linkedin: 8, x: 7 }
  })
  byPlatform: Record<string, number>;

  @ApiProperty({
    description: 'Number of posts scheduled for the next 24 hours',
    example: 3
  })
  upcoming24h: number;
}

export class DashboardCountsEntity {
  @ApiProperty({
    description: 'Transcript counts and breakdown',
    type: DashboardItemCount
  })
  transcripts: DashboardItemCount;

  @ApiProperty({
    description: 'Insight counts and breakdown',
    type: DashboardItemCount
  })
  insights: DashboardItemCount;

  @ApiProperty({
    description: 'Post counts and breakdown',
    type: DashboardItemCount
  })
  posts: DashboardItemCount;

  @ApiProperty({
    description: 'Scheduled post counts and breakdown',
    type: DashboardScheduledCount
  })
  scheduled: DashboardScheduledCount;
}