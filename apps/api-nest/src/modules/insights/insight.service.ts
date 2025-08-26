import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InsightRepository } from './insight.repository';
import { InsightEntity } from './entities/insight.entity';
import { CreateInsightDto, UpdateInsightDto, InsightFilterDto, BulkInsightOperationDto, BulkInsightAction } from './dto';

@Injectable()
export class InsightService {
  private readonly logger = new Logger(InsightService.name);

  constructor(private readonly insightRepository: InsightRepository) {}

  async create(createInsightDto: CreateInsightDto): Promise<InsightEntity> {
    const id = this.generateInsightId();
    
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
    };
  }> {
    this.logger.log(`Finding insights with filters: ${JSON.stringify(filters)}`);
    
    const insights = await this.insightRepository.findAll(filters);
    const total = insights.length;
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    
    return {
      data: insights,
      meta: {
        total,
        limit,
        offset,
        hasMore: total === limit, // True if we got exactly the limit (might be more)
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

  private generateInsightId(): string {
    // Generate a unique insight ID with timestamp and random component
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `insight_${timestamp}_${randomPart}`;
  }
}