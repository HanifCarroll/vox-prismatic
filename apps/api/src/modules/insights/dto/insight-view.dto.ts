import { ApiProperty } from '@nestjs/swagger';
import { InsightEntity } from '../entities/insight.entity';

/**
 * DTO for transforming InsightEntity to match frontend InsightView structure
 */
export class InsightViewDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  cleanedTranscriptId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  summary: string;

  @ApiProperty()
  verbatimQuote: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  postType: string;

  @ApiProperty({
    description: 'Nested scores object matching frontend expectations',
    example: {
      urgency: 7,
      relatability: 8,
      specificity: 6,
      authority: 9,
      total: 30
    }
  })
  scores: {
    urgency: number;
    relatability: number;
    specificity: number;
    authority: number;
    total: number;
  };

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  processingDurationMs?: number;

  @ApiProperty({ required: false })
  estimatedTokens?: number;

  @ApiProperty({ required: false })
  estimatedCost?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  transcriptTitle?: string;

  /**
   * Transform InsightEntity to InsightViewDto
   */
  static fromEntity(entity: InsightEntity): InsightViewDto {
    return {
      id: entity.id,
      cleanedTranscriptId: entity.cleanedTranscriptId,
      title: entity.title,
      summary: entity.summary,
      verbatimQuote: entity.verbatimQuote,
      category: entity.category,
      postType: entity.postType,
      scores: {
        urgency: entity.urgencyScore || 0,
        relatability: entity.relatabilityScore || 0,
        specificity: entity.specificityScore || 0,
        authority: entity.authorityScore || 0,
        total: entity.totalScore || 0,
      },
      status: entity.status,
      processingDurationMs: entity.processingDurationMs,
      estimatedTokens: entity.estimatedTokens,
      estimatedCost: entity.estimatedCost,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      transcriptTitle: entity.transcript?.title,
    };
  }

  /**
   * Transform array of InsightEntity to InsightViewDto array
   */
  static fromEntities(entities: InsightEntity[]): InsightViewDto[] {
    return entities.map(entity => InsightViewDto.fromEntity(entity));
  }
}