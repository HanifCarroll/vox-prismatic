import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold mb-4">Pipeline Progress</h2>
      
      <!-- Progress Bar -->
      <div class="mb-6">
        <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Overall Progress</span>
          <span class="font-semibold">{{ progress }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3">
          <div 
            class="h-3 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-400 to-blue-600"
            [style.width.%]="progress"
          ></div>
        </div>
      </div>
      
      <!-- Pipeline Steps -->
      <div class="relative">
        <div class="absolute top-5 left-0 right-0 h-0.5 bg-gray-200"></div>
        <div class="flex justify-between relative">
          <div 
            *ngFor="let step of steps; let i = index"
            class="flex flex-col items-center"
            [class.flex-1]="i < steps.length - 1"
          >
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative z-10"
              [ngClass]="getStepClass(step.stage)"
            >
              <i [class]="'pi ' + step.icon + ' text-sm'"></i>
            </div>
            <span 
              class="text-xs mt-2 text-center max-w-[80px]"
              [class.font-semibold]="isCurrentStage(step.stage)"
              [class.text-gray-800]="isCurrentStage(step.stage)"
              [class.text-gray-500]="!isCurrentStage(step.stage)"
            >
              {{ step.label }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Current Stage Info -->
      <div class="mt-6 p-4 bg-blue-50 rounded-lg" *ngIf="getCurrentStep()">
        <div class="flex items-center">
          <i [class]="'pi ' + getCurrentStep()!.icon + ' text-2xl text-blue-600 mr-3'"></i>
          <div>
            <p class="text-sm font-semibold text-blue-800">Current Stage</p>
            <p class="text-xs text-blue-600">{{ getCurrentStep()!.label }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class PipelineVisualizationComponent {
  @Input() currentStage!: string;
  @Input() progress: number = 0;
  
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
      label: 'Insights',
      icon: 'pi-lightbulb',
      color: 'purple'
    },
    {
      stage: ProjectStage.POSTS_GENERATED,
      label: 'Posts',
      icon: 'pi-file-edit',
      color: 'blue'
    },
    {
      stage: ProjectStage.SCHEDULED,
      label: 'Scheduled',
      icon: 'pi-calendar',
      color: 'orange'
    },
    {
      stage: ProjectStage.PUBLISHED,
      label: 'Published',
      icon: 'pi-check-circle',
      color: 'green'
    }
  ];
  
  getStepClass(stage: ProjectStage): string {
    const currentIndex = this.steps.findIndex(s => s.stage === this.currentStage);
    const stepIndex = this.steps.findIndex(s => s.stage === stage);
    
    if (stepIndex < currentIndex) {
      return 'bg-green-500 text-white';
    } else if (stepIndex === currentIndex) {
      return 'bg-blue-500 text-white ring-4 ring-blue-200';
    } else {
      return 'bg-gray-300 text-gray-500';
    }
  }
  
  isCurrentStage(stage: ProjectStage): boolean {
    return this.currentStage === stage;
  }
  
  getCurrentStep(): PipelineStep | undefined {
    return this.steps.find(s => s.stage === this.currentStage);
  }
}