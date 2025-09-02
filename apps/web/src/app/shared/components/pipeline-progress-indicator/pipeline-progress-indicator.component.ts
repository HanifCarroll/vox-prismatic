import { Component, Input, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SSEService, PipelineEvent } from '../../../core/services/sse.service';
import { ProjectStage } from '../../../core/models/project.model';

export interface PipelineStageInfo {
  stage: ProjectStage;
  label: string;
  icon: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'blocked';
  progress?: number;
  error?: string;
  blockingItems?: any[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pipeline-progress-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <i class="pi pi-sitemap text-lg text-gray-600 mr-2"></i>
            <h4 class="text-sm font-medium text-gray-800">Pipeline Progress</h4>
          </div>
          <div class="flex items-center space-x-2">
            <!-- Overall Progress -->
            <span class="text-sm text-gray-500">Overall:</span>
            <div class="flex items-center">
              <div class="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  [style.width.%]="overallProgress()"
                ></div>
              </div>
              <span class="ml-2 text-sm font-medium text-gray-700">
                {{ overallProgress() }}%
              </span>
            </div>
            <!-- Connection Status -->
            <div *ngIf="showRealtimeStatus" class="flex items-center ml-4">
              <div 
                class="w-2 h-2 rounded-full animate-pulse"
                [class.bg-green-500]="isConnected()"
                [class.bg-gray-300]="!isConnected()"
              ></div>
              <span class="ml-1 text-xs text-gray-500">
                {{ isConnected() ? 'Live' : 'Offline' }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Pipeline Stages -->
      <div class="p-4">
        <!-- Horizontal Pipeline View -->
        <div class="relative">
          <!-- Connecting Line -->
          <div class="absolute top-8 left-8 right-8 h-0.5 bg-gray-200"></div>
          <div 
            class="absolute top-8 left-8 h-0.5 bg-blue-600 transition-all duration-500"
            [style.width.%]="progressLineWidth()"
          ></div>
          
          <!-- Stages -->
          <div class="relative flex justify-between">
            <div 
              *ngFor="let stage of pipelineStages(); let i = index"
              class="flex flex-col items-center"
              [class.opacity-50]="stage.status === 'pending'"
            >
              <!-- Stage Circle -->
              <div 
                class="relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 z-10"
                [class.bg-gray-100]="stage.status === 'pending'"
                [class.bg-blue-100]="stage.status === 'active'"
                [class.bg-green-100]="stage.status === 'completed'"
                [class.bg-red-100]="stage.status === 'failed'"
                [class.bg-yellow-100]="stage.status === 'blocked'"
                [class.ring-4]="stage.status === 'active'"
                [class.ring-blue-300]="stage.status === 'active'"
                [class.animate-pulse]="stage.status === 'active'"
              >
                <i 
                  [class]="'pi ' + stage.icon + ' text-2xl'"
                  [class.text-gray-400]="stage.status === 'pending'"
                  [class.text-blue-600]="stage.status === 'active'"
                  [class.text-green-600]="stage.status === 'completed'"
                  [class.text-red-600]="stage.status === 'failed'"
                  [class.text-yellow-600]="stage.status === 'blocked'"
                ></i>
                
                <!-- Progress Indicator for Active Stage -->
                <div 
                  *ngIf="stage.status === 'active' && stage.progress"
                  class="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200"
                >
                  <span class="text-xs font-bold text-blue-600">
                    {{ stage.progress }}%
                  </span>
                </div>
                
                <!-- Error/Blocked Indicator -->
                <div 
                  *ngIf="stage.status === 'failed' || stage.status === 'blocked'"
                  class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <i class="pi pi-exclamation text-white text-xs"></i>
                </div>
              </div>
              
              <!-- Stage Label -->
              <span 
                class="mt-2 text-xs font-medium text-center max-w-[80px]"
                [class.text-gray-500]="stage.status === 'pending'"
                [class.text-gray-800]="stage.status !== 'pending'"
              >
                {{ stage.label }}
              </span>
              
              <!-- Status Badge -->
              <span 
                *ngIf="stage.status !== 'pending'"
                class="mt-1 px-2 py-0.5 text-xs rounded-full"
                [class.bg-blue-100]="stage.status === 'active'"
                [class.text-blue-700]="stage.status === 'active'"
                [class.bg-green-100]="stage.status === 'completed'"
                [class.text-green-700]="stage.status === 'completed'"
                [class.bg-red-100]="stage.status === 'failed'"
                [class.text-red-700]="stage.status === 'failed'"
                [class.bg-yellow-100]="stage.status === 'blocked'"
                [class.text-yellow-700]="stage.status === 'blocked'"
              >
                {{ stage.status }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Current Stage Details -->
        <div *ngIf="currentStageDetails()" class="mt-6 p-3 bg-gray-50 rounded-lg">
          <div class="flex items-start justify-between">
            <div>
              <h5 class="text-sm font-medium text-gray-800">
                Current: {{ currentStageDetails()?.label }}
              </h5>
              <p class="text-xs text-gray-600 mt-1">
                {{ getStageDescription(currentStageDetails()!.stage) }}
              </p>
            </div>
            <div *ngIf="estimatedTimeRemaining" class="text-right">
              <span class="text-xs text-gray-500">Est. time remaining</span>
              <p class="text-sm font-medium text-gray-800">
                {{ formatDuration(estimatedTimeRemaining) }}
              </p>
            </div>
          </div>
          
          <!-- Blocking Items -->
          <div *ngIf="currentStageDetails()?.blockingItems && currentStageDetails()!.blockingItems!.length > 0" 
               class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <div class="flex items-start">
              <i class="pi pi-exclamation-triangle text-yellow-600 mr-2"></i>
              <div>
                <p class="text-xs font-medium text-yellow-800">Action Required</p>
                <ul class="mt-1 text-xs text-yellow-700">
                  <li *ngFor="let item of currentStageDetails()!.blockingItems">
                    {{ item.description || item }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <!-- Error Message -->
          <div *ngIf="currentStageDetails()?.error" 
               class="mt-3 p-2 bg-red-50 border border-red-200 rounded">
            <div class="flex items-start">
              <i class="pi pi-times-circle text-red-600 mr-2"></i>
              <div>
                <p class="text-xs font-medium text-red-800">Error</p>
                <p class="text-xs text-red-700 mt-1">{{ currentStageDetails()!.error }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class PipelineProgressIndicatorComponent implements OnInit, OnDestroy {
  @Input() projectId?: string;
  @Input() transcriptId?: string;
  @Input() initialStage: ProjectStage = ProjectStage.RAW_CONTENT;
  @Input() showRealtimeStatus = true;
  @Input() estimatedTimeRemaining?: number;
  
  private sseService = inject(SSEService);
  private sseConnection?: any;
  
  // State signals
  currentStage = signal<ProjectStage>(this.initialStage);
  stageProgress = signal<number>(0);
  isConnected = signal(false);
  lastEvent = signal<PipelineEvent | null>(null);
  
  // Computed values
  pipelineStages = computed(() => this.buildPipelineStages());
  overallProgress = computed(() => this.calculateOverallProgress());
  progressLineWidth = computed(() => this.calculateProgressLineWidth());
  currentStageDetails = computed(() => 
    this.pipelineStages().find(s => s.status === 'active')
  );
  
  // Pipeline stage definitions
  private readonly stageDefinitions: Array<{
    stage: ProjectStage;
    label: string;
    icon: string;
    order: number;
  }> = [
    { stage: ProjectStage.RAW_CONTENT, label: 'Raw Content', icon: 'pi-file', order: 1 },
    { stage: ProjectStage.PROCESSING_CONTENT, label: 'Processing', icon: 'pi-cog', order: 2 },
    { stage: ProjectStage.INSIGHTS_READY, label: 'Insights', icon: 'pi-lightbulb', order: 3 },
    { stage: ProjectStage.INSIGHTS_APPROVED, label: 'Approved', icon: 'pi-check', order: 4 },
    { stage: ProjectStage.POSTS_GENERATED, label: 'Posts', icon: 'pi-file-edit', order: 5 },
    { stage: ProjectStage.POSTS_APPROVED, label: 'Ready', icon: 'pi-check-circle', order: 6 },
    { stage: ProjectStage.SCHEDULED, label: 'Scheduled', icon: 'pi-calendar', order: 7 },
    { stage: ProjectStage.PUBLISHED, label: 'Published', icon: 'pi-send', order: 8 }
  ];
  
  ngOnInit(): void {
    this.currentStage.set(this.initialStage);
    
    if (this.transcriptId && this.showRealtimeStatus) {
      this.setupSSEConnection();
    }
  }
  
  ngOnDestroy(): void {
    if (this.sseConnection) {
      this.sseConnection.cleanup();
    }
  }
  
  private setupSSEConnection(): void {
    if (!this.transcriptId) return;
    
    this.sseConnection = this.sseService.createPipelineSSEConnection(
      this.transcriptId,
      (event) => this.handlePipelineEvent(event),
      (error) => {
        console.error('Pipeline SSE error:', error);
        this.isConnected.set(false);
      },
      () => {
        this.isConnected.set(true);
      }
    );
  }
  
  private handlePipelineEvent(event: PipelineEvent): void {
    this.lastEvent.set(event);
    
    // Update current stage based on event
    const stageMapping: Record<string, ProjectStage> = {
      'processing': ProjectStage.PROCESSING_CONTENT,
      'insights_extraction': ProjectStage.INSIGHTS_READY,
      'insights_review': ProjectStage.INSIGHTS_APPROVED,
      'post_generation': ProjectStage.POSTS_GENERATED,
      'post_review': ProjectStage.POSTS_APPROVED,
      'scheduling': ProjectStage.SCHEDULED,
      'publishing': ProjectStage.PUBLISHING,
      'published': ProjectStage.PUBLISHED
    };
    
    const mappedStage = stageMapping[event.stage];
    if (mappedStage) {
      this.currentStage.set(mappedStage);
    }
    
    // Update progress
    if (event.data?.progress) {
      this.stageProgress.set(event.data.progress);
    }
  }
  
  private buildPipelineStages(): PipelineStageInfo[] {
    const currentStageOrder = this.getStageOrder(this.currentStage());
    const lastEventData = this.lastEvent();
    
    return this.stageDefinitions.map(def => {
      let status: PipelineStageInfo['status'] = 'pending';
      let progress: number | undefined;
      let error: string | undefined;
      let blockingItems: any[] | undefined;
      
      if (def.order < currentStageOrder) {
        status = 'completed';
      } else if (def.stage === this.currentStage()) {
        status = 'active';
        progress = this.stageProgress();
        
        if (lastEventData) {
          if (lastEventData.type === 'pipeline.stage_failed') {
            status = 'failed';
            error = lastEventData.data?.error;
          } else if (lastEventData.type === 'pipeline.blocked') {
            status = 'blocked';
            blockingItems = lastEventData.data?.blockingItems;
          }
        }
      }
      
      return {
        stage: def.stage,
        label: def.label,
        icon: def.icon,
        status,
        progress,
        error,
        blockingItems
      };
    });
  }
  
  private getStageOrder(stage: ProjectStage): number {
    const def = this.stageDefinitions.find(d => d.stage === stage);
    return def?.order || 0;
  }
  
  private calculateOverallProgress(): number {
    const totalStages = this.stageDefinitions.length;
    const currentOrder = this.getStageOrder(this.currentStage());
    const completedStages = Math.max(0, currentOrder - 1);
    const currentProgress = this.stageProgress() / 100;
    
    return Math.round(((completedStages + currentProgress) / totalStages) * 100);
  }
  
  private calculateProgressLineWidth(): number {
    const stages = this.pipelineStages();
    const totalStages = stages.length;
    if (totalStages <= 1) return 0;
    
    const completedStages = stages.filter(s => s.status === 'completed').length;
    const activeStage = stages.find(s => s.status === 'active');
    const activeProgress = activeStage ? (activeStage.progress || 0) / 100 : 0;
    
    return ((completedStages + activeProgress) / (totalStages - 1)) * 85; // 85% to account for padding
  }
  
  private getStageDescription(stage: ProjectStage): string {
    const descriptions: Record<ProjectStage, string> = {
      [ProjectStage.RAW_CONTENT]: 'Content uploaded and ready for processing',
      [ProjectStage.PROCESSING_CONTENT]: 'AI is analyzing and cleaning the content',
      [ProjectStage.INSIGHTS_READY]: 'Key insights have been extracted',
      [ProjectStage.INSIGHTS_APPROVED]: 'Insights reviewed and approved',
      [ProjectStage.POSTS_GENERATED]: 'Social media posts created',
      [ProjectStage.POSTS_APPROVED]: 'Posts reviewed and ready to schedule',
      [ProjectStage.SCHEDULED]: 'Posts scheduled for publishing',
      [ProjectStage.PUBLISHING]: 'Publishing to social platforms',
      [ProjectStage.PUBLISHED]: 'Successfully published',
      [ProjectStage.ARCHIVED]: 'Project archived'
    };
    return descriptions[stage] || '';
  }
  
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}