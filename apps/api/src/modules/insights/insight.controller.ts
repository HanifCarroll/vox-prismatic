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
import { JobStatusHelper } from '../content-processing/job-status.helper';

@ApiTags('Insights')
@Controller('insights')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class InsightController {
  private readonly logger = new Logger(InsightController.name);

  constructor(
    private readonly insightService: InsightService,
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
}