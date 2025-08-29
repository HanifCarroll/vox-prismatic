import { ApiProperty } from '@nestjs/swagger';
import { ActionPriority, ActionType } from '@content-creation/types';

export class ActionableItemEntity {
  @ApiProperty({
    description: 'Unique identifier for the actionable item',
    example: 'post_123'
  })
  id: string;

  @ApiProperty({
    description: 'Type of action required',
    enum: ActionType,
    example: ActionType.FIX_FAILED
  })
  actionType: ActionType;

  @ApiProperty({
    description: 'Priority level of the action',
    enum: ActionPriority,
    example: ActionPriority.URGENT
  })
  priority: ActionPriority;

  @ApiProperty({
    description: 'Title or description of the item',
    example: 'LinkedIn Post 155 failed to publish'
  })
  title: string;

  @ApiProperty({
    description: 'Additional context or error message',
    example: 'Authentication token expired',
    required: false
  })
  context?: string;

  @ApiProperty({
    description: 'Platform associated with the item',
    example: 'linkedin',
    required: false
  })
  platform?: string;

  @ApiProperty({
    description: 'URL or route to handle the action',
    example: '/content?view=posts&id=123'
  })
  actionUrl: string;

  @ApiProperty({
    description: 'Label for the action button',
    example: 'Fix Now'
  })
  actionLabel: string;

  @ApiProperty({
    description: 'When the item was created or last updated',
    example: '2025-08-28T10:30:00Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Count of similar items (for grouping)',
    example: 3,
    required: false
  })
  count?: number;
}

export class DashboardActionableEntity {
  @ApiProperty({
    description: 'Items requiring immediate attention (failed, errors)',
    type: [ActionableItemEntity]
  })
  urgent: ActionableItemEntity[];

  @ApiProperty({
    description: 'Items needing review or approval',
    type: [ActionableItemEntity]
  })
  needsReview: ActionableItemEntity[];

  @ApiProperty({
    description: 'Items ready to be processed or scheduled',
    type: [ActionableItemEntity]
  })
  readyToProcess: ActionableItemEntity[];

  @ApiProperty({
    description: 'Total count of actionable items',
    example: 15
  })
  totalCount: number;
}