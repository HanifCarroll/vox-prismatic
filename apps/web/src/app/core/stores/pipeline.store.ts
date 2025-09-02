import { Injectable, signal, computed } from '@angular/core';
import { ProjectStage } from '../models/project.model';

export interface PipelineJob {
  id: string;
  projectId: string;
  type: 'process-content' | 'extract-insights' | 'generate-posts' | 'schedule-posts' | 'publish-now';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  estimatedTimeRemaining?: number;
}

export interface PipelineActivity {
  id: string;
  projectId: string;
  timestamp: Date;
  type: 'stage_started' | 'stage_completed' | 'stage_failed' | 'job_started' | 
        'job_completed' | 'job_failed' | 'user_action' | 'system_event';
  stage?: ProjectStage;
  description: string;
  actor?: string;
  metadata?: Record<string, any>;
}

export interface ProjectPipeline {
  projectId: string;
  currentStage: ProjectStage;
  overallProgress: number;
  activeJobs: PipelineJob[];
  recentActivity: PipelineActivity[];
  isBlocked: boolean;
  blockingReason?: string;
  estimatedCompletion?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PipelineStore {
  // State signals
  private readonly _pipelines = signal<Map<string, ProjectPipeline>>(new Map());
  private readonly _activeJobs = signal<Map<string, PipelineJob>>(new Map());
  private readonly _recentActivity = signal<PipelineActivity[]>([]);
  private readonly _sseConnections = signal<Map<string, boolean>>(new Map());

  // Public read-only signals
  readonly pipelines = this._pipelines.asReadonly();
  readonly activeJobs = this._activeJobs.asReadonly();
  readonly recentActivity = this._recentActivity.asReadonly();
  readonly sseConnections = this._sseConnections.asReadonly();

  // Computed values
  readonly activePipelineCount = computed(() => {
    const pipelines = Array.from(this._pipelines().values());
    return pipelines.filter(p => p.activeJobs.length > 0).length;
  });

  readonly totalActiveJobs = computed(() => {
    return this._activeJobs().size;
  });

  readonly jobsByType = computed(() => {
    const jobs = Array.from(this._activeJobs().values());
    const byType: Record<string, PipelineJob[]> = {};
    
    jobs.forEach(job => {
      if (!byType[job.type]) {
        byType[job.type] = [];
      }
      byType[job.type].push(job);
    });
    
    return byType;
  });

  readonly failedJobs = computed(() => {
    return Array.from(this._activeJobs().values())
      .filter(job => job.status === 'failed');
  });

  readonly blockedPipelines = computed(() => {
    return Array.from(this._pipelines().values())
      .filter(p => p.isBlocked);
  });

  readonly activityByProject = computed(() => {
    const activities = this._recentActivity();
    const byProject: Record<string, PipelineActivity[]> = {};
    
    activities.forEach(activity => {
      if (!byProject[activity.projectId]) {
        byProject[activity.projectId] = [];
      }
      byProject[activity.projectId].push(activity);
    });
    
    return byProject;
  });

  // Actions
  getPipeline(projectId: string): ProjectPipeline | undefined {
    return this._pipelines().get(projectId);
  }

  setPipeline(projectId: string, pipeline: ProjectPipeline): void {
    this._pipelines.update(pipelines => {
      const newPipelines = new Map(pipelines);
      newPipelines.set(projectId, pipeline);
      return newPipelines;
    });
  }

  updatePipeline(projectId: string, updates: Partial<ProjectPipeline>): void {
    this._pipelines.update(pipelines => {
      const newPipelines = new Map(pipelines);
      const existing = newPipelines.get(projectId);
      if (existing) {
        newPipelines.set(projectId, { ...existing, ...updates });
      }
      return newPipelines;
    });
  }

  removePipeline(projectId: string): void {
    this._pipelines.update(pipelines => {
      const newPipelines = new Map(pipelines);
      newPipelines.delete(projectId);
      return newPipelines;
    });
  }

  // Job management
  addJob(job: PipelineJob): void {
    this._activeJobs.update(jobs => {
      const newJobs = new Map(jobs);
      newJobs.set(job.id, job);
      return newJobs;
    });

    // Update pipeline's active jobs
    this.updatePipeline(job.projectId, {
      activeJobs: [...(this.getPipeline(job.projectId)?.activeJobs || []), job]
    });
  }

  updateJob(jobId: string, updates: Partial<PipelineJob>): void {
    this._activeJobs.update(jobs => {
      const newJobs = new Map(jobs);
      const existing = newJobs.get(jobId);
      if (existing) {
        const updated = { ...existing, ...updates };
        newJobs.set(jobId, updated);
        
        // Update pipeline's active jobs
        this.updatePipeline(existing.projectId, {
          activeJobs: this.getPipeline(existing.projectId)?.activeJobs.map(j => 
            j.id === jobId ? updated : j
          ) || []
        });
      }
      return newJobs;
    });
  }

  completeJob(jobId: string): void {
    const job = this._activeJobs().get(jobId);
    if (job) {
      this.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        completedAt: new Date()
      });
      
      // Remove from active jobs after a delay
      setTimeout(() => this.removeJob(jobId), 1000);
    }
  }

  failJob(jobId: string, error: string): void {
    this.updateJob(jobId, {
      status: 'failed',
      error,
      completedAt: new Date()
    });
  }

  removeJob(jobId: string): void {
    const job = this._activeJobs().get(jobId);
    if (job) {
      this._activeJobs.update(jobs => {
        const newJobs = new Map(jobs);
        newJobs.delete(jobId);
        return newJobs;
      });

      // Update pipeline's active jobs
      this.updatePipeline(job.projectId, {
        activeJobs: this.getPipeline(job.projectId)?.activeJobs.filter(j => j.id !== jobId) || []
      });
    }
  }

  // Activity management
  addActivity(activity: PipelineActivity): void {
    this._recentActivity.update(activities => {
      const newActivities = [activity, ...activities];
      // Keep only last 100 activities
      return newActivities.slice(0, 100);
    });

    // Add to pipeline's recent activity
    const pipeline = this.getPipeline(activity.projectId);
    if (pipeline) {
      this.updatePipeline(activity.projectId, {
        recentActivity: [activity, ...pipeline.recentActivity].slice(0, 20)
      });
    }
  }

  clearActivities(projectId?: string): void {
    if (projectId) {
      this._recentActivity.update(activities => 
        activities.filter(a => a.projectId !== projectId)
      );
      this.updatePipeline(projectId, { recentActivity: [] });
    } else {
      this._recentActivity.set([]);
    }
  }

  // SSE connection management
  setConnectionStatus(projectId: string, connected: boolean): void {
    this._sseConnections.update(connections => {
      const newConnections = new Map(connections);
      newConnections.set(projectId, connected);
      return newConnections;
    });
  }

  isConnected(projectId: string): boolean {
    return this._sseConnections().get(projectId) || false;
  }

  // Stage progression
  updateStageProgress(projectId: string, stage: ProjectStage, progress: number): void {
    this.updatePipeline(projectId, {
      currentStage: stage,
      overallProgress: this.calculateOverallProgress(stage, progress)
    });
  }

  private calculateOverallProgress(stage: ProjectStage, stageProgress: number): number {
    const stages = Object.values(ProjectStage);
    const currentIndex = stages.indexOf(stage);
    const totalStages = stages.length - 1; // Exclude ARCHIVED
    
    if (currentIndex === -1) return 0;
    
    const completedStages = currentIndex;
    const currentProgress = stageProgress / 100;
    
    return Math.round(((completedStages + currentProgress) / totalStages) * 100);
  }

  // Blocking/unblocking
  blockPipeline(projectId: string, reason: string): void {
    this.updatePipeline(projectId, {
      isBlocked: true,
      blockingReason: reason
    });
  }

  unblockPipeline(projectId: string): void {
    this.updatePipeline(projectId, {
      isBlocked: false,
      blockingReason: undefined
    });
  }

  // Batch operations
  clearAll(): void {
    this._pipelines.set(new Map());
    this._activeJobs.set(new Map());
    this._recentActivity.set([]);
    this._sseConnections.set(new Map());
  }
}