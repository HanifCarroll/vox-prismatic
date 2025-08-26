import { ApiProperty } from '@nestjs/swagger';
import { InsightCategory, PostType } from '../dto/create-insight.dto';
import { InsightStatus } from '../dto/update-insight.dto';

export class InsightEntity {
  @ApiProperty({ 
    description: 'Unique identifier for the insight',
    example: 'insight_abc123'
  })
  id: string;

  @ApiProperty({ 
    description: 'ID of the transcript this insight is extracted from',
    example: 'transcript_abc123'
  })
  cleanedTranscriptId: string;

  @ApiProperty({ 
    description: 'Title of the insight',
    example: 'How to build resilience in uncertain times'
  })
  title: string;

  @ApiProperty({ 
    description: 'Summary of the insight',
    example: 'Key strategies for maintaining focus and motivation during challenging periods...'
  })
  summary: string;

  @ApiProperty({ 
    description: 'Direct quote from the transcript',
    example: 'The most successful people I know have developed systems...'
  })
  verbatimQuote: string;

  @ApiProperty({ 
    description: 'Category of the insight',
    enum: InsightCategory,
    example: InsightCategory.BUSINESS_TIP
  })
  category: InsightCategory;

  @ApiProperty({ 
    description: 'Type of post this insight would work best as',
    enum: PostType,
    example: PostType.TIP
  })
  postType: PostType;

  @ApiProperty({ 
    description: 'Current status of the insight',
    enum: InsightStatus,
    example: InsightStatus.APPROVED
  })
  status: InsightStatus;

  @ApiProperty({ 
    description: 'Urgency score (1-10)',
    example: 7
  })
  urgencyScore: number;

  @ApiProperty({ 
    description: 'Relatability score (1-10)',
    example: 8
  })
  relatabilityScore: number;

  @ApiProperty({ 
    description: 'Specificity score (1-10)',
    example: 6
  })
  specificityScore: number;

  @ApiProperty({ 
    description: 'Authority score (1-10)',
    example: 9
  })
  authorityScore: number;

  @ApiProperty({ 
    description: 'Total score (sum of all individual scores)',
    example: 30
  })
  totalScore: number;

  @ApiProperty({ 
    description: 'Processing duration in milliseconds',
    example: 1250,
    required: false
  })
  processingDurationMs?: number;

  @ApiProperty({ 
    description: 'Estimated tokens used for processing',
    example: 850,
    required: false
  })
  estimatedTokens?: number;

  @ApiProperty({ 
    description: 'Estimated cost for processing',
    example: 0.0034,
    required: false
  })
  estimatedCost?: number;

  @ApiProperty({ 
    description: 'When the insight was created',
    example: '2025-08-26T10:30:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({ 
    description: 'When the insight was last updated',
    example: '2025-08-26T15:45:00.000Z'
  })
  updatedAt: Date;

  // Related data when populated
  @ApiProperty({ 
    description: 'Associated transcript information',
    required: false
  })
  transcript?: {
    id: string;
    title: string;
    status: string;
    sourceType: string;
    createdAt: Date;
  };
}