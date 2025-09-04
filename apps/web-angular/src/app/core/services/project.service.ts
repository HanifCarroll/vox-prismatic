import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, tap, of, delay, map, throwError, catchError, switchMap } from 'rxjs';
import { ApiService, PaginatedRequest, PaginatedResponse } from './api.service';
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
import {
  ContentProjectDto,
  ContentProjectDetailDto,
  CreateProjectDto as ApiCreateProjectDto,
  UpdateProjectDto,
  ProjectFilter as ApiProjectFilter,
  ListProjectsResponse,
  ProcessingJobDto,
  InsightDto,
  PostDto,
  DashboardDto,
  InsightSummary,
  PostSummary
} from '../models/api-dtos';

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
  public isLoading = signal<boolean>(false);
  public error = signal<string | null>(null);
  
  private projectsSubject = new BehaviorSubject<ContentProject[]>([]);
  public projects$ = this.projectsSubject.asObservable();
  public projects = signal<ContentProject[]>([]);
  
  // Computed values
  public hasProjects = computed(() => this.projects().length > 0);

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
          tap(projects => {
            this.projectsSubject.next(projects);
            this.projects.set(projects);
          })
        );
    }
    
    this.isLoading.set(true);
    this.error.set(null);
    
    const apiFilter: ApiProjectFilter = {
      ...filter,
      stage: filter?.stage,
      tags: filter?.tags,
      searchTerm: filter?.searchTerm,
      createdAfter: filter?.dateFrom?.toISOString(),
      createdBefore: filter?.dateTo?.toISOString(),
      sortBy: filter?.sortBy || 'createdAt',
      sortDescending: filter?.sortOrder === 'desc',
      page: filter?.page || 1,
      pageSize: filter?.pageSize || 20
    };
    
    return this.api.get<ListProjectsResponse>('/projects', apiFilter)
      .pipe(
        map(response => this.mapProjectDtosToModels(response.projects || [])),
        tap(projects => {
          this.projectsSubject.next(projects);
          this.projects.set(projects);
          this.isLoading.set(false);
        }),
        catchError(error => {
          this.error.set(error.message || 'Failed to load projects');
          this.isLoading.set(false);
          return throwError(() => error);
        })
      );
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
    
    this.isLoading.set(true);
    this.error.set(null);
    
    return this.api.get<ContentProjectDetailDto>(`/projects/${id}`)
      .pipe(
        map(dto => this.mapProjectDetailDtoToModel(dto)),
        tap(project => {
          this.currentProjectSubject.next(project);
          this.currentProject.set(project);
          this.isLoading.set(false);
        }),
        catchError(error => {
          this.error.set(error.message || 'Failed to load project');
          this.isLoading.set(false);
          return throwError(() => error);
        })
      );
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
    
    this.isLoading.set(true);
    this.error.set(null);
    
    let apiCall: Observable<{ id: string }>;
    
    // For real API, handle FormData directly
    if (data instanceof FormData) {
      apiCall = this.api.post<{ id: string }>('/projects', data);
    } else if (data.file) {
      // Legacy support for CreateProjectDto with file
      const apiData: ApiCreateProjectDto = {
        title: data.title,
        description: data.description,
        tags: data.tags,
        sourceType: data.sourceType,
        sourceUrl: data.sourceUrl,
        fileName: data.file.name,
        targetPlatforms: data.targetPlatforms as any[]
      };
      apiCall = this.api.upload<{ id: string }>('/projects', data.file, apiData);
    } else {
      // Standard DTO
      const apiData: ApiCreateProjectDto = {
        title: data.title,
        description: data.description,
        tags: data.tags,
        sourceType: data.sourceType,
        sourceUrl: data.sourceUrl,
        targetPlatforms: data.targetPlatforms as any[]
      };
      apiCall = this.api.post<{ id: string }>('/projects', apiData);
    }
    
    return apiCall.pipe(
      // After creation, fetch the full project
      switchMap(response => this.getProject(response.id)),
      tap(() => {
        this.isLoading.set(false);
        // Refresh projects list
        this.getProjects().subscribe();
      }),
      catchError(error => {
        this.error.set(error.message || 'Failed to create project');
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
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
    
    this.isLoading.set(true);
    this.error.set(null);
    
    const updateDto: UpdateProjectDto = {
      title: data.title,
      description: data.description,
      tags: data.tags
    };
    
    return this.api.patch<{ message: string }>(`/projects/${id}`, updateDto)
      .pipe(
        // After update, fetch the updated project
        switchMap(() => this.getProject(id)),
        tap(project => {
          if (this.currentProjectSubject.value?.id === id) {
            this.currentProjectSubject.next(project);
            this.currentProject.set(project);
          }
          this.isLoading.set(false);
        }),
        catchError(error => {
          this.error.set(error.message || 'Failed to update project');
          this.isLoading.set(false);
          return throwError(() => error);
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
    
    this.isLoading.set(true);
    this.error.set(null);
    
    return this.api.delete<void>(`/projects/${id}`)
      .pipe(
        tap(() => {
          if (this.currentProjectSubject.value?.id === id) {
            this.currentProjectSubject.next(null);
            this.currentProject.set(null);
          }
          // Refresh projects list
          this.getProjects().subscribe();
          this.isLoading.set(false);
        }),
        catchError(error => {
          this.error.set(error.message || 'Failed to delete project');
          this.isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  processContent(projectId: string): Observable<ProcessingJob> {
    if (this.useMockData) {
      return this.mockData.processContent(projectId);
    }
    return this.api.post<ProcessingJobDto>(`/projects/${projectId}/process-content`)
      .pipe(
        map(dto => this.mapProcessingJobDtoToModel(dto))
      );
  }

  extractInsights(projectId: string): Observable<ProcessingJob> {
    if (this.useMockData) {
      return this.mockData.extractInsights(projectId);
    }
    return this.api.post<ProcessingJobDto>(`/projects/${projectId}/extract-insights`)
      .pipe(
        map(dto => this.mapProcessingJobDtoToModel(dto))
      );
  }

  generatePosts(projectId: string, insightIds?: string[]): Observable<ProcessingJob> {
    if (this.useMockData) {
      return this.mockData.generatePosts(projectId);
    }
    return this.api.post<ProcessingJobDto>(`/projects/${projectId}/generate-posts`)
      .pipe(
        map(dto => this.mapProcessingJobDtoToModel(dto))
      );
  }

  schedulePosts(projectId: string, postIds: string[], scheduledTime?: Date): Observable<{ message: string }> {
    if (this.useMockData) {
      // Mock implementation - return empty array for now
      return of({ message: 'Posts scheduled successfully' }).pipe(delay(300));
    }
    
    const scheduleItems = postIds.map(postId => ({
      postId,
      scheduledTime: scheduledTime?.toISOString() || new Date().toISOString()
    }));
    
    return this.api.post<{ message: string }>(`/projects/${projectId}/schedule-posts`, scheduleItems);
  }

  publishNow(projectId: string, postIds: string[]): Observable<{ message: string; queuedCount: number; jobIds: string[] }> {
    if (this.useMockData) {
      return of({ message: 'Posts queued for publishing', queuedCount: postIds.length, jobIds: [] }).pipe(delay(300));
    }
    return this.api.post<{ message: string; queuedCount: number; jobIds: string[] }>(`/projects/${projectId}/publish-now`, {
      postIds,
      publishToAllPlatforms: true
    });
  }

  getProjectInsights(projectId: string): Observable<Insight[]> {
    if (this.useMockData) {
      return this.mockData.getProject(projectId).pipe(
        map(project => project.insights || [])
      );
    }
    return this.api.get<{ data: InsightDto[]; total: number }>(`/projects/${projectId}/insights`)
      .pipe(
        map(response => this.mapInsightDtosToModels(response.data))
      );
  }

  updateInsight(projectId: string, insightId: string, data: Partial<Insight>): Observable<Insight> {
    if (this.useMockData) {
      // Simple mock - just return the updated insight
      return of({ id: insightId, ...data } as Insight).pipe(delay(300));
    }
    return this.api.patch<any>(`/projects/${projectId}/insights/${insightId}`, {
      reviewNote: data.reviewNote
    }).pipe(
      switchMap(() => this.getProjectInsights(projectId)),
      map(insights => insights.find(i => i.id === insightId)!)
    );
  }

  approveInsights(projectId: string, insightIds: string[]): Observable<any[]> {
    if (this.useMockData) {
      return this.mockData.approveInsights(projectId, insightIds);
    }
    return this.api.post<any[]>(`/projects/${projectId}/approve-insights`, insightIds);
  }

  getProjectPosts(projectId: string): Observable<Post[]> {
    if (this.useMockData) {
      return this.mockData.getProject(projectId).pipe(
        map(project => project.posts || [])
      );
    }
    return this.api.get<{ data: PostDto[]; total: number }>(`/projects/${projectId}/posts`)
      .pipe(
        map(response => this.mapPostDtosToModels(response.data))
      );
  }

  updatePost(projectId: string, postId: string, data: Partial<Post>): Observable<Post> {
    if (this.useMockData) {
      return of({ id: postId, ...data } as Post).pipe(delay(300));
    }
    return this.api.patch<any>(`/projects/${projectId}/posts/${postId}`, {
      reviewNote: data.reviewNote
    }).pipe(
      switchMap(() => this.getProjectPosts(projectId)),
      map(posts => posts.find(p => p.id === postId)!)
    );
  }

  approvePosts(projectId: string, postIds: string[]): Observable<any[]> {
    if (this.useMockData) {
      return this.mockData.approvePosts(projectId, postIds);
    }
    return this.api.post<any[]>(`/projects/${projectId}/approve-posts`, postIds);
  }

  getDashboard(): Observable<DashboardDto> {
    if (this.useMockData) {
      return this.mockData.getDashboardData().pipe(
        map(mockData => this.mapMockDashboardToDashboardDto(mockData))
      );
    }
    return this.api.get<DashboardDto>('/dashboard');
  }

  getActionItems(): Observable<ContentProject[]> {
    if (this.useMockData) {
      return this.mockData.getActionItems();
    }
    return this.api.get<{ data: ContentProjectDto[] }>('/dashboard/project-overview')
      .pipe(
        map(response => this.mapProjectDtosToModels(response.data))
      );
  }

  setCurrentProject(project: ContentProject | null): void {
    this.currentProjectSubject.next(project);
    this.currentProject.set(project);
  }

  // Mapper functions to convert DTOs to models
  private mapProjectDtosToModels(dtos: ContentProjectDto[]): ContentProject[] {
    return dtos.map(dto => ({
      id: dto.id,
      title: dto.title,
      description: dto.description,
      tags: dto.tags,
      sourceType: dto.sourceType,
      sourceUrl: dto.sourceUrl,
      fileName: dto.fileName,
      currentStage: dto.currentStage as ProjectStage,
      overallProgress: dto.overallProgress,
      createdBy: dto.createdBy,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      lastActivityAt: dto.lastActivityAt ? new Date(dto.lastActivityAt) : undefined,
      autoApprovalSettings: dto.autoApprovalSettings,
      publishingSchedule: dto.publishingSchedule,
      targetPlatforms: dto.targetPlatforms,
      summary: dto.summary,
      transcriptId: dto.transcriptId,
      insightIds: dto.insightIds,
      postIds: dto.postIds,
      scheduledPostIds: dto.scheduledPostIds
    }));
  }

  private mapProjectDetailDtoToModel(dto: ContentProjectDetailDto): ContentProject {
    const base = this.mapProjectDtosToModels([dto])[0];
    return {
      ...base,
      transcript: dto.transcript,
      insights: this.mapInsightSummariesToInsights(dto.insights),
      posts: this.mapPostSummariesToPosts(dto.posts),
      scheduledPosts: dto.scheduledPosts,
      recentActivities: dto.recentActivities
    };
  }

  private mapInsightDtosToModels(dtos: InsightDto[]): Insight[] {
    return dtos.map(dto => ({
      id: dto.id,
      projectId: dto.projectId,
      title: dto.title,
      content: dto.content,
      summary: dto.summary,
      category: dto.category,
      postType: dto.postType,
      verbatimQuote: dto.verbatimQuote,
      tags: dto.tags,
      confidenceScore: dto.confidenceScore,
      urgencyScore: dto.urgencyScore,
      relatabilityScore: dto.relatabilityScore,
      specificityScore: dto.specificityScore,
      authorityScore: dto.authorityScore,
      totalScore: dto.totalScore,
      status: dto.status,
      rejectionReason: dto.rejectionReason,
      metadata: dto.metadata,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt)
    }));
  }

  private mapInsightSummariesToInsights(summaries: InsightSummary[]): Insight[] {
    return summaries.map(summary => ({
      id: summary.id,
      projectId: '',
      title: summary.title,
      content: '',
      summary: '',
      category: summary.category,
      postType: summary.postType,
      verbatimQuote: '',
      tags: [],
      confidenceScore: 0,
      urgencyScore: 0,
      relatabilityScore: 0,
      specificityScore: 0,
      authorityScore: 0,
      totalScore: summary.totalScore,
      status: summary.status,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  }

  private mapPostDtosToModels(dtos: PostDto[]): Post[] {
    return dtos.map(dto => ({
      id: dto.id,
      projectId: dto.projectId,
      insightId: dto.insightId,
      title: dto.title,
      content: dto.content,
      hashtags: dto.hashtags,
      platform: dto.platform,
      characterCount: dto.characterCount,
      status: dto.status,
      rejectionReason: dto.rejectionReason,
      metadata: dto.metadata,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt)
    }));
  }

  private mapPostSummariesToPosts(summaries: PostSummary[]): Post[] {
    return summaries.map(summary => ({
      id: summary.id,
      projectId: '',
      insightId: summary.insightId,
      title: summary.title,
      content: '',
      platform: summary.platform,
      characterCount: summary.characterCount || 0,
      status: summary.status,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  }

  private mapProcessingJobDtoToModel(dto: ProcessingJobDto): ProcessingJob {
    return {
      id: dto.jobIds?.[0] || '',
      type: 'processing',
      status: dto.success ? 'completed' : 'failed',
      progress: dto.success ? 100 : 0,
      message: dto.message,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: dto.success ? new Date() : undefined,
      result: dto
    };
  }

  private mapMockDashboardToDashboardDto(mockData: any): DashboardDto {
    return {
      overview: {
        totalProjects: mockData.projectOverview.total,
        projectsByStage: mockData.projectOverview.byStage,
        insightsNeedingReview: mockData.actionItems.insightsNeedingReview,
        postsNeedingReview: mockData.actionItems.postsNeedingReview,
        postsReadyToSchedule: mockData.actionItems.readyToSchedule,
        postsPublishedToday: 0
      },
      actionItems: [],
      recentActivities: []
    };
  }
}