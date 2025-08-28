import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { PipelineState, PipelineTemplate, PipelineMetrics } from '../state/pipeline-context.types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PIPELINE_EVENTS } from '../events/pipeline.events';

/**
 * Historical metrics for pipeline performance
 */
export interface HistoricalMetrics {
  template: PipelineTemplate;
  averageDuration: number;
  medianDuration: number;
  successRate: number;
  failureRate: number;
  averageInsightCount: number;
  averagePostCount: number;
  averageReviewTime: number;
  sampleSize: number;
}

/**
 * Step-level metrics
 */
export interface StepMetrics {
  stepName: string;
  averageDuration: number;
  successRate: number;
  retryRate: number;
  failureReasons: Map<string, number>;
}

/**
 * Performance recommendations
 */
export interface PerformanceRecommendation {
  type: 'warning' | 'info' | 'success';
  area: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

/**
 * Pipeline Metrics Service
 * Tracks pipeline performance and provides estimations
 */
@Injectable()
export class PipelineMetricsService {
  private readonly logger = new Logger(PipelineMetricsService.name);
  private metricsCache = new Map<string, HistoricalMetrics>();
  private lastCacheUpdate: Date | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Calculate metrics for a specific pipeline
   */
  async calculatePipelineMetrics(pipelineId: string): Promise<PipelineMetrics> {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId }
    });

    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const transcriptProcessingTime = this.calculateStepDuration(
      pipeline,
      PipelineState.CLEANING_TRANSCRIPT
    );

    const insightExtractionTime = this.calculateStepDuration(
      pipeline,
      PipelineState.EXTRACTING_INSIGHTS
    );

    const postGenerationTime = this.calculateStepDuration(
      pipeline,
      PipelineState.GENERATING_POSTS
    );

    const insights = await this.prisma.insight.findMany({
      where: { id: { in: pipeline.insightIds } }
    });

    const posts = await this.prisma.post.findMany({
      where: { id: { in: pipeline.postIds } }
    });

    const approvedInsights = insights.filter(i => i.status === 'approved');
    const approvedPosts = posts.filter(p => p.status === 'approved' || p.status === 'scheduled');

    const successRate = pipeline.completedSteps > 0
      ? (pipeline.completedSteps / pipeline.totalSteps) * 100
      : 0;

    const failureRate = pipeline.failedSteps
      ? ((pipeline.failedSteps as any[]).length / pipeline.totalSteps) * 100
      : 0;

    const metrics: PipelineMetrics = {
      transcriptProcessingTime,
      insightExtractionTime,
      averageInsightReviewTime: this.calculateAverageReviewTime(insights),
      postGenerationTime,
      averagePostReviewTime: this.calculateAverageReviewTime(posts),
      totalProcessingTime: pipeline.actualDuration || 0,
      successRate,
      failureRate
    };

    // Emit metrics update event
    this.eventEmitter.emit(PIPELINE_EVENTS.METRICS_UPDATED, {
      pipelineId,
      transcriptId: pipeline.transcriptId,
      metrics,
      timestamp: new Date()
    });

    return metrics;
  }

  /**
   * Get historical metrics for a template
   */
  async getHistoricalMetrics(template: PipelineTemplate): Promise<HistoricalMetrics> {
    // Check cache first
    if (this.metricsCache.has(template)) {
      const cached = this.metricsCache.get(template)!;
      const cacheAge = this.lastCacheUpdate 
        ? Date.now() - this.lastCacheUpdate.getTime()
        : Infinity;
      
      // Use cache if less than 5 minutes old
      if (cacheAge < 5 * 60 * 1000) {
        return cached;
      }
    }

    // Query completed pipelines for this template
    const pipelines = await this.prisma.pipeline.findMany({
      where: {
        template,
        state: PipelineState.COMPLETED
      },
      orderBy: { completedAt: 'desc' },
      take: 100 // Last 100 completed pipelines
    });

    if (pipelines.length === 0) {
      // Return default metrics if no history
      return {
        template,
        averageDuration: 15 * 60 * 1000, // 15 minutes default
        medianDuration: 15 * 60 * 1000,
        successRate: 0,
        failureRate: 0,
        averageInsightCount: 5,
        averagePostCount: 10,
        averageReviewTime: 5 * 60 * 1000,
        sampleSize: 0
      };
    }

    const durations = pipelines
      .map(p => p.actualDuration)
      .filter(d => d !== null) as number[];

    const insightCounts = pipelines.map(p => p.insightIds.length);
    const postCounts = pipelines.map(p => p.postIds.length);

    const metrics: HistoricalMetrics = {
      template,
      averageDuration: this.calculateAverage(durations),
      medianDuration: this.calculateMedian(durations),
      successRate: (pipelines.length / pipelines.length) * 100, // All are completed
      failureRate: 0,
      averageInsightCount: this.calculateAverage(insightCounts),
      averagePostCount: this.calculateAverage(postCounts),
      averageReviewTime: await this.calculateAverageReviewTimeForTemplate(template),
      sampleSize: pipelines.length
    };

    // Update cache
    this.metricsCache.set(template, metrics);
    this.lastCacheUpdate = new Date();

    return metrics;
  }

  /**
   * Estimate completion time for a pipeline
   */
  async estimateCompletion(pipelineId: string): Promise<Date> {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId }
    });

    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    // If already completed, return actual completion time
    if (pipeline.completedAt) {
      return pipeline.completedAt;
    }

    // Get historical metrics for this template
    const historical = await this.getHistoricalMetrics(pipeline.template as PipelineTemplate);

    // Calculate based on current progress
    if (pipeline.progress === 0) {
      // Not started yet, use historical average
      return new Date(Date.now() + historical.averageDuration);
    }

    // Calculate based on current progress rate
    const elapsed = pipeline.startedAt 
      ? Date.now() - pipeline.startedAt.getTime()
      : 0;

    if (elapsed === 0 || pipeline.progress === 0) {
      return new Date(Date.now() + historical.averageDuration);
    }

    // Extrapolate based on current progress
    const estimatedTotal = (elapsed / pipeline.progress) * 100;
    const remaining = estimatedTotal - elapsed;

    // Adjust based on blocking items
    const blockingItems = pipeline.blockingItems as any[] || [];
    const blockingAdjustment = blockingItems.length * historical.averageReviewTime;

    return new Date(Date.now() + remaining + blockingAdjustment);
  }

  /**
   * Get performance recommendations for a pipeline
   */
  async getPerformanceRecommendations(pipelineId: string): Promise<PerformanceRecommendation[]> {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId }
    });

    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const recommendations: PerformanceRecommendation[] = [];
    const historical = await this.getHistoricalMetrics(pipeline.template as PipelineTemplate);

    // Check if pipeline is taking longer than average
    if (pipeline.actualDuration && pipeline.actualDuration > historical.averageDuration * 1.5) {
      recommendations.push({
        type: 'warning',
        area: 'duration',
        message: `Pipeline is taking 50% longer than average (${Math.round(pipeline.actualDuration / 1000)}s vs ${Math.round(historical.averageDuration / 1000)}s)`,
        impact: 'high',
        actionable: true
      });
    }

    // Check blocking items
    const blockingItems = pipeline.blockingItems as any[] || [];
    if (blockingItems.length > 3) {
      recommendations.push({
        type: 'warning',
        area: 'review',
        message: `${blockingItems.length} items are waiting for review. Consider batch reviewing.`,
        impact: 'medium',
        actionable: true
      });
    }

    // Check retry count
    if (pipeline.retryCount > 1) {
      recommendations.push({
        type: 'info',
        area: 'reliability',
        message: `Pipeline has been retried ${pipeline.retryCount} times. Check for recurring issues.`,
        impact: 'medium',
        actionable: true
      });
    }

    // Check insight count
    if (pipeline.insightIds.length < historical.averageInsightCount * 0.5) {
      recommendations.push({
        type: 'info',
        area: 'content',
        message: `Fewer insights than usual (${pipeline.insightIds.length} vs average ${Math.round(historical.averageInsightCount)})`,
        impact: 'low',
        actionable: false
      });
    }

    // Success message if performing well
    if (pipeline.actualDuration && pipeline.actualDuration < historical.averageDuration * 0.8) {
      recommendations.push({
        type: 'success',
        area: 'performance',
        message: `Pipeline completed 20% faster than average!`,
        impact: 'high',
        actionable: false
      });
    }

    return recommendations;
  }

  /**
   * Get step-level metrics
   */
  async getStepMetrics(template: PipelineTemplate): Promise<StepMetrics[]> {
    const pipelines = await this.prisma.pipeline.findMany({
      where: {
        template,
        state: { in: [PipelineState.COMPLETED, PipelineState.PARTIALLY_COMPLETED] }
      },
      take: 50
    });

    const stepMetricsMap = new Map<string, StepMetrics>();

    for (const pipeline of pipelines) {
      const successfulSteps = pipeline.successfulSteps as string[] || [];
      const failedSteps = pipeline.failedSteps as string[] || [];

      // Track successful steps
      for (const step of successfulSteps) {
        if (!stepMetricsMap.has(step)) {
          stepMetricsMap.set(step, {
            stepName: step,
            averageDuration: 0,
            successRate: 0,
            retryRate: 0,
            failureReasons: new Map()
          });
        }

        const metrics = stepMetricsMap.get(step)!;
        metrics.successRate++;
      }

      // Track failed steps
      for (const step of failedSteps) {
        if (!stepMetricsMap.has(step)) {
          stepMetricsMap.set(step, {
            stepName: step,
            averageDuration: 0,
            successRate: 0,
            retryRate: 0,
            failureReasons: new Map()
          });
        }

        const metrics = stepMetricsMap.get(step)!;
        // Track failure reason if available
        if (pipeline.lastError) {
          const count = metrics.failureReasons.get(pipeline.lastError) || 0;
          metrics.failureReasons.set(pipeline.lastError, count + 1);
        }
      }
    }

    // Calculate success rates
    const totalPipelines = pipelines.length;
    for (const metrics of stepMetricsMap.values()) {
      metrics.successRate = (metrics.successRate / totalPipelines) * 100;
    }

    return Array.from(stepMetricsMap.values());
  }

  /**
   * Track pipeline performance over time
   */
  async trackPerformanceTrend(
    template: PipelineTemplate,
    days: number = 30
  ): Promise<{ date: Date; averageDuration: number; successRate: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pipelines = await this.prisma.pipeline.findMany({
      where: {
        template,
        createdAt: { gte: startDate },
        state: { in: [PipelineState.COMPLETED, PipelineState.PARTIALLY_COMPLETED, PipelineState.FAILED] }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by day
    const dailyMetrics = new Map<string, { durations: number[]; successes: number; total: number }>();

    for (const pipeline of pipelines) {
      const dateKey = pipeline.createdAt.toISOString().split('T')[0];
      
      if (!dailyMetrics.has(dateKey)) {
        dailyMetrics.set(dateKey, { durations: [], successes: 0, total: 0 });
      }

      const metrics = dailyMetrics.get(dateKey)!;
      metrics.total++;

      if (pipeline.actualDuration) {
        metrics.durations.push(pipeline.actualDuration);
      }

      if (pipeline.state === PipelineState.COMPLETED) {
        metrics.successes++;
      }
    }

    // Calculate daily averages
    const trend: { date: Date; averageDuration: number; successRate: number }[] = [];

    for (const [dateKey, metrics] of dailyMetrics.entries()) {
      trend.push({
        date: new Date(dateKey),
        averageDuration: this.calculateAverage(metrics.durations),
        successRate: (metrics.successes / metrics.total) * 100
      });
    }

    return trend;
  }

  /**
   * Clean up old metrics data
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldMetrics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Archive old pipeline data
    const result = await this.prisma.pipeline.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        state: { in: [PipelineState.COMPLETED, PipelineState.FAILED, PipelineState.CANCELLED] }
      }
    });

    this.logger.log(`Cleaned up ${result.count} old pipeline records`);

    // Clear metrics cache
    this.metricsCache.clear();
    this.lastCacheUpdate = null;
  }

  /**
   * Helper: Calculate step duration
   */
  private calculateStepDuration(pipeline: any, stepState: PipelineState): number {
    // This would need to be implemented based on actual step tracking
    // For now, return a portion of total duration
    if (!pipeline.actualDuration) return 0;
    
    const stepWeight = {
      [PipelineState.CLEANING_TRANSCRIPT]: 0.15,
      [PipelineState.EXTRACTING_INSIGHTS]: 0.25,
      [PipelineState.REVIEWING_INSIGHTS]: 0.20,
      [PipelineState.GENERATING_POSTS]: 0.20,
      [PipelineState.REVIEWING_POSTS]: 0.15,
      [PipelineState.SCHEDULING]: 0.05
    };

    return pipeline.actualDuration * (stepWeight[stepState] || 0);
  }

  /**
   * Helper: Calculate average review time
   */
  private calculateAverageReviewTime(entities: any[]): number {
    const reviewTimes: number[] = [];
    
    for (const entity of entities) {
      if (entity.createdAt && entity.updatedAt) {
        const reviewTime = new Date(entity.updatedAt).getTime() - new Date(entity.createdAt).getTime();
        reviewTimes.push(reviewTime);
      }
    }

    return reviewTimes.length > 0 ? this.calculateAverage(reviewTimes) : 0;
  }

  /**
   * Helper: Calculate average review time for template
   */
  private async calculateAverageReviewTimeForTemplate(template: PipelineTemplate): Promise<number> {
    // This would query historical review times for the template
    // For now, return a default based on template
    const defaults = {
      standard: 5 * 60 * 1000,
      fast_track: 2 * 60 * 1000,
      podcast: 6 * 60 * 1000,
      video: 5 * 60 * 1000,
      article: 3 * 60 * 1000,
      custom: 5 * 60 * 1000
    };

    return defaults[template] || 5 * 60 * 1000;
  }

  /**
   * Helper: Calculate average
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Helper: Calculate median
   */
  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    
    return sorted[middle];
  }
}