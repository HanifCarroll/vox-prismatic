import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ViewModeService, ViewMode } from '../../services/view-mode.service';
import { ContentProject, ProjectStage } from '../../../core/models/project.model';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';

@Component({
  selector: 'app-content-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RelativeTimePipe
  ],
  templateUrl: './content-view.component.html',
  styleUrl: './content-view.component.css'
})
export class ContentViewComponent {
  @Input() projects: ContentProject[] = [];
  @Input() loading = false;
  @Input() selectedProjects = new Set<string>();
  @Output() projectClick = new EventEmitter<ContentProject>();
  @Output() projectSelect = new EventEmitter<{ project: ContentProject; selected: boolean }>();
  @Output() projectsReorder = new EventEmitter<ContentProject[]>();
  @Output() stageChange = new EventEmitter<{ project: ContentProject; newStage: ProjectStage }>();

  searchQuery = signal('');
  viewMode = computed(() => this.viewModeService.viewSettings().mode);
  compactMode = computed(() => this.viewModeService.viewSettings().compactMode);
  
  kanbanColumns = signal<{ stage: ProjectStage; projects: ContentProject[] }[]>([]);

  viewModes: { label: string; value: ViewMode; icon: string }[] = [
    { label: 'Cards', value: 'card', icon: 'pi pi-th-large' },
    { label: 'List', value: 'list', icon: 'pi pi-list' },
    { label: 'Kanban', value: 'kanban', icon: 'pi pi-table' },
    { label: 'Table', value: 'table', icon: 'pi pi-table' }
  ];

  stageColors: Record<ProjectStage, string> = {
    [ProjectStage.RAW_CONTENT]: 'gray',
    [ProjectStage.PROCESSING_CONTENT]: 'blue',
    [ProjectStage.INSIGHTS_READY]: 'cyan',
    [ProjectStage.INSIGHTS_APPROVED]: 'green',
    [ProjectStage.POSTS_GENERATED]: 'purple',
    [ProjectStage.POSTS_APPROVED]: 'indigo',
    [ProjectStage.SCHEDULED]: 'orange',
    [ProjectStage.PUBLISHING]: 'yellow',
    [ProjectStage.PUBLISHED]: 'success',
    [ProjectStage.ARCHIVED]: 'secondary'
  };

  constructor(public viewModeService: ViewModeService) {}

  ngOnChanges() {
    if (this.viewMode() === 'kanban') {
      this.updateKanbanColumns();
    }
  }

  setViewMode(mode: ViewMode) {
    this.viewModeService.setViewMode(mode);
    if (mode === 'kanban') {
      this.updateKanbanColumns();
    }
  }

  toggleCompactMode() {
    this.viewModeService.toggleCompactMode();
  }

  filteredProjects = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.projects;
    
    return this.projects.filter(project => 
      project.title.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query) ||
      project.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  private updateKanbanColumns() {
    const stages = Object.values(ProjectStage).filter(s => s !== ProjectStage.ARCHIVED);
    const columns = stages.map(stage => ({
      stage,
      projects: this.projects.filter(p => p.currentStage === stage)
    }));
    this.kanbanColumns.set(columns);
  }

  onDragStart(event: DragEvent, project: ContentProject) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('projectId', project.id);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, stage: ProjectStage) {
    event.preventDefault();
    const projectId = event.dataTransfer?.getData('projectId');
    if (projectId) {
      const project = this.projects.find(p => p.id === projectId);
      if (project && project.currentStage !== stage) {
        this.stageChange.emit({ project, newStage: stage });
      }
    }
  }

  getStageIcon(stage: ProjectStage): string {
    const icons: Record<ProjectStage, string> = {
      [ProjectStage.RAW_CONTENT]: 'pi pi-file',
      [ProjectStage.PROCESSING_CONTENT]: 'pi pi-cog',
      [ProjectStage.INSIGHTS_READY]: 'pi pi-lightbulb',
      [ProjectStage.INSIGHTS_APPROVED]: 'pi pi-check-circle',
      [ProjectStage.POSTS_GENERATED]: 'pi pi-pencil',
      [ProjectStage.POSTS_APPROVED]: 'pi pi-verified',
      [ProjectStage.SCHEDULED]: 'pi pi-calendar',
      [ProjectStage.PUBLISHING]: 'pi pi-send',
      [ProjectStage.PUBLISHED]: 'pi pi-globe',
      [ProjectStage.ARCHIVED]: 'pi pi-box'
    };
    return icons[stage] || 'pi pi-circle';
  }

  getStageSeverity(stage: ProjectStage): string {
    const severities: Record<ProjectStage, string> = {
      [ProjectStage.RAW_CONTENT]: 'secondary',
      [ProjectStage.PROCESSING_CONTENT]: 'info',
      [ProjectStage.INSIGHTS_READY]: 'info',
      [ProjectStage.INSIGHTS_APPROVED]: 'success',
      [ProjectStage.POSTS_GENERATED]: 'warning',
      [ProjectStage.POSTS_APPROVED]: 'success',
      [ProjectStage.SCHEDULED]: 'warning',
      [ProjectStage.PUBLISHING]: 'warning',
      [ProjectStage.PUBLISHED]: 'success',
      [ProjectStage.ARCHIVED]: 'secondary'
    };
    return severities[stage] || 'info';
  }

  getProgressColor(progress: number): string {
    if (progress >= 100) return 'success';
    if (progress >= 75) return 'info';
    if (progress >= 50) return 'warning';
    return 'secondary';
  }

  selectProject(project: ContentProject, event: Event) {
    event.stopPropagation();
    const selected = !this.selectedProjects.has(project.id);
    this.projectSelect.emit({ project, selected });
  }

  isSelected(project: ContentProject): boolean {
    return this.selectedProjects.has(project.id);
  }

  formatStageLabel(stage: ProjectStage): string {
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
}