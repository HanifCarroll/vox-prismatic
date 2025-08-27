import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InsightRepository } from './insight.repository';
import { InsightEntity } from './entities/insight.entity';
import { CreateInsightDto, UpdateInsightDto, InsightFilterDto, BulkInsightOperationDto, BulkInsightAction } from './dto';
import { IdGeneratorService } from '../shared/services/id-generator.service';

@Injectable()
export class InsightService {
  private readonly logger = new Logger(InsightService.name);

  constructor(
    private readonly insightRepository: InsightRepository,
    private readonly idGenerator: IdGeneratorService
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

  async findAll(filters?: InsightFilterDto): Promise<{
    data: InsightEntity[];
    meta: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
      pages: number;
      currentPage: number;
    };
  }> {
    this.logger.log(`Finding insights with filters: ${JSON.stringify(filters)}`);
    
    // Fetch data and count in parallel for better performance
    const [insights, total] = await Promise.all([
      this.insightRepository.findAll(filters),
      this.insightRepository.count(filters)
    ]);
    
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const pages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    
    return {
      data: insights,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + insights.length < total,
        pages,
        currentPage,
      },
    };
  }

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
    
    // Verify insight exists
    await this.findOne(id);
    
    const updatedInsight = await this.insightRepository.update(id, updateInsightDto);
    
    this.logger.log(`Updated insight: ${id}`);
    return updatedInsight;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Removing insight: ${id}`);
    
    // Verify insight exists
    await this.findOne(id);
    
    await this.insightRepository.delete(id);
    
    this.logger.log(`Removed insight: ${id}`);
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

    // Map action to status
    const statusMap: Record<BulkInsightAction, string> = {
      [BulkInsightAction.APPROVE]: 'approved',
      [BulkInsightAction.REJECT]: 'rejected', 
      [BulkInsightAction.ARCHIVE]: 'archived',
      [BulkInsightAction.NEEDS_REVIEW]: 'needs_review',
    };

    const status = statusMap[action];
    if (!status) {
      throw new BadRequestException(`Invalid action: ${action}`);
    }

    const updatedCount = await this.insightRepository.batchUpdateStatus(insightIds, status as any);
    
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
    this.logger.log(`Getting insights for transcript: ${transcriptId}`);
    
    const filters: InsightFilterDto = { transcriptId };
    const result = await this.findAll(filters);
    return result.data;
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