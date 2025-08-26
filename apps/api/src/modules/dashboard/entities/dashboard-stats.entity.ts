import { ApiProperty } from '@nestjs/swagger';

export class ItemCount {
  @ApiProperty({
    description: 'Total count of items',
    example: 42
  })
  count: number;
}

export class DashboardStatsEntity {
  @ApiProperty({
    description: 'Transcript statistics',
    type: ItemCount
  })
  transcripts: ItemCount;

  @ApiProperty({
    description: 'Insight statistics',
    type: ItemCount
  })
  insights: ItemCount;

  @ApiProperty({
    description: 'Post statistics',
    type: ItemCount
  })
  posts: ItemCount;

  @ApiProperty({
    description: 'Scheduled post statistics',
    type: ItemCount
  })
  scheduledPosts: ItemCount;
}