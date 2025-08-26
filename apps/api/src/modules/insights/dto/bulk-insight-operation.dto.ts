import { IsArray, IsEnum, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BulkInsightAction {
  APPROVE = 'approve',
  REJECT = 'reject', 
  ARCHIVE = 'archive',
  NEEDS_REVIEW = 'needs_review'
}

export class BulkInsightOperationDto {
  @ApiProperty({ 
    description: 'Action to perform on the insights',
    enum: BulkInsightAction,
    example: BulkInsightAction.APPROVE
  })
  @IsEnum(BulkInsightAction)
  action: BulkInsightAction;

  @ApiProperty({ 
    description: 'Array of insight IDs to operate on',
    example: ['insight_abc123', 'insight_def456', 'insight_ghi789'],
    type: [String],
    minItems: 1,
    maxItems: 50
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  insightIds: string[];
}

export class BulkOperationResponseDto {
  @ApiProperty({ 
    description: 'Number of insights successfully updated',
    example: 3
  })
  updatedCount: number;

  @ApiProperty({ 
    description: 'Action that was performed',
    example: 'approve'
  })
  action: string;

  @ApiProperty({ 
    description: 'Success message',
    example: 'Successfully approved 3 insights'
  })
  message: string;
}