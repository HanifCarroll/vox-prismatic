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
    description: 'Urgency score (0-10)',
    example: 7
  })
  urgencyScore: number;

  @ApiProperty({
    description: 'Relatability score (0-10)',
    example: 8
  })
  relatabilityScore: number;

  @ApiProperty({
    description: 'Specificity score (0-10)',
    example: 6
  })
  specificityScore: number;

  @ApiProperty({
    description: 'Authority score (0-10)',
    example: 9
  })
  authorityScore: number;

  @ApiProperty({
    description: 'Total combined score',
    example: 30
  })
  totalScore: number;

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
      urgencyScore: entity.urgencyScore || 0,
      relatabilityScore: entity.relatabilityScore || 0,
      specificityScore: entity.specificityScore || 0,
      authorityScore: entity.authorityScore || 0,
      totalScore: entity.totalScore || 0,
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