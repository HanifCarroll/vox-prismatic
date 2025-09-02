import { Injectable, signal, computed } from '@angular/core';
import { ContentProject, ProjectStage } from '../models/project.model';

export interface ProjectFilter {
  stage?: ProjectStage;
  tags?: string[];
  searchTerm?: string;
  platforms?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectStore {
  // State signals
  private readonly _projects = signal<ContentProject[]>([]);
  private readonly _currentProject = signal<ContentProject | null>(null);
  private readonly _selectedProjectIds = signal<Set<string>>(new Set());
  private readonly _filters = signal<ProjectFilter>({});
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Public read-only signals
  readonly projects = this._projects.asReadonly();
  readonly currentProject = this._currentProject.asReadonly();
  readonly selectedProjectIds = this._selectedProjectIds.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed values
  readonly filteredProjects = computed(() => {
    const projects = this._projects();
    const filters = this._filters();
    
    let filtered = [...projects];
    
    if (filters.stage) {
      filtered = filtered.filter(p => p.currentStage === filters.stage);
    }
    
    if (filters.tags?.length) {
      filtered = filtered.filter(p => 
        p.tags.some(tag => filters.tags?.includes(tag))
      );
    }
    
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }
    
    if (filters.dateFrom) {
      filtered = filtered.filter(p => 
        new Date(p.createdAt) >= filters.dateFrom!
      );
    }
    
    if (filters.dateTo) {
      filtered = filtered.filter(p => 
        new Date(p.createdAt) <= filters.dateTo!
      );
    }
    
    return filtered;
  });

  readonly selectedProjects = computed(() => {
    const ids = this._selectedProjectIds();
    const projects = this._projects();
    return projects.filter(p => ids.has(p.id));
  });

  readonly projectsByStage = computed(() => {
    const projects = this._projects();
    const byStage: Record<ProjectStage, ContentProject[]> = {} as any;
    
    Object.values(ProjectStage).forEach(stage => {
      byStage[stage as ProjectStage] = projects.filter(p => p.currentStage === stage);
    });
    
    return byStage;
  });

  readonly stageCounts = computed(() => {
    const byStage = this.projectsByStage();
    const counts: Record<ProjectStage, number> = {} as any;
    
    Object.entries(byStage).forEach(([stage, projects]) => {
      counts[stage as ProjectStage] = projects.length;
    });
    
    return counts;
  });

  readonly projectSummary = computed(() => {
    const projects = this._projects();
    const byStage = this.projectsByStage();
    
    return {
      total: projects.length,
      active: projects.filter(p => 
        p.currentStage !== ProjectStage.ARCHIVED && 
        p.currentStage !== ProjectStage.PUBLISHED
      ).length,
      insightsNeedingReview: byStage[ProjectStage.INSIGHTS_READY]?.length || 0,
      postsNeedingReview: byStage[ProjectStage.POSTS_GENERATED]?.length || 0,
      readyToSchedule: byStage[ProjectStage.POSTS_APPROVED]?.length || 0,
      scheduled: byStage[ProjectStage.SCHEDULED]?.length || 0,
      published: byStage[ProjectStage.PUBLISHED]?.length || 0
    };
  });

  // Actions
  setProjects(projects: ContentProject[]): void {
    this._projects.set(projects);
  }

  addProject(project: ContentProject): void {
    this._projects.update(projects => [...projects, project]);
  }

  updateProject(id: string, updates: Partial<ContentProject>): void {
    this._projects.update(projects => 
      projects.map(p => p.id === id ? { ...p, ...updates } : p)
    );
    
    // Update current project if it's the one being updated
    if (this._currentProject()?.id === id) {
      this._currentProject.update(p => p ? { ...p, ...updates } : null);
    }
  }

  removeProject(id: string): void {
    this._projects.update(projects => projects.filter(p => p.id !== id));
    
    // Clear current project if it's the one being removed
    if (this._currentProject()?.id === id) {
      this._currentProject.set(null);
    }
    
    // Remove from selection
    this._selectedProjectIds.update(ids => {
      const newIds = new Set(ids);
      newIds.delete(id);
      return newIds;
    });
  }

  setCurrentProject(project: ContentProject | null): void {
    this._currentProject.set(project);
  }

  selectProject(id: string): void {
    this._selectedProjectIds.update(ids => {
      const newIds = new Set(ids);
      newIds.add(id);
      return newIds;
    });
  }

  deselectProject(id: string): void {
    this._selectedProjectIds.update(ids => {
      const newIds = new Set(ids);
      newIds.delete(id);
      return newIds;
    });
  }

  toggleProjectSelection(id: string): void {
    this._selectedProjectIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(id)) {
        newIds.delete(id);
      } else {
        newIds.add(id);
      }
      return newIds;
    });
  }

  selectAll(): void {
    const allIds = this._projects().map(p => p.id);
    this._selectedProjectIds.set(new Set(allIds));
  }

  clearSelection(): void {
    this._selectedProjectIds.set(new Set());
  }

  setFilters(filters: ProjectFilter): void {
    this._filters.set(filters);
  }

  updateFilter<K extends keyof ProjectFilter>(key: K, value: ProjectFilter[K]): void {
    this._filters.update(f => ({ ...f, [key]: value }));
  }

  clearFilters(): void {
    this._filters.set({});
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  // Batch operations
  updateProjectsStage(projectIds: string[], newStage: ProjectStage): void {
    this._projects.update(projects => 
      projects.map(p => 
        projectIds.includes(p.id) 
          ? { ...p, currentStage: newStage, updatedAt: new Date() }
          : p
      )
    );
  }

  archiveProjects(projectIds: string[]): void {
    this.updateProjectsStage(projectIds, ProjectStage.ARCHIVED);
  }
}