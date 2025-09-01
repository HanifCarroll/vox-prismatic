import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';

import { ProjectStage } from '../../../core/models/project.model';

interface PipelineStage {
  stage: ProjectStage;
  label: string;
  icon: string;
  description: string;
  status: 'completed' | 'active' | 'upcoming';
  progress?: number;
}

@Component({
  selector: 'app-project-pipeline',
  standalone: true,
  imports: [
    CommonModule,
    TooltipModule,
    ProgressBarModule
  ],
  templateUrl: './project-pipeline.component.html',
  styleUrl: './project-pipeline.component.css'
})
export class ProjectPipelineComponent {
  @Input() currentStage!: ProjectStage;
  @Input() progress: number = 0;
  @Output() stageClick = new EventEmitter<ProjectStage>();

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
  }

  ngOnChanges() {
    this.updateStageStatuses();
  }

  private updateStageStatuses() {
    const currentIndex = this.getStageIndex(this.currentStage);
    
    this.pipelineStages.forEach((stage, index) => {
      if (index < currentIndex) {
        stage.status = 'completed';
        stage.progress = 100;
      } else if (index === currentIndex) {
        stage.status = 'active';
        stage.progress = this.progress;
      } else {
        stage.status = 'upcoming';
        stage.progress = 0;
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
    return `${baseClass} ${statusClass}`;
  }

  getConnectorClass(index: number): string {
    const stage = this.pipelineStages[index];
    if (stage.status === 'completed') {
      return 'connector connector--completed';
    } else if (stage.status === 'active' && stage.progress && stage.progress > 50) {
      return 'connector connector--active';
    }
    return 'connector';
  }

  onStageClick(stage: ProjectStage) {
    this.stageClick.emit(stage);
  }

  isClickable(stage: PipelineStage): boolean {
    return stage.status === 'completed' || stage.status === 'active';
  }
}