import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { ApiService, PaginatedRequest } from './api.service';
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
  
  private currentProjectSubject = new BehaviorSubject<ContentProject | null>(null);
  public currentProject$ = this.currentProjectSubject.asObservable();
  
  private projectsSubject = new BehaviorSubject<ContentProject[]>([]);
  public projects$ = this.projectsSubject.asObservable();

  getProjects(filter?: ProjectFilter): Observable<ContentProject[]> {
    return this.api.get<ContentProject[]>('/projects', filter)
      .pipe(
        tap(projects => this.projectsSubject.next(projects))
      );
  }

  getProject(id: string): Observable<ContentProject> {
    return this.api.get<ContentProject>(`/projects/${id}`)
      .pipe(
        tap(project => this.currentProjectSubject.next(project))
      );
  }

  createProject(data: CreateProjectDto): Observable<ContentProject> {
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
    return this.api.patch<ContentProject>(`/projects/${id}`, data)
      .pipe(
        tap(project => {
          if (this.currentProjectSubject.value?.id === id) {
            this.currentProjectSubject.next(project);
          }
        })
      );
  }

  deleteProject(id: string): Observable<void> {
    return this.api.delete<void>(`/projects/${id}`)
      .pipe(
        tap(() => {
          if (this.currentProjectSubject.value?.id === id) {
            this.currentProjectSubject.next(null);
          }
        })
      );
  }

  processContent(projectId: string): Observable<ProcessingJob> {
    return this.api.post<ProcessingJob>(`/projects/${projectId}/process-content`, {});
  }

  extractInsights(projectId: string): Observable<ProcessingJob> {
    return this.api.post<ProcessingJob>(`/projects/${projectId}/extract-insights`, {});
  }

  generatePosts(projectId: string, insightIds?: string[]): Observable<ProcessingJob> {
    return this.api.post<ProcessingJob>(`/projects/${projectId}/generate-posts`, {
      insightIds
    });
  }

  schedulePosts(projectId: string, postIds: string[]): Observable<ScheduledPost[]> {
    return this.api.post<ScheduledPost[]>(`/projects/${projectId}/schedule-posts`, {
      postIds
    });
  }

  publishNow(projectId: string, postIds: string[]): Observable<any> {
    return this.api.post<any>(`/projects/${projectId}/publish-now`, {
      postIds
    });
  }

  getProjectInsights(projectId: string): Observable<Insight[]> {
    return this.api.get<Insight[]>(`/projects/${projectId}/insights`);
  }

  updateInsight(projectId: string, insightId: string, data: Partial<Insight>): Observable<Insight> {
    return this.api.patch<Insight>(`/projects/${projectId}/insights/${insightId}`, data);
  }

  approveInsights(projectId: string, insightIds: string[]): Observable<Insight[]> {
    return this.api.post<Insight[]>(`/projects/${projectId}/insights/approve`, {
      insightIds
    });
  }

  getProjectPosts(projectId: string): Observable<Post[]> {
    return this.api.get<Post[]>(`/projects/${projectId}/posts`);
  }

  updatePost(projectId: string, postId: string, data: Partial<Post>): Observable<Post> {
    return this.api.patch<Post>(`/projects/${projectId}/posts/${postId}`, data);
  }

  approvePosts(projectId: string, postIds: string[]): Observable<Post[]> {
    return this.api.post<Post[]>(`/projects/${projectId}/posts/approve`, {
      postIds
    });
  }

  getDashboard(): Observable<DashboardData> {
    return this.api.get<DashboardData>('/dashboard/project-overview');
  }

  getActionItems(): Observable<ContentProject[]> {
    return this.api.get<ContentProject[]>('/dashboard/action-items');
  }

  setCurrentProject(project: ContentProject | null): void {
    this.currentProjectSubject.next(project);
  }
}