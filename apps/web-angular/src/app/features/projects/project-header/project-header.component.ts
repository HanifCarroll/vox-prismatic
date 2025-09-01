import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

import { ContentProject, ProjectStage, SourceType } from '../../../core/models/project.model';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-project-header',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TagModule,
    ProgressBarModule,
    ChipModule,
    TooltipModule,
    MenuModule,
    RelativeTimePipe
  ],
  templateUrl: './project-header.component.html',
  styleUrl: './project-header.component.css'
})
export class ProjectHeaderComponent {
  @Input() project!: ContentProject;
  @Output() edit = new EventEmitter<void>();
  @Output() archive = new EventEmitter<void>();
  @Output() duplicate = new EventEmitter<void>();
  @Output() export = new EventEmitter<void>();

  menuItems: MenuItem[] = [
    {
      label: 'Edit Project',
      icon: 'pi pi-pencil',
      command: () => this.edit.emit()
    },
    {
      label: 'Duplicate Project',
      icon: 'pi pi-copy',
      command: () => this.duplicate.emit()
    },
    {
      separator: true
    },
    {
      label: 'Export Data',
      icon: 'pi pi-download',
      command: () => this.export.emit()
    },
    {
      separator: true
    },
    {
      label: 'Archive Project',
      icon: 'pi pi-box',
      command: () => this.archive.emit(),
      styleClass: 'text-orange-600'
    }
  ];

  getStageColor(stage: ProjectStage): string {
    const colors: Record<ProjectStage, string> = {
      [ProjectStage.RAW_CONTENT]: 'secondary',
      [ProjectStage.PROCESSING_CONTENT]: 'warning',
      [ProjectStage.INSIGHTS_READY]: 'info',
      [ProjectStage.INSIGHTS_APPROVED]: 'info',
      [ProjectStage.POSTS_GENERATED]: 'warning',
      [ProjectStage.POSTS_APPROVED]: 'success',
      [ProjectStage.SCHEDULED]: 'warning',
      [ProjectStage.PUBLISHING]: 'warning',
      [ProjectStage.PUBLISHED]: 'success',
      [ProjectStage.ARCHIVED]: 'secondary'
    };
    return colors[stage] || 'secondary';
  }

  getSourceIcon(type: SourceType): string {
    const icons: Record<SourceType, string> = {
      [SourceType.AUDIO]: 'pi pi-volume-up',
      [SourceType.VIDEO]: 'pi pi-video',
      [SourceType.TEXT]: 'pi pi-file-edit',
      [SourceType.URL]: 'pi pi-link'
    };
    return icons[type] || 'pi pi-file';
  }

  getProgressSeverity(progress: number): string {
    if (progress >= 100) return 'success';
    if (progress >= 75) return 'info';
    if (progress >= 50) return 'warning';
    return 'secondary';
  }

  formatStage(stage: ProjectStage): string {
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  formatSourceType(type: SourceType): string {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }
}