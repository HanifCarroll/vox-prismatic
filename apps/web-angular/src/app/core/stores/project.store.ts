import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { ContentProject, ProjectStage } from '../models/project.model';
import { SSEService, SSEEvent } from '../services/sse.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface ProjectFilter {
  stage?: ProjectStage;
  tags?: string[];
  searchTerm?: string;
  platforms?: string[];
  status?: 'all' | 'active' | 'archived';
}

@Injectable({
  providedIn: 'root'
})
export class ProjectStore {
  private readonly sseService = inject(SSEService);
  
  // State signals
  private readonly _projects = signal<ContentProject[]>([]);
  private readonly _currentProject = signal<ContentProject | null>(null);
  private readonly _selectedProjectIds = signal<Set<string>>(new Set());
  private readonly _filters = signal<ProjectFilter>({});
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _realTimeUpdates = signal<Record<string, SSEEvent>>({});

  // Public read-only signals
  readonly projects = this._projects.asReadonly();
  readonly currentProject = this._currentProject.asReadonly();
  readonly selectedProjectIds = this._selectedProjectIds.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly realTimeUpdates = this._realTimeUpdates.asReadonly();
  
  // SSE connection status
  readonly sseConnectionStatus = computed(() => this.sseService.connectionStatus());
  readonly isSSEConnected = computed(() => this.sseService.isConnected());

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
    
