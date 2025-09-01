import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProjectStage } from '../../../core/models/project.model';

interface PipelineStep {
  stage: ProjectStage;
  label: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-pipeline-visualization',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-gray-800">Pipeline Progress</h2>
        <button 
          *ngIf="showActions"
          (click)="onRefresh.emit()"
          class="text-blue-600 hover:text-blue-800 transition-colors"
          title="Refresh pipeline status"
        >
          <i class="pi pi-refresh"></i>
        </button>
      </div>
      
      <!-- Enhanced Progress Bar -->
      <div class="mb-6">
        <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
          <div class="flex items-center">
            <span>Overall Progress</span>
            <span 
              *ngIf="estimatedCompletion"
              class="ml-2 text-xs text-gray-500"
            >
              • Est. {{ estimatedCompletion }}
            </span>
          </div>
          <span class="font-semibold text-lg">{{ progress }}%</span>
        </div>
        <div class="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div 
            class="h-4 rounded-full transition-all duration-500 relative"
            [class]="getProgressBarClass()"
            [style.width.%]="progress"
          >
            <div class="absolute inset-0 bg-white opacity-20 animate-pulse" *ngIf="isProcessing"></div>
          </div>
          <!-- Progress milestones -->
          <div class="absolute inset-0 flex items-center justify-between px-1">
            <div 
              *ngFor="let milestone of [25, 50, 75]"
              class="w-0.5 h-2 bg-white opacity-50"
              [style.left.%]="milestone"
            ></div>
          </div>
        </div>
      </div>
      
      <!-- Enhanced Pipeline Steps -->
      <div class="relative mb-6">
        <!-- Connection line with progress -->
        <div class="absolute top-8 left-0 right-0 h-1 bg-gray-200 rounded-full"></div>
        <div 
          class="absolute top-8 left-0 h-1 bg-gradient-to-r from-green-400 to-blue-500 rounded-full transition-all duration-500"
          [style.width.%]="getConnectionProgress()"
        ></div>
        
        <!-- Steps -->
        <div class="flex justify-between relative">
          <div 
            *ngFor="let step of displaySteps; let i = index"
            class="flex flex-col items-center cursor-pointer group"
            [class.flex-1]="i < displaySteps.length - 1"
            (click)="onStageClick(step.stage)"
          >
            <!-- Step indicator -->
            <div 
              class="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 relative z-10 group-hover:scale-110"
              [ngClass]="getStepClass(step.stage)"
            >
              <i [class]="'pi ' + step.icon + ' text-lg'"></i>
              <!-- Pulse animation for current stage -->
              <div 
                *ngIf="isCurrentStage(step.stage) && isProcessing"
                class="absolute inset-0 rounded-full border-2 animate-ping"
                [class.border-blue-400]="true"
              ></div>
            </div>
            
            <!-- Step label -->
            <span 
              class="text-xs mt-2 text-center max-w-[100px] transition-colors"
              [class.font-bold]="isCurrentStage(step.stage)"
              [class.text-gray-900]="isCurrentStage(step.stage)"
              [class.text-gray-600]="isCompleted(step.stage)"
              [class.text-gray-400]="!isCurrentStage(step.stage) && !isCompleted(step.stage)"
            >
              {{ step.label }}
            </span>
            
            <!-- Step status -->
            <span 
              class="text-xs mt-1"
              [class.text-green-600]="isCompleted(step.stage)"
              [class.text-blue-600]="isCurrentStage(step.stage)"
              [class.text-gray-400]="!isCurrentStage(step.stage) && !isCompleted(step.stage)"
            >
              <span *ngIf="isCompleted(step.stage)">✓ Complete</span>
              <span *ngIf="isCurrentStage(step.stage) && !isCompleted(step.stage)">In Progress</span>
              <span *ngIf="!isCurrentStage(step.stage) && !isCompleted(step.stage)">Pending</span>
            </span>
            
