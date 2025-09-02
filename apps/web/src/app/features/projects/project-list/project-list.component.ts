import { Component, OnInit, inject, signal, computed, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService, ProjectFilter } from '../../../core/services/project.service';
import { ContentProject, ProjectStage, Platform } from '../../../core/models/project.model';
import { ProjectCardComponent } from '../project-card/project-card.component';
import { CreateProjectModalComponent } from '../create-project-modal/create-project-modal.component';
import { ProjectFiltersComponent, ProjectFilterConfig } from '../project-filters/project-filters.component';
import { ProjectKanbanComponent } from '../project-kanban/project-kanban.component';
import { BulkStageDialogComponent } from '../bulk-stage-dialog/bulk-stage-dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { UrlStateService } from '../../../core/services/url-state.service';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    ProjectCardComponent, 
    CreateProjectModalComponent, 
    ProjectFiltersComponent,
    ProjectKanbanComponent,
    BulkStageDialogComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="flex gap-6">
      <!-- Sidebar Filters -->
      <div class="w-64 flex-shrink-0" *ngIf="showFilters()">
        <app-project-filters
          (filterChanged)="onFilterChanged($event)"
          #filterComponent
        />
      </div>
      
      <!-- Main Content -->
      <div class="flex-1 space-y-6">
        <!-- Header -->
        <div class="flex justify-between items-center">
          <h1 class="text-3xl font-bold text-gray-900">Projects</h1>
          <div class="flex items-center gap-3">
            <button 
              (click)="showFilters.set(!showFilters())"
              class="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              [title]="showFilters() ? 'Hide Filters' : 'Show Filters'"
            >
              <i class="pi pi-filter"></i>
            </button>
            <button 
              (click)="showCreateModal.set(true)"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <i class="pi pi-plus mr-2"></i>
              New Project
            </button>
          </div>
        </div>
        
        <!-- Bulk Actions Bar -->
        <div *ngIf="selectedProjects().length > 0" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <span class="text-blue-900 font-medium">
                {{ selectedProjects().length }} project{{ selectedProjects().length > 1 ? 's' : '' }} selected
              </span>
              <button
                (click)="selectAll()"
                class="text-blue-600 hover:text-blue-800 text-sm"
              >
                Select all {{ filteredProjects().length }}
              </button>
              <button
                (click)="clearSelection()"
                class="text-gray-600 hover:text-gray-800 text-sm"
              >
                Clear selection
              </button>
            </div>
            <div class="flex items-center gap-2">
              <button
                (click)="bulkChangeStage()"
                class="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                <i class="pi pi-sync mr-1"></i>
                Change Stage
              </button>
              <button
                (click)="bulkArchive()"
                class="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                <i class="pi pi-inbox mr-1"></i>
                Archive
              </button>
              <button
                (click)="bulkDelete()"
                class="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                <i class="pi pi-trash mr-1"></i>
                Delete
              </button>
            </div>
          </div>
        </div>
        
        <!-- View Controls -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <span class="text-sm text-gray-600">
                {{ filteredProjects().length }} project{{ filteredProjects().length !== 1 ? 's' : '' }}
                {{ activeFilterConfig() ? ' (filtered)' : '' }}
              </span>
            </div>
            <div class="flex items-center space-x-2">
              <label class="text-sm text-gray-600">View:</label>
              <div class="flex bg-gray-100 rounded-lg p-1">
                <button
                  (click)="viewMode.set('cards')"
                  [class.bg-white]="viewMode() === 'cards'"
                  [class.shadow]="viewMode() === 'cards'"
                  class="px-3 py-1 rounded transition-all"
                  title="Card View"
                >
                  <i class="pi pi-th-large"></i>
                </button>
                <button
                  (click)="viewMode.set('list')"
                  [class.bg-white]="viewMode() === 'list'"
                  [class.shadow]="viewMode() === 'list'"
                  class="px-3 py-1 rounded transition-all"
                  title="List View"
                >
                  <i class="pi pi-list"></i>
                </button>
                <button
                  (click)="viewMode.set('kanban')"
                  [class.bg-white]="viewMode() === 'kanban'"
                  [class.shadow]="viewMode() === 'kanban'"
                  class="px-3 py-1 rounded transition-all"
                  title="Kanban View"
                >
                  <i class="pi pi-table"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      
        <!-- Projects Grid View -->
        <div *ngIf="viewMode() === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            *ngFor="let project of filteredProjects()"
            class="relative"
          >
            <div class="absolute top-4 left-4 z-10">
              <input
                type="checkbox"
                [checked]="isProjectSelected(project)"
                (change)="toggleProjectSelection(project)"
                (click)="$event.stopPropagation()"
                class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <app-project-card
              [project]="project"
              (click)="selectProject(project)"
              [class.ring-2]="isProjectSelected(project)"
              [class.ring-blue-500]="isProjectSelected(project)"
              class="cursor-pointer"
            />
          </div>
        </div>
        
        <!-- Projects List View -->
        <div *ngIf="viewMode() === 'list'" class="bg-white rounded-lg shadow overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    [checked]="allProjectsSelected()"
                    [indeterminate]="someProjectsSelected()"
                    (change)="toggleAllProjects()"
                    class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metrics
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platforms
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr 
                *ngFor="let project of filteredProjects()"
                class="hover:bg-gray-50 cursor-pointer"
                [class.bg-blue-50]="isProjectSelected(project)"
                (click)="selectProject(project)"
              >
                <td class="px-6 py-4" (click)="$event.stopPropagation()">
                  <input
                    type="checkbox"
                    [checked]="isProjectSelected(project)"
                    (change)="toggleProjectSelection(project)"
                    class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td class="px-6 py-4">
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ project.title }}</div>
                    <div class="text-sm text-gray-500">{{ project.description }}</div>
                    <div class="mt-1 flex flex-wrap gap-1">
                      <span *ngFor="let tag of project.tags" 
                        class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {{ tag }}
                      </span>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span 
                    class="px-2 py-1 text-xs rounded-full"
                    [ngClass]="getStageClass(project.currentStage)"
                  >
                    {{ formatStage(project.currentStage) }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="text-xs space-y-1">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-lightbulb text-purple-500"></i>
                      <span>{{ project.summary?.insightsApproved || 0 }}/{{ project.summary?.insightsTotal || 0 }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <i class="pi pi-send text-blue-500"></i>
                      <span>{{ project.summary?.postsPublished || 0 }}/{{ project.summary?.postsTotal || 0 }}</span>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center">
                    <div class="w-32 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        class="bg-blue-600 h-2 rounded-full transition-all"
                        [style.width.%]="project.overallProgress"
                      ></div>
                    </div>
                    <span class="text-sm text-gray-600">{{ project.overallProgress }}%</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex gap-1">
                    <span *ngFor="let platform of project.targetPlatforms"
                      class="text-xs" 
                      [title]="formatPlatform(platform)">
                      <i [class]="getPlatformIcon(platform)"></i>
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                  {{ formatDate(project.updatedAt) }}
                </td>
                <td class="px-6 py-4" (click)="$event.stopPropagation()">
                  <button 
                    class="text-blue-600 hover:text-blue-800"
                  >
                    <i class="pi pi-ellipsis-v"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      
        <!-- Enhanced Kanban View -->
        <app-project-kanban
          *ngIf="viewMode() === 'kanban' && !loading() && !error()"
          [projects]="filteredProjects()"
          [selectedProjects]="new Set(selectedProjects().map(p => p.id))"
          (projectClick)="selectProject($event)"
          (projectSelect)="onKanbanProjectSelect($event)"
          (stageChange)="onKanbanStageChange($event)"
          (bulkStageAdvance)="onKanbanBulkAdvance($event)"
        />
        
        <!-- Enhanced Empty States -->
        <app-empty-state
          *ngIf="loading() || error() || filteredProjects().length === 0"
          [type]="getEmptyStateType()"
          [containerClass]="'default'"
          [tips]="getFilterTips()"
          (action)="onEmptyStateAction()"
          (secondaryAction)="onEmptyStateSecondaryAction()"
        />
      </div>
    </div>
    
    <!-- Create Project Modal -->
    <app-create-project-modal
      *ngIf="showCreateModal()"
      (close)="showCreateModal.set(false)"
      (projectCreated)="onProjectCreated($event)"
    />
    
    <!-- Bulk Stage Dialog -->
    <app-bulk-stage-dialog
      *ngIf="showBulkStageDialog()"
      [selectedProjects]="selectedProjects()"
      [allProjects]="projects()"
      (close)="showBulkStageDialog.set(false)"
      (confirm)="onBulkStageConfirm($event)"
    />
  `,
  styles: []
})
export class ProjectListComponent implements OnInit {
  @ViewChild('filterComponent') filterComponent?: ProjectFiltersComponent;
  
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private urlStateService = inject(UrlStateService);
  
  // Signals for reactive state
  projects = signal<ContentProject[]>([]);
  selectedProjects = signal<ContentProject[]>([]);
  viewMode = signal<'cards' | 'list' | 'kanban'>('cards');
  showCreateModal = signal(false);
  showFilters = signal(true);
  showBulkStageDialog = signal(false);
  activeFilterConfig = signal<ProjectFilterConfig | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  
  // Computed signal for filtered projects
  filteredProjects = computed(() => {
    const allProjects = this.projects();
    const config = this.activeFilterConfig();
    
    if (!config) return allProjects;
    
    return allProjects.filter(project => {
      // Filter by search term
      if (config.searchTerm) {
        const search = config.searchTerm.toLowerCase();
        const matchesSearch = 
          project.title.toLowerCase().includes(search) || 
          project.description?.toLowerCase().includes(search) ||
          project.tags.some(tag => tag.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }
      
      // Filter by stages
      if (config.stages.length > 0 && !config.stages.includes(project.currentStage)) {
        return false;
      }
      
      // Filter by platforms
      if (config.platforms.length > 0) {
        const hasPlatform = config.platforms.some(p => project.targetPlatforms.includes(p));
        if (!hasPlatform) return false;
      }
      
      // Filter by tags
      if (config.tags.length > 0) {
        const hasTag = config.tags.some(tag => project.tags.includes(tag));
        if (!hasTag) return false;
      }
      
      // Filter by date range
      if (config.dateRange.start || config.dateRange.end) {
        const projectDate = new Date(project.createdAt);
        if (config.dateRange.start && projectDate < config.dateRange.start) return false;
        if (config.dateRange.end && projectDate > config.dateRange.end) return false;
      }
      
      return true;
    });
  });
  
  // Selection state
  allProjectsSelected = computed(() => {
    const filtered = this.filteredProjects();
    const selected = this.selectedProjects();
    return filtered.length > 0 && filtered.every(p => selected.some(s => s.id === p.id));
  });
  
  someProjectsSelected = computed(() => {
    const selected = this.selectedProjects();
    return selected.length > 0 && !this.allProjectsSelected();
  });
  
  // Static values
  stages = Object.values(ProjectStage);
  activeStages = Object.values(ProjectStage).filter(
    s => s !== ProjectStage.ARCHIVED && s !== ProjectStage.PUBLISHED
  );
  
  ngOnInit(): void {
    this.loadProjects();
    this.initializeFromUrl();
    this.setupUrlStateSync();
  }

  private initializeFromUrl(): void {
    const urlState = this.urlStateService.getCurrentUrlState();
    
    if (urlState.view) {
      this.viewMode.set(urlState.view);
    }
    
    if (urlState.search || urlState.stage || urlState.platform || urlState.tags) {
      const config: ProjectFilterConfig = {
        searchTerm: urlState.search || '',
        stages: urlState.stage?.map(s => s as ProjectStage) || [],
        platforms: urlState.platform?.map(p => p as Platform) || [],
        tags: urlState.tags || [],
        dateRange: {
          start: urlState.dateFrom ? new Date(urlState.dateFrom) : null,
          end: urlState.dateTo ? new Date(urlState.dateTo) : null
        }
      };
      this.activeFilterConfig.set(config);
    }
  }

  private setupUrlStateSync(): void {
    effect(() => {
      const mode = this.viewMode();
      const config = this.activeFilterConfig();
      
      this.urlStateService.updateUrlState({
        view: mode,
        search: config?.searchTerm || undefined,
        stage: config?.stages || undefined,
        platform: config?.platforms || undefined,
        tags: config?.tags || undefined,
        dateFrom: config?.dateRange.start?.toISOString().split('T')[0],
        dateTo: config?.dateRange.end?.toISOString().split('T')[0]
      });
    });
  }
  
  loadProjects(): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
        // Update stage counts in filter component
        if (this.filterComponent) {
          this.filterComponent.setStageCountsFromProjects(projects);
        }
      },
      error: (err) => {
        this.error.set('Failed to load projects. Please try again.');
        this.loading.set(false);
      }
    });
  }
  
  onFilterChanged(config: ProjectFilterConfig): void {
    this.activeFilterConfig.set(config);
  }

  clearAllFilters(): void {
    this.activeFilterConfig.set(null);
    this.urlStateService.clearFilters();
    if (this.filterComponent) {
      this.filterComponent.reset();
    }
  }

  shareUrl(): void {
    const url = this.urlStateService.buildShareableUrl();
    navigator.clipboard.writeText(url).then(() => {
      alert('URL copied to clipboard!');
    });
  }

  getEmptyStateType(): 'no-projects' | 'no-results' | 'filtered-empty' | 'error' | 'loading' {
    if (this.loading()) return 'loading';
    if (this.error()) return 'error';
    if (this.projects().length === 0) return 'no-projects';
    if (this.filteredProjects().length === 0 && this.activeFilterConfig()) return 'filtered-empty';
    if (this.filteredProjects().length === 0) return 'no-results';
    return 'no-projects';
  }

  onKanbanStageChange(event: { projects: ContentProject[]; newStage: ProjectStage }): void {
    const updatePromises = event.projects.map(project => 
      this.projectService.updateProject(project.id, { 
        currentStage: event.newStage 
      }).toPromise()
    );
    
    Promise.all(updatePromises).then(() => {
      this.loadProjects();
    });
  }

  onKanbanBulkAdvance(event: { projects: ContentProject[]; fromStage: ProjectStage; toStage: ProjectStage }): void {
    const updatePromises = event.projects.map(project => 
      this.projectService.updateProject(project.id, { 
        currentStage: event.toStage 
      }).toPromise()
    );
    
    Promise.all(updatePromises).then(() => {
      this.loadProjects();
    });
  }
  
  // Selection methods
  isProjectSelected(project: ContentProject): boolean {
    return this.selectedProjects().some(p => p.id === project.id);
  }
  
  toggleProjectSelection(project: ContentProject): void {
    const current = this.selectedProjects();
    if (this.isProjectSelected(project)) {
      this.selectedProjects.set(current.filter(p => p.id !== project.id));
    } else {
      this.selectedProjects.set([...current, project]);
    }
  }
  
  toggleAllProjects(): void {
    if (this.allProjectsSelected()) {
      this.clearSelection();
    } else {
      this.selectAll();
    }
  }
  
  selectAll(): void {
    this.selectedProjects.set(this.filteredProjects());
  }
  
  selectAllInStage(stage: ProjectStage): void {
    const stageProjects = this.getProjectsByStage(stage);
    const current = this.selectedProjects();
    const newSelection = [...current];
    
    stageProjects.forEach(project => {
      if (!current.some(p => p.id === project.id)) {
        newSelection.push(project);
      }
    });
    
    this.selectedProjects.set(newSelection);
  }
  
  clearSelection(): void {
    this.selectedProjects.set([]);
  }
  
  // Bulk operations
  bulkChangeStage(): void {
    const selected = this.selectedProjects();
    if (selected.length === 0) return;
    
    this.showBulkStageDialog.set(true);
  }

  onBulkStageConfirm(event: { projects: ContentProject[]; targetStage: ProjectStage }): void {
    this.showBulkStageDialog.set(false);
    
    const updatePromises = event.projects.map(project => 
      this.projectService.updateProject(project.id, { 
        currentStage: event.targetStage 
      }).toPromise()
    );
    
    Promise.all(updatePromises).then(() => {
      this.clearSelection();
      this.loadProjects();
    });
  }
  
  bulkArchive(): void {
    const selected = this.selectedProjects();
    if (selected.length === 0) return;
    
    if (confirm(`Archive ${selected.length} project(s)?`)) {
      selected.forEach(project => {
        this.projectService.updateProject(project.id, { 
          currentStage: ProjectStage.ARCHIVED 
        }).subscribe(() => {
          this.loadProjects();
        });
      });
      this.clearSelection();
    }
  }
  
  bulkDelete(): void {
    const selected = this.selectedProjects();
    if (selected.length === 0) return;
    
    if (confirm(`Delete ${selected.length} project(s)? This action cannot be undone.`)) {
      selected.forEach(project => {
        this.projectService.deleteProject(project.id).subscribe(() => {
          this.loadProjects();
        });
      });
      this.clearSelection();
    }
  }
  
  getProjectsByStage(stage: ProjectStage): ContentProject[] {
    return this.filteredProjects().filter(p => p.currentStage === stage);
  }
  
  selectProject(project: ContentProject): void {
    this.projectService.setCurrentProject(project);
    this.router.navigate(['/projects', project.id]);
  }
  
  getStageClass(stage: string): string {
    const stageClasses: Record<string, string> = {
      'RAW_CONTENT': 'bg-gray-100 text-gray-700',
      'PROCESSING_CONTENT': 'bg-yellow-100 text-yellow-700',
      'INSIGHTS_READY': 'bg-purple-100 text-purple-700',
      'INSIGHTS_APPROVED': 'bg-indigo-100 text-indigo-700',
      'POSTS_GENERATED': 'bg-blue-100 text-blue-700',
      'POSTS_APPROVED': 'bg-teal-100 text-teal-700',
      'SCHEDULED': 'bg-orange-100 text-orange-700',
      'PUBLISHING': 'bg-pink-100 text-pink-700',
      'PUBLISHED': 'bg-green-100 text-green-700',
      'ARCHIVED': 'bg-gray-100 text-gray-500'
    };
    return stageClasses[stage] || 'bg-gray-100 text-gray-700';
  }
  
  formatStage(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  
  formatPlatform(platform: string): string {
    return platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
  }
  
  getPlatformIcon(platform: Platform): string {
    const icons: Record<Platform, string> = {
      [Platform.LINKEDIN]: 'pi pi-linkedin',
      [Platform.TWITTER]: 'pi pi-twitter',
      [Platform.THREADS]: 'pi pi-at',
      [Platform.BLUESKY]: 'pi pi-cloud',
      [Platform.FACEBOOK]: 'pi pi-facebook',
      [Platform.INSTAGRAM]: 'pi pi-instagram'
    };
    return icons[platform] || 'pi pi-globe';
  }
  
  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString();
  }
  
  onProjectCreated(project: ContentProject): void {
    // Reload projects and navigate to the new one
    this.loadProjects();
    this.router.navigate(['/projects', project.id]);
  }

  onKanbanProjectSelect(event: { project: ContentProject; selected: boolean }): void {
    if (event.selected) {
      this.selectedProjects.update(current => [...current, event.project]);
    } else {
      this.selectedProjects.update(current => 
        current.filter(p => p.id !== event.project.id)
      );
    }
  }

  getFilterTips(): string[] {
    if (!this.activeFilterConfig()) return [];
    
    const tips: string[] = [];
    const config = this.activeFilterConfig()!;
    
    if (config.searchTerm) {
      tips.push('Clear the search term');
    }
    if (config.stages.length > 0) {
      tips.push('Remove stage filters');
    }
    if (config.platforms.length > 0) {
      tips.push('Remove platform filters');
    }
    if (config.tags.length > 0) {
      tips.push('Remove tag filters');
    }
    if (config.dateRange.start || config.dateRange.end) {
      tips.push('Clear date range');
    }
    
    return tips;
  }

  onEmptyStateAction(): void {
    const type = this.getEmptyStateType();
    
    switch (type) {
      case 'no-projects':
        this.showCreateModal.set(true);
        break;
      case 'filtered-empty':
      case 'no-results':
        this.clearAllFilters();
        break;
      case 'error':
        this.loadProjects();
        break;
    }
  }

  onEmptyStateSecondaryAction(): void {
    const type = this.getEmptyStateType();
    
    if (type === 'filtered-empty') {
      // Show filters panel if hidden
      this.showFilters.set(true);
    }
  }
}