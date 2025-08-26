import { ApiProperty } from '@nestjs/swagger';
import { DashboardCountsEntity } from './dashboard-counts.entity';
import { DashboardActivityEntity } from './dashboard-activity.entity';

export class DashboardDataEntity {
  @ApiProperty({
    description: 'Comprehensive counts and statistics',
    type: DashboardCountsEntity
  })
  counts: DashboardCountsEntity;

  @ApiProperty({
    description: 'Recent activity feed across all content types',
    type: [DashboardActivityEntity]
  })
  activity: DashboardActivityEntity[];
}