            <!-- Step metrics -->
            <div 
              *ngIf="getStepMetrics(step.stage)"
              class="mt-1 text-xs text-gray-500"
            >
              {{ getStepMetrics(step.stage) }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Enhanced Current Stage Info -->
      <div class="mt-6" *ngIf="getCurrentStep()">
        <div 
          class="p-4 rounded-lg border-2 transition-all duration-300"
          [ngClass]="getCurrentStageClass()"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start">
              <div 
                class="w-12 h-12 rounded-lg flex items-center justify-center mr-3"
                [ngClass]="getCurrentStageIconClass()"
              >
                <i [class]="'pi ' + getCurrentStep()!.icon + ' text-xl'"></i>
              </div>
              <div class="flex-1">
                <p class="text-sm font-semibold text-gray-800">Current Stage</p>
                <p class="text-lg font-medium text-gray-900 mt-1">{{ getCurrentStep()!.label }}</p>
                <p class="text-sm text-gray-600 mt-2">{{ getStageDescription() }}</p>
                
                <!-- Stage actions -->
                <div class="flex items-center mt-3 space-x-3" *ngIf="showActions">
                  <button 
                    *ngIf="canProceed()"
                    (click)="onProceed.emit()"
                    class="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Proceed to Next Stage
                  </button>
                  <button 
                    *ngIf="projectId"
                    [routerLink]="['/projects', projectId]"
                    class="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    View Project Details
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Stage timer -->
            <div 
              *ngIf="stageStartTime"
              class="text-right"
            >
              <p class="text-xs text-gray-500">Time in stage</p>
              <p class="text-sm font-medium text-gray-700">{{ getTimeInStage() }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Compact mode -->
      <div 
        *ngIf="compact"
        class="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg"
      >
        <div class="flex items-center space-x-2">
          <div 
            *ngFor="let step of steps"
            class="w-2 h-2 rounded-full transition-all duration-300"
            [class.bg-green-500]="isCompleted(step.stage)"
            [class.bg-blue-500]="isCurrentStage(step.stage)"
            [class.bg-gray-300]="!isCurrentStage(step.stage) && !isCompleted(step.stage)"
            [class.w-3]="isCurrentStage(step.stage)"
            [class.h-3]="isCurrentStage(step.stage)"
          ></div>
        </div>
        <span class="text-xs text-gray-600">{{ formatStage(currentStage) }}</span>
      </div>
    </div>
  `,
  styles: []
})
export class PipelineVisualizationComponent implements OnChanges {
  @Input() currentStage!: string;
  @Input() progress: number = 0;
  @Input() projectId?: string;
  @Input() compact: boolean = false;
  @Input() showActions: boolean = true;
  @Input() estimatedCompletion?: string;
  @Input() stageStartTime?: Date;
  @Input() isProcessing: boolean = false;
  @Input() metrics?: Record<string, any>;
  
  @Output() onStageClick = new EventEmitter<string>();
  @Output() onProceed = new EventEmitter<void>();
  @Output() onRefresh = new EventEmitter<void>();
  
  steps: PipelineStep[] = [
    {
      stage: ProjectStage.RAW_CONTENT,
      label: 'Raw Content',
      icon: 'pi-file',
      color: 'gray'
    },
    {
      stage: ProjectStage.PROCESSING_CONTENT,
      label: 'Processing',
      icon: 'pi-cog',
      color: 'yellow'
    },
    {
      stage: ProjectStage.INSIGHTS_READY,
      label: 'Insights Ready',
      icon: 'pi-lightbulb',
      color: 'purple'
    },
    {
      stage: ProjectStage.INSIGHTS_APPROVED,
      label: 'Insights Approved',
      icon: 'pi-check',
      color: 'indigo'
    },
    {
      stage: ProjectStage.POSTS_GENERATED,
      label: 'Posts Generated',
      icon: 'pi-file-edit',
      color: 'blue'
    },
    {
      stage: ProjectStage.POSTS_APPROVED,
      label: 'Posts Approved',
      icon: 'pi-check-circle',
      color: 'teal'
    },
    {
      stage: ProjectStage.SCHEDULED,
      label: 'Scheduled',
      icon: 'pi-calendar',
      color: 'orange'
    },
    {
      stage: ProjectStage.PUBLISHING,
      label: 'Publishing',
      icon: 'pi-send',
      color: 'pink'
    },
    {
      stage: ProjectStage.PUBLISHED,
      label: 'Published',
      icon: 'pi-check-circle',
      color: 'green'
    }
  ];
  
  displaySteps: PipelineStep[] = [];
  
  ngOnInit(): void {
    this.updateDisplaySteps();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['compact']) {
      this.updateDisplaySteps();
    }
  }
  
  updateDisplaySteps(): void {
    if (this.compact) {
      // Show only key stages in compact mode
      this.displaySteps = this.steps.filter(s => 
        [ProjectStage.RAW_CONTENT, ProjectStage.INSIGHTS_READY, 
         ProjectStage.POSTS_GENERATED, ProjectStage.SCHEDULED, 
         ProjectStage.PUBLISHED].includes(s.stage)
      );
    } else {
      this.displaySteps = this.steps;
    }
  }
  
  getStepClass(stage: ProjectStage): string {
    const currentIndex = this.steps.findIndex(s => s.stage === this.currentStage);
    const stepIndex = this.steps.findIndex(s => s.stage === stage);
    
    if (stepIndex < currentIndex) {
      return 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg';
    } else if (stepIndex === currentIndex) {
      if (this.isProcessing) {
        return 'bg-gradient-to-br from-blue-400 to-blue-600 text-white ring-4 ring-blue-300 shadow-xl';
      }
      return 'bg-gradient-to-br from-blue-500 to-blue-700 text-white ring-4 ring-blue-200 shadow-lg';
    } else {
      return 'bg-gray-200 text-gray-400 border-2 border-gray-300';
    }
  }
  
  getProgressBarClass(): string {
    if (this.progress >= 80) {
      return 'bg-gradient-to-r from-green-400 to-green-600';
    } else if (this.progress >= 50) {
      return 'bg-gradient-to-r from-blue-400 to-blue-600';
    } else if (this.progress >= 20) {
      return 'bg-gradient-to-r from-yellow-400 to-orange-500';
    }
    return 'bg-gradient-to-r from-gray-400 to-gray-600';
  }
  
  getConnectionProgress(): number {
    const currentIndex = this.steps.findIndex(s => s.stage === this.currentStage);
    if (currentIndex === -1) return 0;
    return (currentIndex / (this.steps.length - 1)) * 100;
  }
  
  getCurrentStageClass(): string {
    const step = this.getCurrentStep();
    if (!step) return 'border-gray-300 bg-gray-50';
    
    const colorClasses: Record<string, string> = {
      'gray': 'border-gray-400 bg-gray-50',
      'yellow': 'border-yellow-400 bg-yellow-50',
      'purple': 'border-purple-400 bg-purple-50',
      'indigo': 'border-indigo-400 bg-indigo-50',
      'blue': 'border-blue-400 bg-blue-50',
      'teal': 'border-teal-400 bg-teal-50',
      'orange': 'border-orange-400 bg-orange-50',
      'pink': 'border-pink-400 bg-pink-50',
      'green': 'border-green-400 bg-green-50'
    };
    
    return colorClasses[step.color] || 'border-gray-300 bg-gray-50';
  }
  
  getCurrentStageIconClass(): string {
    const step = this.getCurrentStep();
    if (!step) return 'bg-gray-200 text-gray-600';
    
    const colorClasses: Record<string, string> = {
      'gray': 'bg-gray-200 text-gray-600',
      'yellow': 'bg-yellow-200 text-yellow-700',
      'purple': 'bg-purple-200 text-purple-700',
      'indigo': 'bg-indigo-200 text-indigo-700',
      'blue': 'bg-blue-200 text-blue-700',
      'teal': 'bg-teal-200 text-teal-700',
      'orange': 'bg-orange-200 text-orange-700',
      'pink': 'bg-pink-200 text-pink-700',
      'green': 'bg-green-200 text-green-700'
    };
    
    return colorClasses[step.color] || 'bg-gray-200 text-gray-600';
  }
  
  isCurrentStage(stage: ProjectStage): boolean {
    return this.currentStage === stage;
  }
  
  isCompleted(stage: ProjectStage): boolean {
    const currentIndex = this.steps.findIndex(s => s.stage === this.currentStage);
    const stepIndex = this.steps.findIndex(s => s.stage === stage);
    return stepIndex < currentIndex;
  }
  
  getCurrentStep(): PipelineStep | undefined {
    return this.steps.find(s => s.stage === this.currentStage);
  }
  
  getStageDescription(): string {
    const descriptions: Record<string, string> = {
      [ProjectStage.RAW_CONTENT]: 'Content has been uploaded and is ready for processing',
      [ProjectStage.PROCESSING_CONTENT]: 'AI is analyzing and cleaning your content',
      [ProjectStage.INSIGHTS_READY]: 'Insights have been extracted and are ready for review',
      [ProjectStage.INSIGHTS_APPROVED]: 'Insights approved, ready to generate posts',
      [ProjectStage.POSTS_GENERATED]: 'Posts have been created and need your review',
      [ProjectStage.POSTS_APPROVED]: 'Posts approved and ready to be scheduled',
      [ProjectStage.SCHEDULED]: 'Posts are scheduled for publishing',
      [ProjectStage.PUBLISHING]: 'Posts are being published to social platforms',
      [ProjectStage.PUBLISHED]: 'All posts have been successfully published'
    };
    return descriptions[this.currentStage] || '';
  }
  
  getStepMetrics(stage: ProjectStage): string {
    if (!this.metrics) return '';
    
    const stageMetrics = this.metrics[stage];
    if (!stageMetrics) return '';
    
    if (stage === ProjectStage.INSIGHTS_READY || stage === ProjectStage.INSIGHTS_APPROVED) {
      return stageMetrics.count ? `${stageMetrics.count} insights` : '';
    }
    if (stage === ProjectStage.POSTS_GENERATED || stage === ProjectStage.POSTS_APPROVED) {
      return stageMetrics.count ? `${stageMetrics.count} posts` : '';
    }
    if (stage === ProjectStage.SCHEDULED) {
      return stageMetrics.next ? `Next: ${stageMetrics.next}` : '';
    }
    if (stage === ProjectStage.PUBLISHED) {
      return stageMetrics.total ? `${stageMetrics.total} published` : '';
    }
    
    return '';
  }
  
  getTimeInStage(): string {
    if (!this.stageStartTime) return '';
    
    const now = new Date();
    const start = new Date(this.stageStartTime);
    const diff = now.getTime() - start.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
  
  canProceed(): boolean {
    // Define which stages can proceed automatically
    const proceedableStages = [
      ProjectStage.INSIGHTS_APPROVED,
      ProjectStage.POSTS_APPROVED
    ];
    return proceedableStages.includes(this.currentStage as ProjectStage);
  }
  
  formatStage(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  
  onStageClick(stage: string): void {
    if (this.showActions) {
      this.onStageClick.emit(stage);
    }
  }
}