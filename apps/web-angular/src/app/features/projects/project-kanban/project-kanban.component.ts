import { Component, Input, Output, EventEmitter, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, CdkDropList, CdkDrag, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ContentProject, ProjectStage } from '../../../core/models/project.model';
import { ProjectCardComponent } from '../project-card/project-card.component';

interface KanbanColumn {
  stage: ProjectStage;
  title: string;
  projects: ContentProject[];
  color: string;
  icon: string;
}

@Component({
  selector: 'app-project-kanban',
  standalone: true,
  imports: [CommonModule, DragDropModule, ProjectCardComponent],
  template: `
    <div class="kanban-board">
      <!-- Kanban Header with Stage Summary -->
      <div class="kanban-header mb-6 bg-white rounded-lg shadow-sm p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h3 class="text-lg font-semibold text-gray-900">Pipeline Overview</h3>
            <span class="text-sm text-gray-500">
              {{ totalProjects() }} total projects
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              (click)="toggleCompactView()"
              class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              [title]="compactView() ? 'Expand cards' : 'Compact cards'"
            >
              <i [class]="compactView() ? 'pi pi-expand' : 'pi pi-compress'"></i>
            </button>
          </div>
        </div>
        
        <!-- Stage Progress Bar -->
        <div class="mt-4 flex items-center gap-1">
          @for (column of columns(); track column.stage) {
            <div 
              class="flex-1 group relative"
              [title]="column.title + ': ' + column.projects.length + ' projects'"
            >
              <div 
                class="h-2 rounded-full transition-all"
                [style.background-color]="column.projects.length > 0 ? column.color : '#e5e7eb'"
              ></div>
              <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="text-xs font-medium whitespace-nowrap bg-gray-800 text-white px-2 py-1 rounded">
                  {{ column.projects.length }}
                </span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Kanban Columns -->
      <div class="kanban-columns flex gap-4 overflow-x-auto pb-4">
        @for (column of columns(); track column.stage) {
          <div 
            class="kanban-column flex-shrink-0"
            [style.min-width.px]="columnWidth()"
          >
            <!-- Column Header -->
            <div 
              class="column-header rounded-t-lg p-3"
              [style.background-color]="column.color + '20'"
              [style.border-color]="column.color"
              style="border-width: 2px; border-style: solid; border-bottom: none;"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <i [class]="column.icon" [style.color]="column.color"></i>
                  <h4 class="font-semibold text-gray-900">{{ column.title }}</h4>
                  <span 
                    class="px-2 py-0.5 text-xs font-medium rounded-full"
                    [style.background-color]="column.color"
                    style="color: white;"
                  >
                    {{ column.projects.length }}
                  </span>
                </div>
                <button
                  *ngIf="column.projects.length > 0"
                  (click)="selectAllInColumn(column)"
                  class="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  title="Select all in this stage"
                >
                  <i class="pi pi-check-square"></i>
                </button>
              </div>
              
              <!-- Stage Actions -->
              @if (canAdvanceStage(column.stage)) {
                <button
                  (click)="advanceAllInStage(column)"
                  class="mt-2 w-full text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 transition-colors"
                  [disabled]="column.projects.length === 0"
                >
                  <i class="pi pi-arrow-right mr-1"></i>
                  Advance All to {{ getNextStageTitle(column.stage) }}
                </button>
              }
            </div>

            <!-- Drop List -->
            <div
              cdkDropList
              [id]="column.stage"
              [cdkDropListData]="column.projects"
              [cdkDropListConnectedTo]="connectedDropLists()"
              (cdkDropListDropped)="drop($event, column)"
              class="drop-list bg-gray-50 border-2 border-t-0 rounded-b-lg p-3 min-h-[400px]"
              [style.border-color]="column.color + '40'"
            >
              <!-- Empty State -->
              @if (column.projects.length === 0) {
                <div class="empty-column flex flex-col items-center justify-center py-12 text-gray-400">
                  <i [class]="column.icon + ' text-3xl mb-2'"></i>
                  <p class="text-sm">No projects in {{ column.title.toLowerCase() }}</p>
                  <p class="text-xs mt-1">Drag projects here to update their stage</p>
                </div>
              }

              <!-- Project Cards -->
              @for (project of column.projects; track project.id) {
                <div
                  cdkDrag
                  [cdkDragData]="project"
                  class="kanban-card mb-3"
                  [class.compact]="compactView()"
                >
                  <!-- Drag Preview -->
                  <div *cdkDragPreview class="drag-preview bg-white rounded-lg shadow-xl p-4 opacity-90">
                    <div class="flex items-center gap-2 mb-2">
                      <i [class]="column.icon" [style.color]="column.color"></i>
                      <span class="font-medium">{{ project.title }}</span>
                    </div>
                    <p class="text-sm text-gray-600">Moving to a new stage...</p>
                  </div>

                  <!-- Card Content -->
                  <div 
                    class="project-card bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-move border-2 border-transparent hover:border-blue-300"
                    [class.selected]="isSelected(project)"
                    [class.border-blue-500]="isSelected(project)"
                    (click)="onProjectClick(project, $event)"
                  >
                    <!-- Selection Checkbox -->
                    <div class="p-3">
                      <div class="flex items-start justify-between mb-2">
                        <div class="flex-1">
                          <h5 class="font-medium text-gray-900 mb-1">{{ project.title }}</h5>
                          @if (!compactView() && project.description) {
                            <p class="text-xs text-gray-600 line-clamp-2">{{ project.description }}</p>
                          }
                        </div>
                        <input
                          type="checkbox"
                          [checked]="isSelected(project)"
                          (change)="toggleSelection(project)"
                          (click)="$event.stopPropagation()"
                          class="ml-2 mt-1"
                        />
                      </div>

                      <!-- Tags -->
                      @if (!compactView() && project.tags?.length) {
                        <div class="flex flex-wrap gap-1 mb-2">
                          @for (tag of project.tags.slice(0, 2); track tag) {
                            <span class="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              {{ tag }}
                            </span>
                          }
                          @if (project.tags.length > 2) {
                            <span class="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              +{{ project.tags.length - 2 }}
                            </span>
                          }
                        </div>
                      }

                      <!-- Metrics -->
                      <div class="flex items-center justify-between text-xs text-gray-500">
                        <div class="flex items-center gap-3">
                          @if (project.summary?.insightsTotal) {
                            <span title="Insights">
                              <i class="pi pi-lightbulb mr-1"></i>
                              {{ project.summary.insightsTotal }}
                            </span>
                          }
                          @if (project.summary?.postsTotal) {
                            <span title="Posts">
                              <i class="pi pi-file-edit mr-1"></i>
                              {{ project.summary.postsTotal }}
                            </span>
                          }
                        </div>
                        <span class="text-xs">{{ project.overallProgress }}%</span>
                      </div>

                      <!-- Progress Bar -->
                      <div class="mt-2 w-full bg-gray-200 rounded-full h-1">
                        <div 
                          class="h-1 rounded-full transition-all"
                          [style.width.%]="project.overallProgress"
                          [style.background-color]="column.color"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .kanban-board {
      @apply w-full;
    }

    .kanban-columns {
      margin-left: -1rem;
      margin-right: -1rem;
      padding-left: 1rem;
      padding-right: 1rem;
    }

    .kanban-column {
      @apply transition-all;
    }

    .drop-list {
      transition: background-color 0.2s;
    }

    .drop-list.cdk-drop-list-dragging {
      @apply bg-blue-50;
    }

    .kanban-card {
      @apply transition-transform;
    }

    .kanban-card.cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .kanban-card.cdk-drag-placeholder {
      @apply opacity-30;
    }

    .project-card.selected {
      @apply ring-2 ring-blue-500;
    }

    .drag-preview {
      max-width: 300px;
    }

    .kanban-card.compact .project-card {
      padding: 0.5rem;
    }

    .kanban-card.compact h5 {
      @apply text-sm;
    }
  `]
})
export class ProjectKanbanComponent {
  @Input() projects: ContentProject[] = [];
  @Input() selectedProjects: Set<string> = new Set();
  @Output() projectClick = new EventEmitter<ContentProject>();
  @Output() projectSelect = new EventEmitter<{ project: ContentProject; selected: boolean }>();
  @Output() stageChange = new EventEmitter<{ projects: ContentProject[]; newStage: ProjectStage }>();
  @Output() bulkStageAdvance = new EventEmitter<{ projects: ContentProject[]; fromStage: ProjectStage; toStage: ProjectStage }>();