    if (filters.status) {
      if (filters.status === 'active') {
        filtered = filtered.filter(p => 
          p.currentStage !== ProjectStage.ARCHIVED && 
          p.currentStage !== ProjectStage.PUBLISHED
        );
      } else if (filters.status === 'archived') {
        filtered = filtered.filter(p => p.currentStage === ProjectStage.ARCHIVED);
      }
      // For 'all', no additional filtering needed
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

  // Real-time project updates with live status
  readonly projectsWithLiveStatus = computed(() => {
    const projects = this._projects();
    const updates = this._realTimeUpdates();
    
    return projects.map(project => {
      const liveUpdate = updates[project.id];
      if (!liveUpdate) return project;
      
      // Apply live updates from SSE
      return {
        ...project,
        liveStatus: {
          event: liveUpdate,
          isProcessing: this.isProjectProcessing(liveUpdate),
          lastActivity: liveUpdate.timestamp,
          progress: liveUpdate.data.progress
        }
      };
    });
  });

  constructor() {
    // Set up SSE event handling
    this.setupSSEEventHandling();
  }

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

  // SSE Integration Methods

  /**
   * Set up SSE event handling for real-time project updates
   */
  private setupSSEEventHandling(): void {
    this.sseService.events$
      .pipe(takeUntilDestroyed())
      .subscribe(event => {
        this.handleSSEEvent(event);
      });
  }

  /**
   * Handle incoming SSE events and update project state
   */
  private handleSSEEvent(event: SSEEvent): void {
    console.log('ProjectStore received SSE event:', event.type, event.projectId);
    
    // Update real-time events map
    this._realTimeUpdates.update(updates => ({
      ...updates,
      [event.projectId]: event
    }));
    
    // Handle different event types
    switch (event.type) {
      case 'StageChanged':
        this.handleStageChangedEvent(event);
        break;
      case 'ProcessingStarted':
        this.handleProcessingStartedEvent(event);
        break;
      case 'ProcessingCompleted':
        this.handleProcessingCompletedEvent(event);
        break;
      case 'InsightApproved':
        this.handleInsightApprovedEvent(event);
        break;
      case 'PostApproved':
        this.handlePostApprovedEvent(event);
        break;
      case 'PostScheduled':
        this.handlePostScheduledEvent(event);
        break;
      case 'PostPublished':
        this.handlePostPublishedEvent(event);
        break;
      case 'ProcessingFailed':
      case 'PublishingFailed':
      case 'ErrorOccurred':
        this.handleErrorEvent(event);
        break;
      default:
        console.log('Unhandled SSE event type:', event.type);
    }
  }

  /**
   * Handle stage changed events
   */
  private handleStageChangedEvent(event: SSEEvent): void {
    if (event.data.newStage && event.data.previousStage) {
      this.updateProject(event.projectId, {
        currentStage: this.mapSSEStageToProjectStage(event.data.newStage),
        updatedAt: new Date(event.timestamp),
        lastActivityAt: new Date(event.timestamp)
      });
    }
  }

  /**
   * Handle processing started events
   */
  private handleProcessingStartedEvent(event: SSEEvent): void {
    this.updateProject(event.projectId, {
      lastActivityAt: new Date(event.timestamp)
    });
  }

  /**
   * Handle processing completed events
   */
  private handleProcessingCompletedEvent(event: SSEEvent): void {
    this.updateProject(event.projectId, {
      lastActivityAt: new Date(event.timestamp),
      updatedAt: new Date(event.timestamp)
    });
  }

  /**
   * Handle insight approved events
   */
  private handleInsightApprovedEvent(event: SSEEvent): void {
    // Update project activity timestamp
    this.updateProject(event.projectId, {
      lastActivityAt: new Date(event.timestamp)
    });
  }

  /**
   * Handle post approved events
   */
  private handlePostApprovedEvent(event: SSEEvent): void {
    // Update project activity timestamp
    this.updateProject(event.projectId, {
      lastActivityAt: new Date(event.timestamp)
    });
  }

  /**
   * Handle post scheduled events
   */
  private handlePostScheduledEvent(event: SSEEvent): void {
    this.updateProject(event.projectId, {
      currentStage: ProjectStage.SCHEDULED,
      lastActivityAt: new Date(event.timestamp),
      updatedAt: new Date(event.timestamp)
    });
  }

  /**
   * Handle post published events
   */
  private handlePostPublishedEvent(event: SSEEvent): void {
    this.updateProject(event.projectId, {
      currentStage: ProjectStage.PUBLISHED,
      lastActivityAt: new Date(event.timestamp),
      updatedAt: new Date(event.timestamp)
    });
  }

  /**
   * Handle error events
   */
  private handleErrorEvent(event: SSEEvent): void {
    console.error('SSE Error event for project:', event.projectId, event.data.error);
    
    this.updateProject(event.projectId, {
      lastActivityAt: new Date(event.timestamp)
    });
    
    // Set global error state if needed
    if (event.data.error?.message) {
      this.setError(`Project ${event.projectId}: ${event.data.error.message}`);
    }
  }

  /**
   * Check if a project is currently processing based on the latest SSE event
   */
  private isProjectProcessing(event: SSEEvent): boolean {
    const processingEventTypes = ['ProcessingStarted', 'StageChanged'];
    const completionEventTypes = ['ProcessingCompleted', 'ProcessingFailed'];
    
    return processingEventTypes.includes(event.type) && 
           !completionEventTypes.includes(event.type);
  }

  /**
   * Map SSE stage strings to ProjectStage enum values
   */
  private mapSSEStageToProjectStage(stageString: string): ProjectStage {
    // Map backend stage strings to frontend enum values
    const stageMap: Record<string, ProjectStage> = {
      'RAW_CONTENT': ProjectStage.RAW_CONTENT,
      'PROCESSING_CONTENT': ProjectStage.PROCESSING_CONTENT,
      'INSIGHTS_READY': ProjectStage.INSIGHTS_READY,
      'INSIGHTS_APPROVED': ProjectStage.INSIGHTS_APPROVED,
      'POSTS_GENERATED': ProjectStage.POSTS_GENERATED,
      'POSTS_APPROVED': ProjectStage.POSTS_APPROVED,
      'SCHEDULED': ProjectStage.SCHEDULED,
      'PUBLISHING': ProjectStage.PUBLISHING,
      'PUBLISHED': ProjectStage.PUBLISHED,
      'ARCHIVED': ProjectStage.ARCHIVED
    };
    
    return stageMap[stageString] || ProjectStage.RAW_CONTENT;
  }

  /**
   * Get real-time update for a specific project
   */
  getProjectRealTimeUpdate(projectId: string): SSEEvent | undefined {
    return this._realTimeUpdates()[projectId];
  }

  /**
   * Clear real-time updates (useful for cleanup)
   */
  clearRealTimeUpdates(): void {
    this._realTimeUpdates.set({});
  }

  /**
   * Get SSE connection metrics
   */
  getSSEMetrics() {
    return this.sseService.getConnectionMetrics();
  }
}