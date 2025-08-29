import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PipelineOrchestratorService } from './services/pipeline-orchestrator.service';
import { CreatePipelineOptions, BlockingItemType } from '@content-creation/types';
import { PipelineMetricsService } from './services/pipeline-metrics.service';
import type { PipelineTemplate } from './state/pipeline-context.types';

/**
 * DTO for creating a new pipeline
 */
export class CreatePipelineDto {
  transcriptId: string;
  template?: PipelineTemplate;
  options?: {
    autoApprove?: boolean;
    platforms?: ('linkedin' | 'x')[];
    skipInsightReview?: boolean;
    skipPostReview?: boolean;
    maxRetries?: number;
  };
  metadata?: Record<string, any>;
}

/**
 * DTO for pipeline action responses
 */
export class PipelineActionResponse {
  success: boolean;
  pipelineId: string;
  message: string;
  data?: any;
}

/**
 * Pipeline Controller
 * Manages pipeline lifecycle and provides metrics
 */
@ApiTags('pipelines')
@Controller('api/pipelines')
export class PipelineController {
  private readonly logger = new Logger(PipelineController.name);

  constructor(
    private readonly orchestratorService: PipelineOrchestratorService,
    private readonly metricsService: PipelineMetricsService,
  ) {}

  /**
   * Create and start a new pipeline
   */
  @Post()
  @ApiOperation({ summary: 'Start a new content pipeline' })
  @ApiResponse({ status: 201, description: 'Pipeline started successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 409, description: 'Pipeline already exists for transcript' })
  async createPipeline(@Body() dto: CreatePipelineDto) {
    try {
      const progress = await this.orchestratorService.startPipeline({
        transcriptId: dto.transcriptId,
        template: dto.template,
        options: dto.options,
        metadata: dto.metadata,
      });

      return {
        success: true,
        pipelineId: progress.pipelineId,
        message: 'Pipeline started successfully',
        data: progress,
      };
    } catch (error) {
      this.logger.error(`Failed to start pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (error instanceof Error ? error.message : 'Unknown error'.includes('already exists')) {
        throw new HttpException(error instanceof Error ? error.message : 'Unknown error', HttpStatus.CONFLICT);
      }
      
      throw new HttpException(
        `Failed to start pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Get pipeline progress
   */
  @Get(':id/progress')
  @ApiOperation({ summary: 'Get pipeline progress and status' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Pipeline progress retrieved' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async getPipelineProgress(@Param('id') pipelineId: string) {
    try {
      const progress = await this.orchestratorService.getProgress(pipelineId);
      return progress;
    } catch (error) {
      this.logger.error(`Failed to get pipeline progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        `Pipeline not found: ${pipelineId}`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * Pause a pipeline
   */
  @Put(':id/pause')
  @ApiOperation({ summary: 'Pause an active pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Pipeline paused successfully' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async pausePipeline(@Param('id') pipelineId: string) {
    try {
      const progress = await this.orchestratorService.pausePipeline(pipelineId);
      
      return {
        success: true,
        pipelineId,
        message: 'Pipeline paused successfully',
        data: progress,
      };
    } catch (error) {
      this.logger.error(`Failed to pause pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        `Failed to pause pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Resume a paused pipeline
   */
  @Put(':id/resume')
  @ApiOperation({ summary: 'Resume a paused pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Pipeline resumed successfully' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async resumePipeline(@Param('id') pipelineId: string) {
    try {
      const progress = await this.orchestratorService.resumePipeline(pipelineId);
      
      return {
        success: true,
        pipelineId,
        message: 'Pipeline resumed successfully',
        data: progress,
      };
    } catch (error) {
      this.logger.error(`Failed to resume pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        `Failed to resume pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Retry a failed pipeline
   */
  @Put(':id/retry')
  @ApiOperation({ summary: 'Retry a failed pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Pipeline retry started' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  @ApiResponse({ status: 400, description: 'Pipeline not in retryable state' })
  async retryPipeline(@Param('id') pipelineId: string) {
    try {
      const progress = await this.orchestratorService.retryPipeline(pipelineId);
      
      return {
        success: true,
        pipelineId: progress.pipelineId,
        message: 'Pipeline retry started successfully',
        data: progress,
      };
    } catch (error) {
      this.logger.error(`Failed to retry pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        `Failed to retry pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Cancel a pipeline
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Cancel an active pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Pipeline cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async cancelPipeline(
    @Param('id') pipelineId: string,
    @Body() body?: { reason?: string }
  ) {
    try {
      await this.orchestratorService.cancelPipeline(pipelineId, body?.reason);
      
      return {
        success: true,
        pipelineId,
        message: 'Pipeline cancelled successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to cancel pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        `Failed to cancel pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Get blocking items for a pipeline
   */
  @Get(':id/blocking-items')
  @ApiOperation({ summary: 'Get items blocking pipeline progress' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Blocking items retrieved' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async getBlockingItems(@Param('id') pipelineId: string) {
    try {
      const items = await this.orchestratorService.getBlockingItems(pipelineId);
      return {
        pipelineId,
        count: items.length,
        items,
      };
    } catch (error) {
      this.logger.error(`Failed to get blocking items: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        `Pipeline not found: ${pipelineId}`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * Get estimated completion time
   */
  @Get(':id/estimated-completion')
  @ApiOperation({ summary: 'Get estimated completion time for pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Estimated completion time retrieved' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async getEstimatedCompletion(@Param('id') pipelineId: string) {
    try {
      const estimatedTime = await this.orchestratorService.getEstimatedCompletion(pipelineId);
      return {
        pipelineId,
        estimatedCompletion: estimatedTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get estimated completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        `Pipeline not found: ${pipelineId}`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * Get all active pipelines
   */
  @Get('active')
  @ApiOperation({ summary: 'Get all active pipelines' })
  @ApiResponse({ status: 200, description: 'Active pipelines retrieved' })
  async getActivePipelines() {
    try {
      const pipelines = await this.orchestratorService.getActivePipelines();
      return {
        count: pipelines.length,
        pipelines,
      };
    } catch (error) {
      this.logger.error(`Failed to get active pipelines: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        'Failed to get active pipelines',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get pipeline history for a transcript
   */
  @Get('transcript/:transcriptId/history')
  @ApiOperation({ summary: 'Get pipeline history for a transcript' })
  @ApiParam({ name: 'transcriptId', description: 'Transcript ID' })
  @ApiResponse({ status: 200, description: 'Pipeline history retrieved' })
  async getPipelineHistory(@Param('transcriptId') transcriptId: string) {
    try {
      const history = await this.orchestratorService.getPipelineHistory(transcriptId);
      return {
        transcriptId,
        count: history.length,
        pipelines: history,
      };
    } catch (error) {
      this.logger.error(`Failed to get pipeline history: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        'Failed to get pipeline history',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get pipeline metrics
   */
  @Get(':id/metrics')
  @ApiOperation({ summary: 'Get performance metrics for a pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Pipeline metrics retrieved' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async getPipelineMetrics(@Param('id') pipelineId: string) {
    try {
      const metrics = await this.metricsService.calculatePipelineMetrics(pipelineId);
      return {
        pipelineId,
        metrics,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get pipeline metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        `Pipeline not found: ${pipelineId}`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * Get performance recommendations
   */
  @Get(':id/recommendations')
  @ApiOperation({ summary: 'Get performance recommendations for a pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async getPerformanceRecommendations(@Param('id') pipelineId: string) {
    try {
      const recommendations = await this.metricsService.getPerformanceRecommendations(pipelineId);
      return {
        pipelineId,
        count: recommendations.length,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Failed to get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        `Pipeline not found: ${pipelineId}`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * Start manual intervention for a blocking item
   */
  @Post(':id/intervention/:entityId/start')
  @ApiOperation({ summary: 'Start manual intervention for a blocking item' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiParam({ name: 'entityId', description: 'Entity ID (insight or post)' })
  @ApiResponse({ status: 200, description: 'Intervention started' })
  @ApiResponse({ status: 404, description: 'Pipeline or entity not found' })
  async startIntervention(
    @Param('id') pipelineId: string,
    @Param('entityId') entityId: string,
    @Body() body: { userId: string; entityType?: string; reason?: string; metadata?: Record<string, any> }
  ) {
    try {
      await this.orchestratorService.startManualIntervention(
        pipelineId,
        entityId,
        body.entityType || 'unknown',
        body.reason || 'Manual intervention requested',
        body.metadata
      );
      
      return {
        success: true,
        pipelineId,
        entityId,
        message: 'Manual intervention started',
        startedAt: new Date()
      };
    } catch (error) {
      this.logger.error(`Failed to start intervention: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        `Failed to start intervention: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Complete manual intervention for a blocking item
   */
  @Post(':id/intervention/:entityId/complete')
  @ApiOperation({ summary: 'Complete manual intervention for a blocking item' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiParam({ name: 'entityId', description: 'Entity ID (insight or post)' })
  @ApiResponse({ status: 200, description: 'Intervention completed' })
  @ApiResponse({ status: 404, description: 'Pipeline or entity not found' })
  async completeIntervention(
    @Param('id') pipelineId: string,
    @Param('entityId') entityId: string,
    @Body() body: {
      action: 'approved' | 'rejected' | 'resolved' | 'skipped';
      userId: string;
      notes?: string;
    }
  ) {
    try {
      await this.orchestratorService.completeManualIntervention(
        pipelineId,
        entityId,
        `${body.action}${body.notes ? `: ${body.notes}` : ''}`,
        { userId: body.userId, action: body.action }
      );
      
      return {
        success: true,
        pipelineId,
        entityId,
        action: body.action,
        message: 'Manual intervention completed',
        completedAt: new Date()
      };
    } catch (error) {
      this.logger.error(`Failed to complete intervention: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        `Failed to complete intervention: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Get manual intervention statistics for a pipeline
   */
  @Get(':id/intervention-stats')
  @ApiOperation({ summary: 'Get manual intervention statistics' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Intervention statistics retrieved' })
  async getInterventionStats(@Param('id') pipelineId: string) {
    try {
      const blockingItems = await this.orchestratorService.getBlockingItems(pipelineId);
      
      const stats = {
        total: blockingItems.length,
        pending: blockingItems.filter(i => i.type === BlockingItemType.INSIGHT_REVIEW || i.type === BlockingItemType.POST_REVIEW).length,
        inProgress: 0, // Blocking items don't track in-progress state
        completed: 0, // Completed items wouldn't be blocking
        byType: {
          insightReview: blockingItems.filter(i => i.type === BlockingItemType.INSIGHT_REVIEW).length,
          postReview: blockingItems.filter(i => i.type === BlockingItemType.POST_REVIEW).length,
          manualIntervention: blockingItems.filter(i => i.type === BlockingItemType.MANUAL_INTERVENTION).length
        },
        averageDuration: this.calculateAverageInterventionDuration(blockingItems)
      };
      
      return {
        pipelineId,
        stats,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Failed to get intervention stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        `Pipeline not found: ${pipelineId}`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  /**
   * Helper to calculate average intervention duration
   */
  private calculateAverageInterventionDuration(items: any[]): number {
    const completed = items.filter(i => i.startedAt && i.completedAt);
    if (completed.length === 0) return 0;
    
    const totalDuration = completed.reduce((sum, item) => {
      const duration = new Date(item.completedAt).getTime() - new Date(item.startedAt).getTime();
      return sum + duration;
    }, 0);
    
    return Math.round(totalDuration / completed.length);
  }

  /**
   * Get historical metrics for a template
   */
  @Get('templates/:template/metrics')
  @ApiOperation({ summary: 'Get historical metrics for a pipeline template' })
  @ApiParam({ name: 'template', description: 'Template name' })
  @ApiResponse({ status: 200, description: 'Historical metrics retrieved' })
  async getTemplateMetrics(@Param('template') template: PipelineTemplate) {
    try {
      const metrics = await this.metricsService.getHistoricalMetrics(template);
      return {
        template,
        metrics,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get template metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        'Failed to get template metrics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get performance trend for a template
   */
  @Get('templates/:template/trend')
  @ApiOperation({ summary: 'Get performance trend for a pipeline template' })
  @ApiParam({ name: 'template', description: 'Template name' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze (default: 30)' })
  @ApiResponse({ status: 200, description: 'Performance trend retrieved' })
  async getPerformanceTrend(
    @Param('template') template: PipelineTemplate,
    @Query('days') days?: string
  ) {
    try {
      const dayCount = days ? parseInt(days, 10) : 30;
      const trend = await this.metricsService.trackPerformanceTrend(template, dayCount);
      return {
        template,
        days: dayCount,
        trend,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get performance trend: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        'Failed to get performance trend',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get step metrics for a template
   */
  @Get('templates/:template/steps')
  @ApiOperation({ summary: 'Get step-level metrics for a pipeline template' })
  @ApiParam({ name: 'template', description: 'Template name' })
  @ApiResponse({ status: 200, description: 'Step metrics retrieved' })
  async getStepMetrics(@Param('template') template: PipelineTemplate) {
    try {
      const stepMetrics = await this.metricsService.getStepMetrics(template);
      return {
        template,
        steps: stepMetrics,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get step metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new HttpException(
        'Failed to get step metrics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}