import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InsightRepository } from './insight.repository';
import { InsightEntity } from './entities/insight.entity';
import { CreateInsightDto, UpdateInsightDto, BulkInsightOperationDto, InsightFilterDto } from './dto';
import { BulkInsightAction, InsightStatus } from '@content-creation/types';
import { IdGeneratorService } from '../shared/services/id-generator.service';
import { InsightStateService } from './services/insight-state.service';
import { INSIGHT_EVENTS, type InsightApprovedEvent } from './events/insight.events';

@Injectable()
export class InsightService {
  private readonly logger = new Logger(InsightService.name);

  constructor(
    private readonly insightRepository: InsightRepository,
    private readonly idGenerator: IdGeneratorService,
    private readonly insightStateService: InsightStateService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createInsightDto: CreateInsightDto): Promise<InsightEntity> {
    const id = this.idGenerator.generate('insight');
    
    this.logger.log(`Creating insight: ${createInsightDto.title}`);
    
    const insight = await this.insightRepository.create({
      id,
      ...createInsightDto,
    });

    this.logger.log(`Created insight: ${insight.id}`);
    return insight;
  }

  async findAll(): Promise<InsightEntity[]> {
    this.logger.log('Finding all insights');
    return this.insightRepository.findAll();
  }

  // Remove findAllWithMetadata method entirely

  async findOne(id: string): Promise<InsightEntity> {
    this.logger.log(`Finding insight: ${id}`);
    
    const insight = await this.insightRepository.findById(id);
    if (!insight) {
      throw new NotFoundException(`Insight with ID ${id} not found`);
    }
    
    return insight;
  }

  async update(id: string, updateInsightDto: UpdateInsightDto): Promise<InsightEntity> {
    this.logger.log(`Updating insight: ${id}`);
    
    // Status updates should go through state machine methods directly
    // The status field has been removed from UpdateInsightDto to enforce this pattern
    
    // For non-status updates, update directly
    try {
      const updatedInsight = await this.insightRepository.update(id, updateInsightDto);
      this.logger.log(`Updated insight: ${id}`);
      return updatedInsight;
    } catch (error: any) {
      // Prisma P2025: Record not found
      if (error?.code === 'P2025') {
        throw new NotFoundException(`Insight with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing insight: ${id}`);
    
    try {
      await this.insightRepository.delete(id);
      this.logger.log(`Removed insight: ${id}`);
    } catch (error: any) {
      // Prisma P2025: Record not found
      if (error?.code === 'P2025') {
        throw new NotFoundException(`Insight with ID ${id} not found`);
      }
      throw error;
    }
  }

  async bulkOperation(bulkOperationDto: BulkInsightOperationDto): Promise<{
    updatedCount: number;
    action: string;
    message: string;
  }> {
    const { action, insightIds } = bulkOperationDto;
    
    if (insightIds.length === 0) {
      throw new BadRequestException('No insight IDs provided');
    }

    this.logger.log(`Performing bulk operation ${action} on ${insightIds.length} insights`);

    // Use state machine for each insight (run in parallel for performance)
    const results = await Promise.allSettled(
      insightIds.map(async (insightId) => {
        try {
          switch (action) {
            case BulkInsightAction.APPROVE:
              await this.insightStateService.approveInsight(insightId, 'system'); // TODO: Add actual user
              break;
            case BulkInsightAction.REJECT:
              await this.insightStateService.rejectInsight(insightId, 'system', 'Bulk rejection');
              break;
            case BulkInsightAction.ARCHIVE:
              await this.insightStateService.archiveInsight(insightId, 'Bulk archive');
              break;
            case BulkInsightAction.NEEDS_REVIEW:
              await this.insightStateService.submitForReview(insightId);
              break;
            default:
              throw new BadRequestException(`Invalid action: ${action}`);
          }
          return { success: true, insightId };
        } catch (error) {
          this.logger.error(`Failed to ${action} insight ${insightId}:`, error);
          return { success: false, insightId, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );
    
    const updatedCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - updatedCount;
    
    if (failed > 0) {
      this.logger.warn(`Bulk operation: ${updatedCount} successful, ${failed} failed`);
    }
    
    const message = `Successfully ${action}d ${updatedCount} insights`;
    
    this.logger.log(`Bulk operation completed: ${message}`);
    
    return {
      updatedCount,
      action,
      message,
    };
  }

  async findByTranscriptId(transcriptId: string): Promise<InsightEntity[]> {
    this.logger.log(`Finding insights for transcript: ${transcriptId}`);
    
    const insights = await this.insightRepository.findByTranscriptId(transcriptId);
    
    this.logger.log(`Found ${insights.length} insights for transcript: ${transcriptId}`);
    return insights;
  }

  async getStatusCounts(): Promise<Record<string, number>> {
    this.logger.log('Getting insight status counts');
    
    return await this.insightRepository.getStatusCounts();
  }

  /**
   * Get insights for a specific transcript
   */
  async getInsightsByTranscript(transcriptId: string): Promise<InsightEntity[]> {
    return this.findByTranscriptId(transcriptId);
  }

  /**
   * Approve multiple insights at once
   */
  async approveInsights(insightIds: string[]): Promise<{ updatedCount: number }> {
    return this.bulkUpdateInsights({ 
      ids: insightIds, 
      action: BulkInsightAction.APPROVE 
    });
  }

  /**
   * Reject multiple insights at once
   */
  async rejectInsights(insightIds: string[]): Promise<{ updatedCount: number }> {
    return this.bulkUpdateInsights({ 
      ids: insightIds, 
      action: BulkInsightAction.REJECT 
    });
  }

  /**
   * Archive multiple insights at once
   */
  async archiveInsights(insightIds: string[]): Promise<{ updatedCount: number }> {
    return this.bulkUpdateInsights({ 
      ids: insightIds, 
      action: BulkInsightAction.ARCHIVE 
    });
  }

  /**
   * Perform bulk update operations on insights
   */
  async bulkUpdateInsights(dto: { ids: string[], action: BulkInsightAction }): Promise<{ updatedCount: number }> {
    const bulkDto: BulkInsightOperationDto = {
      action: dto.action,
      insightIds: dto.ids
    };
    
    const result = await this.bulkOperation(bulkDto);
    return { updatedCount: result.updatedCount };
  }
}