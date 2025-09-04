import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, computed, signal, inject, OnInit, OnDestroy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';

import { ProjectStage } from '../../../core/models/project.model';
import { ProjectStore } from '../../../core/stores/project.store';
import { SSEEvent } from '../../../core/services/sse.service';

interface PipelineStage {
  stage: ProjectStage;
  label: string;
  icon: string;
  description: string;
  status: 'completed' | 'active' | 'upcoming' | 'processing' | 'error';
  progress?: number;
  isLive?: boolean;
  liveEvent?: SSEEvent;
  estimatedTimeRemaining?: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-project-pipeline',
  standalone: true,
  imports: [
    CommonModule,
    TooltipModule,
    ProgressBarModule,
    BadgeModule,
    DividerModule
  ],
  templateUrl: './project-pipeline.component.html',
  styleUrl: './project-pipeline.component.css'
})
export class ProjectPipelineComponent implements OnInit, OnDestroy, OnChanges {
  @Input() currentStage!: ProjectStage;
  @Input() progress: number = 0;
  @Input() projectId?: string;
  @Output() stageClick = new EventEmitter<ProjectStage>();
  
  private readonly projectStore = inject(ProjectStore);
  
  // Real-time state signals
  private readonly _liveUpdate = signal<SSEEvent | null>(null);
  
  // Computed values for real-time updates
  readonly hasLiveUpdate = computed(() => this._liveUpdate() !== null);
  readonly isProcessing = computed(() => {
    const update = this._liveUpdate();
    if (!update) return false;
    
    const processingEvents = ['ProcessingStarted', 'StageChanged'];
    return processingEvents.includes(update.type);
  });
  readonly liveProgress = computed(() => {
    const update = this._liveUpdate();
    return update?.data.progress ?? this.progress;
  });
  readonly estimatedTimeRemaining = computed(() => {
    const update = this._liveUpdate();
    return update?.data.estimatedTimeRemaining;
  });

  pipelineStages: PipelineStage[] = [
    {
      stage: ProjectStage.RAW_CONTENT,
      label: 'Raw Content',
      icon: 'pi pi-file',
      description: 'Content uploaded and ready for processing',
      status: 'upcoming'
    },
    {
      stage: ProjectStage.PROCESSING_CONTENT,
      label: 'Processing',
      icon: 'pi pi-cog',
      description: 'AI is cleaning and analyzing the content',
      status: 'upcoming'
    },
    {
      stage: ProjectStage.INSIGHTS_READY,
      label: 'Insights Ready',
      icon: 'pi pi-lightbulb',
      description: 'Insights generated, awaiting review',
      status: 'upcoming'
    },
    {
      stage: ProjectStage.INSIGHTS_APPROVED,
      label: 'Insights Approved',
      icon: 'pi pi-check-circle',
      description: 'Insights approved, ready for post generation',
      status: 'upcoming'
    },
    {
      stage: ProjectStage.POSTS_GENERATED,
      label: 'Posts Generated',
      icon: 'pi pi-pencil',
      description: 'Posts created, awaiting review',
      status: 'upcoming'
    },
    {
      stage: ProjectStage.POSTS_APPROVED,
      label: 'Posts Approved',
      icon: 'pi pi-verified',
      description: 'Posts approved, ready for scheduling',
      status: 'upcoming'
    },
    {
      stage: ProjectStage.SCHEDULED,
      label: 'Scheduled',
      icon: 'pi pi-calendar',
      description: 'Posts scheduled for publishing',
      status: 'upcoming'
    },
    {
      stage: ProjectStage.PUBLISHING,
      label: 'Publishing',
      icon: 'pi pi-send',
      description: 'Posts being published to platforms',
      status: 'upcoming'
    },
    {
      stage: ProjectStage.PUBLISHED,
      label: 'Published',
      icon: 'pi pi-globe',
      description: 'All posts successfully published',
      status: 'upcoming'
    }
  ];

  ngOnInit() {
    this.updateStageStatuses();
    this.subscribeToLiveUpdates();
  }
  
  ngOnDestroy() {
    // Cleanup is handled by takeUntilDestroyed in the subscription
  }

  ngOnChanges() {
    this.updateStageStatuses();
    this.subscribeToLiveUpdates();
  }
  
  /**
   * Subscribe to live updates for the current project
   */
  private subscribeToLiveUpdates(): void {
    if (!this.projectId) return;
    
    // Get the latest real-time update for this project
    const liveUpdate = this.projectStore.getProjectRealTimeUpdate(this.projectId);
    this._liveUpdate.set(liveUpdate || null);
    
    // Update stage statuses with live data
    this.updateStageStatusesWithLiveData();
  }

