import { ApiProperty } from '@nestjs/swagger';
import { DashboardCountsEntity } from './dashboard-counts.entity';
import { DashboardActivityEntity } from './dashboard-activity.entity';
import { DashboardStatsEntity } from './dashboard-stats.entity';

export class WorkflowPipelineEntity {
  @ApiProperty({
    description: 'Number of raw transcripts needing cleaning',
    example: 10
  })
  rawInput: number;

  @ApiProperty({
    description: 'Number of items currently being processed',
    example: 2
  })
  processing: number;

  @ApiProperty({
    description: 'Number of insights needing review',
    example: 8
  })
  insightsReview: number;

  @ApiProperty({
    description: 'Number of posts needing review',
    example: 7
  })
  postsReview: number;

  @ApiProperty({
    description: 'Number of posts approved and ready to schedule',
    example: 5
  })
  approved: number;

  @ApiProperty({
    description: 'Number of posts scheduled for publication',
    example: 8
  })
  scheduled: number;

  @ApiProperty({
    description: 'Number of posts published in the last week',
    example: 12
  })
  published: number;
}

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

  @ApiProperty({
    description: 'Basic statistics',
    type: DashboardStatsEntity,
    required: false
  })
  stats?: DashboardStatsEntity;

  @ApiProperty({
    description: 'Workflow-based pipeline statistics',
    type: WorkflowPipelineEntity,
    required: false
  })
  workflowPipeline?: WorkflowPipelineEntity;
}