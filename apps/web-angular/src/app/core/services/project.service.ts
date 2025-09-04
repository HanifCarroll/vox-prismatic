import { Injectable, inject, signal } from '@angular/core';
import { Observable, BehaviorSubject, tap, of, delay, map, throwError } from 'rxjs';
import { ApiService, PaginatedRequest } from './api.service';
import { MockDataService } from './mock-data.service';
import { AuthStore } from '../stores/auth.store';
import { environment } from '../../../environments/environment';
import { 
  ContentProject, 
  ProjectStage, 
  Insight, 
  Post, 
  ScheduledPost,
  ProcessingJob 
} from '../models/project.model';

export interface ProjectFilter extends PaginatedRequest {
  stage?: ProjectStage;
  tags?: string[];
  searchTerm?: string;
  platforms?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CreateProjectDto {
  title: string;
  description?: string;
  tags?: string[];
  sourceType: string;
  sourceUrl?: string;
  file?: File;
  targetPlatforms?: string[];
  autoApprovalSettings?: any;
}

export interface ProjectAction {
  projectId: string;
  action: 'process-content' | 'extract-insights' | 'generate-posts' | 'schedule-posts' | 'publish-now';
  params?: any;
}

export interface DashboardData {
  projectOverview: {
    total: number;
    byStage: Record<ProjectStage, number>;
    recentActivity: ContentProject[];
  };
  actionItems: {
    insightsNeedingReview: number;
    postsNeedingReview: number;
    readyToSchedule: number;
    failedJobs: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly api = inject(ApiService);
  private readonly mockData = inject(MockDataService);
  private readonly authStore = inject(AuthStore);
  private readonly useMockData = environment.useMockData;
  
  // Observable version (for existing code)
  private currentProjectSubject = new BehaviorSubject<ContentProject | null>(null);
  public currentProject$ = this.currentProjectSubject.asObservable();
  
  // Signal version (for new components)
  public currentProject = signal<ContentProject | null>(null);
  
  private projectsSubject = new BehaviorSubject<ContentProject[]>([]);
  public projects$ = this.projectsSubject.asObservable();

  // Helper method to get current user ID
  private getCurrentUserId(): string {
    const user = this.authStore.user();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  getProjects(filter?: ProjectFilter): Observable<ContentProject[]> {
    if (this.useMockData) {
      return this.mockData.getProjects()
        .pipe(
          tap(projects => this.projectsSubject.next(projects))
        );
    }
    
    try {
      const userId = this.getCurrentUserId();
      const params = { ...filter, userId };
      
      return this.api.get<ContentProject[]>('/projects', params)
        .pipe(
          tap(projects => this.projectsSubject.next(projects))
        );
    } catch (error) {
      return throwError(() => error);
    }
  }

  getProject(id: string): Observable<ContentProject> {
    if (this.useMockData) {
      return this.mockData.getProject(id)
        .pipe(
          tap(project => {
            this.currentProjectSubject.next(project);
            this.currentProject.set(project);
          })
        );
    }
    
    try {
      const userId = this.getCurrentUserId();
      
      return this.api.get<ContentProject>(`/projects/${id}`, { userId })
        .pipe(
          tap(project => {
            this.currentProjectSubject.next(project);
            this.currentProject.set(project);
          })
        );
    } catch (error) {
      return throwError(() => error);
    }
  }

  createProject(data: CreateProjectDto | FormData): Observable<ContentProject> {
    if (this.useMockData) {
      // Handle FormData for mock
      if (data instanceof FormData) {
        const mockData: CreateProjectDto = {
          title: data.get('title') as string,
          description: data.get('description') as string || undefined,
          sourceType: data.get('sourceType') as string,
          tags: data.get('tags') ? JSON.parse(data.get('tags') as string) : undefined,
          targetPlatforms: data.get('targetPlatforms') ? JSON.parse(data.get('targetPlatforms') as string) : undefined
        };
        return this.mockData.createProject(mockData);
      }
      return this.mockData.createProject(data);
    }
    
    // For real API, handle FormData directly
    if (data instanceof FormData) {
      return this.api.post<ContentProject>('/projects', data);
    }
    
    // Legacy support for CreateProjectDto
    if (data.file) {
      return this.api.upload<ContentProject>('/projects', data.file, {
        title: data.title,
        description: data.description,
        tags: JSON.stringify(data.tags || []),
        sourceType: data.sourceType,
        targetPlatforms: JSON.stringify(data.targetPlatforms || [])
      });
    } else {
      return this.api.post<ContentProject>('/projects', data);
    }
  }

  updateProject(id: string, data: Partial<ContentProject>): Observable<ContentProject> {
    if (this.useMockData) {
      return this.mockData.updateProject(id, data)
        .pipe(
          tap(project => {
            if (this.currentProjectSubject.value?.id === id) {
              this.currentProjectSubject.next(project);
              this.currentProject.set(project);
            }
          })
        );
    }
    return this.api.patch<ContentProject>(`/projects/${id}`, data)
      .pipe(
        tap(project => {
          if (this.currentProjectSubject.value?.id === id) {
            this.currentProjectSubject.next(project);
            this.currentProject.set(project);
          }
        })
      );
  }

  deleteProject(id: string): Observable<void> {
    if (this.useMockData) {
      return this.mockData.deleteProject(id)
        .pipe(
          tap(() => {
            if (this.currentProjectSubject.value?.id === id) {
              this.currentProjectSubject.next(null);
              this.currentProject.set(null);
            }
          })
        );
    }
    return this.api.delete<void>(`/projects/${id}`)
      .pipe(
        tap(() => {
          if (this.currentProjectSubject.value?.id === id) {
            this.currentProjectSubject.next(null);
            this.currentProject.set(null);
          }
        })
      );
  }

  processContent(projectId: string): Observable<ProcessingJob> {
    if (this.useMockData) {
      return this.mockData.processContent(projectId);
    }
    return this.api.post<ProcessingJob>(`/projects/${projectId}/process-content`, {});
  }

  extractInsights(projectId: string): Observable<ProcessingJob> {
    if (this.useMockData) {
      return this.mockData.extractInsights(projectId);
    }
    return this.api.post<ProcessingJob>(`/projects/${projectId}/extract-insights`, {});
  }

  generatePosts(projectId: string, insightIds?: string[]): Observable<ProcessingJob> {
    if (this.useMockData) {
      return this.mockData.generatePosts(projectId);
    }
    return this.api.post<ProcessingJob>(`/projects/${projectId}/generate-posts`, {
      insightIds
    });
  }

  schedulePosts(projectId: string, postIds: string[]): Observable<ScheduledPost[]> {
    if (this.useMockData) {
      // Mock implementation - return empty array for now
      return of([]).pipe(delay(300));
    }
    return this.api.post<ScheduledPost[]>(`/projects/${projectId}/schedule-posts`, {
      postIds
    });
  }

  publishNow(projectId: string, postIds: string[]): Observable<any> {
    if (this.useMockData) {
      return of({ success: true, published: postIds.length }).pipe(delay(300));
    }
    return this.api.post<any>(`/projects/${projectId}/publish-now`, {
      postIds
    });
  }

  getProjectInsights(projectId: string): Observable<Insight[]> {
    if (this.useMockData) {
      return this.mockData.getProject(projectId).pipe(
        map(project => project.insights || [])
      );
    }
    return this.api.get<Insight[]>(`/projects/${projectId}/insights`);
  }

  updateInsight(projectId: string, insightId: string, data: Partial<Insight>): Observable<Insight> {
    if (this.useMockData) {
      // Simple mock - just return the updated insight
      return of({ id: insightId, ...data } as Insight).pipe(delay(300));
    }
    return this.api.patch<Insight>(`/projects/${projectId}/insights/${insightId}`, data);
  }

  approveInsights(projectId: string, insightIds: string[]): Observable<Insight[]> {
    if (this.useMockData) {
      return this.mockData.approveInsights(projectId, insightIds);
    }
    return this.api.post<Insight[]>(`/projects/${projectId}/insights/approve`, {
      insightIds
    });
  }

  getProjectPosts(projectId: string): Observable<Post[]> {
    if (this.useMockData) {
      return this.mockData.getProject(projectId).pipe(
        map(project => project.posts || [])
      );
    }
    return this.api.get<Post[]>(`/projects/${projectId}/posts`);
  }

  updatePost(projectId: string, postId: string, data: Partial<Post>): Observable<Post> {
    if (this.useMockData) {
      return of({ id: postId, ...data } as Post).pipe(delay(300));
    }
    return this.api.patch<Post>(`/projects/${projectId}/posts/${postId}`, data);
  }

  approvePosts(projectId: string, postIds: string[]): Observable<Post[]> {
    if (this.useMockData) {
      return this.mockData.approvePosts(projectId, postIds);
    }
    return this.api.post<Post[]>(`/projects/${projectId}/posts/approve`, {
      postIds
    });
  }

  getDashboard(): Observable<DashboardData> {
    if (this.useMockData) {
      return this.mockData.getDashboardData();
    }
    return this.api.get<DashboardData>('/dashboard/project-overview');
  }

  getActionItems(): Observable<ContentProject[]> {
    if (this.useMockData) {
      return this.mockData.getActionItems();
    }
    return this.api.get<ContentProject[]>('/dashboard/action-items');
  }

  setCurrentProject(project: ContentProject | null): void {
    this.currentProjectSubject.next(project);
    this.currentProject.set(project);
  }
}