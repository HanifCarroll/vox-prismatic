import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InsightService } from './insight.service';
import { InsightStateService } from './services/insight-state.service';
import { InsightEntity } from './entities/insight.entity';
import {
  CreateInsightDto,
  UpdateInsightDto,
  InsightFilterDto,
  BulkInsightOperationDto,
  BulkOperationResponseDto,
} from './dto';
import { InsightViewDto } from './dto/insight-view.dto';
import { CustomIdValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { JobStatusHelper } from '../job-status/job-status.helper';

@ApiTags('Insights')
@Controller('insights')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class InsightController {
  private readonly logger = new Logger(InsightController.name);

  constructor(
    private readonly insightService: InsightService,
    private readonly insightStateService: InsightStateService,
    private readonly jobStatusHelper: JobStatusHelper,
  ) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new insight',
    description: 'Creates a new insight extracted from a transcript with AI scoring'
  })
  @ApiResponse({
    status: 201,
    description: 'Insight created successfully',
    type: InsightViewDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async create(@Body() createInsightDto: CreateInsightDto): Promise<{
    success: true;
    data: InsightViewDto;
  }> {
    this.logger.log('Creating new insight');
    
    const insight = await this.insightService.create(createInsightDto);
    
    return {
      success: true,
      data: InsightViewDto.fromEntity(insight),
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all insights with optional filtering',
    description: 'Retrieves insights with filtering, sorting, and pagination options'
  })
  @ApiResponse({
    status: 200,
    description: 'Insights retrieved successfully',
    type: [InsightViewDto],
  })
  async findAll(@Query() filters: InsightFilterDto): Promise<{
    success: true;
    data: InsightViewDto[];
    meta: {
      pagination: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        hasMore: boolean;
      };
      counts: Record<string, number>;
    };
  }> {
    this.logger.log(`Getting insights with filters: ${JSON.stringify(filters)}`);
    
    const result = await this.insightService.findAllWithMetadata(filters);
    
    // Attach job status to insights that have queueJobId
    const insightsWithJobStatus = await this.jobStatusHelper.attachJobStatusToMany(result.data);
    
    return {
      success: true,
      data: InsightViewDto.fromEntities(insightsWithJobStatus),
      meta: result.metadata
    };
  }

  @Get('status-counts')
  @ApiOperation({ 
    summary: 'Get insight status counts',
    description: 'Returns count of insights grouped by status'
  })
  @ApiResponse({
    status: 200,
    description: 'Status counts retrieved successfully',
  })
  async getStatusCounts(): Promise<{
    success: true;
    data: Record<string, number>;
  }> {
    this.logger.log('Getting insight status counts');
    
    const counts = await this.insightService.getStatusCounts();
    
    return {
      success: true,
      data: counts,
    };
  }

  @Get('transcript/:transcriptId')
  @ApiOperation({ 
    summary: 'Get insights for a specific transcript',
    description: 'Retrieves all insights extracted from a specific transcript'
  })
  @ApiParam({
    name: 'transcriptId',
    description: 'The transcript ID to get insights for',
    example: 'transcript_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Transcript insights retrieved successfully',
    type: [InsightViewDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Transcript not found',
  })
  async findByTranscript(@Param('transcriptId', CustomIdValidationPipe) transcriptId: string): Promise<{
    success: true;
    data: InsightViewDto[];
    total: number;
  }> {
    this.logger.log(`Getting insights for transcript: ${transcriptId}`);
    
    const insights = await this.insightService.findByTranscriptId(transcriptId);
    
    return {
      success: true,
      data: InsightViewDto.fromEntities(insights),
      total: insights.length,
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a single insight by ID',
    description: 'Retrieves a specific insight with all its details including transcript information'
  })
  @ApiParam({
    name: 'id',
    description: 'The insight ID',
    example: 'insight_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Insight retrieved successfully',
    type: InsightViewDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Insight not found',
  })
  async findOne(@Param('id', CustomIdValidationPipe) id: string): Promise<{
    success: true;
    data: InsightViewDto;
  }> {
    this.logger.log(`Getting insight: ${id}`);
    
    const insight = await this.insightService.findOne(id);
    
    // Attach job status if insight has queueJobId
    const insightWithJobStatus = await this.jobStatusHelper.attachJobStatus(insight);
    
    return {
      success: true,
      data: InsightViewDto.fromEntity(insightWithJobStatus),
    };
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update an insight with automatic post generation',
    description: 'Updates an existing insight with new data. Scores will be recalculated if modified. When status is changed to "approved", post generation will be automatically triggered for LinkedIn and X platforms.'
  })
  @ApiParam({
    name: 'id',
    description: 'The insight ID to update',
    example: 'insight_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Insight updated successfully',
    type: InsightViewDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Insight not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid update data',
  })
  async update(
    @Param('id', CustomIdValidationPipe) id: string,
    @Body() updateInsightDto: UpdateInsightDto,
  ): Promise<{
    success: true;
    data: InsightViewDto;
  }> {
    this.logger.log(`Updating insight: ${id}`);
    
    const insight = await this.insightService.update(id, updateInsightDto);
    
    return {
      success: true,
      data: InsightViewDto.fromEntity(insight),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Delete an insight',
    description: 'Permanently deletes an insight and all related data'
  })
  @ApiParam({
    name: 'id',
    description: 'The insight ID to delete',
    example: 'insight_abc123',
  })
  @ApiResponse({
    status: 204,
    description: 'Insight deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Insight not found',
  })
  async remove(@Param('id', CustomIdValidationPipe) id: string): Promise<void> {
    this.logger.log(`Deleting insight: ${id}`);
    
    await this.insightService.remove(id);
  }

  @Post('bulk')
  @ApiOperation({ 
    summary: 'Perform bulk operations on insights with automatic post generation',
    description: 'Updates the status of multiple insights at once (approve, reject, archive, or mark for review). When bulk approving insights, post generation will be automatically triggered for all approved insights on LinkedIn and X platforms.'
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk operation completed successfully',
    type: BulkOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid bulk operation request',
  })
  async bulkOperation(@Body() bulkOperationDto: BulkInsightOperationDto): Promise<{
    success: true;
    data: BulkOperationResponseDto;
  }> {
    this.logger.log(`Performing bulk operation: ${bulkOperationDto.action} on ${bulkOperationDto.insightIds.length} insights`);
    
    const result = await this.insightService.bulkOperation(bulkOperationDto);
    
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id/available-actions')
  @ApiOperation({ 
    summary: 'Get available state transitions for an insight',
    description: 'Returns the list of valid state transitions from the current state'
  })
  @ApiParam({
    name: 'id',
    description: 'The insight ID',
    example: 'insight_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Available actions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            currentState: { type: 'string', example: 'draft' },
            availableActions: {
              type: 'array',
              items: { type: 'string' },
              example: ['SUBMIT_FOR_REVIEW', 'ARCHIVE', 'DELETE']
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Insight not found',
  })
  async getAvailableActions(@Param('id', CustomIdValidationPipe) id: string): Promise<{
    success: true;
    data: {
      currentState: string;
      availableActions: string[];
    };
  }> {
    this.logger.log(`Getting available actions for insight: ${id}`);
    
    const insight = await this.insightService.findOne(id);
    const availableActions = await this.insightStateService.getAvailableActions(id);
    
    return {
      success: true,
      data: {
        currentState: insight.status,
        availableActions,
      },
    };
  }

  @Post(':id/approve')
  @ApiOperation({ 
    summary: 'Approve an insight',
    description: 'Transitions an insight to approved state and triggers post generation'
  })
  @ApiParam({
    name: 'id',
    description: 'The insight ID to approve',
    example: 'insight_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Insight approved successfully',
    type: InsightViewDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid state transition',
  })
  @ApiResponse({
    status: 404,
    description: 'Insight not found',
  })
  async approveInsight(
    @Param('id', CustomIdValidationPipe) id: string,
    @Body() body?: { approvedBy?: string; score?: number }
  ): Promise<{
    success: true;
    data: InsightViewDto;
  }> {
    this.logger.log(`Approving insight: ${id}`);
    
    const insight = await this.insightStateService.approveInsight(
      id, 
      body?.approvedBy || 'system',
      body?.score
    );
    
    return {
      success: true,
      data: InsightViewDto.fromEntity(insight),
    };
  }

  @Post(':id/reject')
  @ApiOperation({ 
    summary: 'Reject an insight',
    description: 'Transitions an insight to rejected state with a reason'
  })
  @ApiParam({
    name: 'id',
    description: 'The insight ID to reject',
    example: 'insight_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Insight rejected successfully',
    type: InsightViewDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid state transition',
  })
  @ApiResponse({
    status: 404,
    description: 'Insight not found',
  })
  async rejectInsight(
    @Param('id', CustomIdValidationPipe) id: string,
    @Body() body?: { reviewedBy?: string; reason?: string }
  ): Promise<{
    success: true;
    data: InsightViewDto;
  }> {
    this.logger.log(`Rejecting insight: ${id}`);
    
    const insight = await this.insightStateService.rejectInsight(
      id,
      body?.reviewedBy || 'system',
      body?.reason || 'Rejected during review'
    );
    
    return {
      success: true,
      data: InsightViewDto.fromEntity(insight),
    };
  }

  @Post(':id/submit-review')
  @ApiOperation({ 
    summary: 'Submit an insight for review',
    description: 'Transitions an insight from draft to needs_review state'
  })
  @ApiParam({
    name: 'id',
    description: 'The insight ID to submit for review',
    example: 'insight_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Insight submitted for review successfully',
    type: InsightViewDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid state transition',
  })
  @ApiResponse({
    status: 404,
    description: 'Insight not found',
  })
  async submitForReview(@Param('id', CustomIdValidationPipe) id: string): Promise<{
    success: true;
    data: InsightViewDto;
  }> {
    this.logger.log(`Submitting insight for review: ${id}`);
    
    const insight = await this.insightStateService.submitForReview(id);
    
    return {
      success: true,
      data: InsightViewDto.fromEntity(insight),
    };
  }

  @Post(':id/archive')
  @ApiOperation({ 
    summary: 'Archive an insight',
    description: 'Transitions an insight to archived state'
  })
  @ApiParam({
    name: 'id',
    description: 'The insight ID to archive',
    example: 'insight_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Insight archived successfully',
    type: InsightViewDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid state transition',
  })
  @ApiResponse({
    status: 404,
    description: 'Insight not found',
  })
  async archiveInsight(
    @Param('id', CustomIdValidationPipe) id: string,
    @Body() body?: { reason?: string }
  ): Promise<{
    success: true;
    data: InsightViewDto;
  }> {
    this.logger.log(`Archiving insight: ${id}`);
    
    const insight = await this.insightStateService.archiveInsight(
      id,
      body?.reason || 'Manually archived'
    );
    
    return {
      success: true,
      data: InsightViewDto.fromEntity(insight),
    };
  }

  @Post(':id/restore')
  @ApiOperation({ 
    summary: 'Restore an archived insight',
    description: 'Transitions an archived insight back to draft state'
  })
  @ApiParam({
    name: 'id',
    description: 'The insight ID to restore',
    example: 'insight_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Insight restored successfully',
    type: InsightViewDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid state transition',
  })
  @ApiResponse({
    status: 404,
    description: 'Insight not found',
  })
  async restoreInsight(@Param('id', CustomIdValidationPipe) id: string): Promise<{
    success: true;
    data: InsightViewDto;
  }> {
    this.logger.log(`Restoring insight: ${id}`);
    
    const insight = await this.insightStateService.restoreInsight(id);
    
    return {
      success: true,
      data: InsightViewDto.fromEntity(insight),
    };
  }
}