  compactView = signal(false);
  columnWidth = computed(() => this.compactView() ? 280 : 320);

  private stageOrder: ProjectStage[] = [
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

  private stageConfigs: Record<ProjectStage, { title: string; color: string; icon: string }> = {
    [ProjectStage.RAW_CONTENT]: { title: 'Raw Content', color: '#6b7280', icon: 'pi pi-file' },
    [ProjectStage.PROCESSING_CONTENT]: { title: 'Processing', color: '#3b82f6', icon: 'pi pi-cog' },
    [ProjectStage.INSIGHTS_READY]: { title: 'Insights Ready', color: '#8b5cf6', icon: 'pi pi-lightbulb' },
    [ProjectStage.INSIGHTS_APPROVED]: { title: 'Insights Approved', color: '#10b981', icon: 'pi pi-check-circle' },
    [ProjectStage.POSTS_GENERATED]: { title: 'Posts Generated', color: '#6366f1', icon: 'pi pi-file-edit' },
    [ProjectStage.POSTS_APPROVED]: { title: 'Posts Approved', color: '#14b8a6', icon: 'pi pi-verified' },
    [ProjectStage.SCHEDULED]: { title: 'Scheduled', color: '#f59e0b', icon: 'pi pi-calendar' },
    [ProjectStage.PUBLISHING]: { title: 'Publishing', color: '#ef4444', icon: 'pi pi-send' },
    [ProjectStage.PUBLISHED]: { title: 'Published', color: '#22c55e', icon: 'pi pi-globe' }
  };

  columns = computed<KanbanColumn[]>(() => {
    return this.stageOrder
      .filter(stage => stage !== ProjectStage.ARCHIVED)
      .map(stage => ({
        stage,
        ...this.stageConfigs[stage],
        projects: this.projects.filter(p => p.currentStage === stage)
      }));
  });

  totalProjects = computed(() => this.projects.length);

  connectedDropLists = computed(() => 
    this.columns().map(col => col.stage)
  );

  toggleCompactView() {
    this.compactView.update(v => !v);
  }

  isSelected(project: ContentProject): boolean {
    return this.selectedProjects.has(project.id);
  }

  toggleSelection(project: ContentProject) {
    this.projectSelect.emit({ 
      project, 
      selected: !this.isSelected(project) 
    });
  }

  onProjectClick(project: ContentProject, event: Event) {
    if ((event.target as HTMLElement).tagName !== 'INPUT') {
      this.projectClick.emit(project);
    }
  }

  selectAllInColumn(column: KanbanColumn) {
    column.projects.forEach(project => {
      if (!this.isSelected(project)) {
        this.projectSelect.emit({ project, selected: true });
      }
    });
  }

  canAdvanceStage(stage: ProjectStage): boolean {
    const index = this.stageOrder.indexOf(stage);
    return index >= 0 && index < this.stageOrder.length - 1;
  }

  getNextStageTitle(stage: ProjectStage): string {
    const index = this.stageOrder.indexOf(stage);
    if (index >= 0 && index < this.stageOrder.length - 1) {
      const nextStage = this.stageOrder[index + 1];
      return this.stageConfigs[nextStage].title;
    }
    return '';
  }

  advanceAllInStage(column: KanbanColumn) {
    if (column.projects.length === 0) return;
    
    const index = this.stageOrder.indexOf(column.stage);
    if (index >= 0 && index < this.stageOrder.length - 1) {
      const nextStage = this.stageOrder[index + 1];
      this.bulkStageAdvance.emit({
        projects: column.projects,
        fromStage: column.stage,
        toStage: nextStage
      });
    }
  }

  drop(event: CdkDropListDropped<ContentProject[]>, targetColumn: KanbanColumn) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      const project = event.previousContainer.data[event.previousIndex];
      
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      this.stageChange.emit({
        projects: [project],
        newStage: targetColumn.stage
      });
    }
  }
}