  private updateStageStatuses() {
    const currentIndex = this.getStageIndex(this.currentStage);
    
    this.pipelineStages.forEach((stage, index) => {
      if (index < currentIndex) {
        stage.status = 'completed';
        stage.progress = 100;
        stage.isLive = false;
      } else if (index === currentIndex) {
        stage.status = 'active';
        stage.progress = this.progress;
        stage.isLive = false;
      } else {
        stage.status = 'upcoming';
        stage.progress = 0;
        stage.isLive = false;
      }
    });
    
    // Apply live updates if available
    this.updateStageStatusesWithLiveData();
  }
  
  /**
   * Update stage statuses with real-time SSE data
   */
  private updateStageStatusesWithLiveData(): void {
    const liveUpdate = this._liveUpdate();
    if (!liveUpdate) return;
    
    const currentIndex = this.getStageIndex(this.currentStage);
    
    this.pipelineStages.forEach((stage, index) => {
      // Mark current stage with live data
      if (index === currentIndex) {
        stage.isLive = true;
        stage.liveEvent = liveUpdate;
        
        // Update status based on live event type
        if (liveUpdate.type === 'ProcessingStarted') {
          stage.status = 'processing';
          stage.icon = 'pi pi-spin pi-spinner';
        } else if (liveUpdate.type === 'ProcessingFailed' || liveUpdate.type === 'ErrorOccurred') {
          stage.status = 'error';
          stage.icon = 'pi pi-exclamation-circle';
        }
        
        // Update progress from live data
        if (liveUpdate.data.progress !== undefined) {
          stage.progress = liveUpdate.data.progress;
        }
        
        // Update estimated time remaining
        if (liveUpdate.data.estimatedTimeRemaining) {
          stage.estimatedTimeRemaining = liveUpdate.data.estimatedTimeRemaining;
        }
      }
    });
  }

  private getStageIndex(stage: ProjectStage): number {
    const stageOrder = [
      ProjectStage.RAW_CONTENT,
      ProjectStage.PROCESSING_CONTENT,
      ProjectStage.INSIGHTS_READY,
      ProjectStage.INSIGHTS_APPROVED,
      ProjectStage.POSTS_GENERATED,
      ProjectStage.POSTS_APPROVED,
      ProjectStage.SCHEDULED,
      ProjectStage.PUBLISHING,
      ProjectStage.PUBLISHED
    ];
    return stageOrder.indexOf(stage);
  }

  getStageClass(stage: PipelineStage): string {
    const baseClass = 'pipeline-stage';
    const statusClass = `pipeline-stage--${stage.status}`;
    const liveClass = stage.isLive ? 'pipeline-stage--live' : '';
    const processingClass = this.isProcessing() && stage.status === 'active' ? 'pipeline-stage--processing' : '';
    
    return [baseClass, statusClass, liveClass, processingClass].filter(Boolean).join(' ');
  }

  getConnectorClass(index: number): string {
    const stage = this.pipelineStages[index];
    if (stage.status === 'completed') {
      return 'connector connector--completed';
    } else if ((stage.status === 'active' || stage.status === 'processing') && stage.progress && stage.progress > 50) {
      return 'connector connector--active';
    } else if (stage.status === 'error') {
      return 'connector connector--error';
    }
    return 'connector';
  }

  onStageClick(stage: ProjectStage) {
    this.stageClick.emit(stage);
  }

  isClickable(stage: PipelineStage): boolean {
    return stage.status === 'completed' || stage.status === 'active' || stage.status === 'processing';
  }
  
  /**
   * Get live status indicator text
   */
  getLiveStatusText(stage: PipelineStage): string {
    if (!stage.isLive || !stage.liveEvent) return '';
    
    switch (stage.liveEvent.type) {
      case 'ProcessingStarted':
        return 'Processing...';
      case 'ProcessingCompleted':
        return 'Completed';
      case 'StageChanged':
        return 'Stage Updated';
      case 'ProcessingFailed':
        return 'Failed';
      case 'ErrorOccurred':
        return 'Error';
      default:
        return 'Live';
    }
  }
  
  /**
   * Get progress bar color based on status
   */
  getProgressBarColor(stage: PipelineStage): string {
    switch (stage.status) {
      case 'completed':
        return '#10b981'; // green
      case 'active':
        return '#3b82f6'; // blue
      case 'processing':
        return '#f59e0b'; // orange
      case 'error':
        return '#ef4444'; // red
      default:
        return '#e5e7eb'; // gray
    }
  }
  
  /**
   * Format time remaining
   */
  formatTimeRemaining(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
  
  /**
   * Get SSE connection status for debugging
   */
  getSSEStatus() {
    return this.projectStore.isSSEConnected();
  }
  
  /**
   * Get live update timestamp
   */
  getLastUpdateTime(): string {
    const update = this._liveUpdate();
    if (!update) return '';
    
    const updateTime = new Date(update.timestamp);
    const now = new Date();
    const diff = (now.getTime() - updateTime.getTime()) / 1000;
    
    if (diff < 60) {
      return `${Math.round(diff)}s ago`;
    } else if (diff < 3600) {
      return `${Math.round(diff / 60)}m ago`;
    } else {
      return `${Math.round(diff / 3600)}h ago`;
    }
  }
}