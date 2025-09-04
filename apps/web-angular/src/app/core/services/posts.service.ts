import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { SocialPlatform, PostDto, ApprovePostDto, RejectPostsDto, ScheduleItem, PublishNowDto } from '../models/api-dtos';
import { Post } from '../models/project.model';

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BulkApproveRequest {
  postIds: string[];
  reviewNote?: string;
  autoSchedule?: boolean;
}

export interface BulkRejectRequest {
  postIds: string[];
  rejectionReason?: string;
  regenerateFromInsights?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PostsService {
  private readonly api = inject(ApiService);
  private readonly useMockData = environment.useMockData;
  
  // Loading and error states
  public isLoading = signal<boolean>(false);
  public error = signal<string | null>(null);

  /**
   * Get posts for a specific project
   */
  getProjectPosts(projectId: string): Observable<Result<Post[]>> {
    if (!projectId) {
      return of({
        success: false,
        error: 'Project ID is required'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    return this.api.get<{ data: PostDto[]; total: number }>(`/projects/${projectId}/posts`).pipe(
      map(response => {
        const posts = this.mapPostDtosToModels(response.data);
        return {
          success: true,
          data: posts
        };
      }),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to fetch project posts:', error);
        this.error.set(error.message || 'Failed to fetch posts');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Failed to fetch posts'
        });
      })
    );
  }

  /**
   * Get single post by ID (via project context)
   */
  getPost(projectId: string, id: string): Observable<Result<Post>> {
    if (!projectId || !id) {
      return of({
        success: false,
        error: 'Project ID and Post ID are required'
      });
    }

    return this.getProjectPosts(projectId).pipe(
      map(result => {
        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Failed to fetch posts'
          };
        }

        const post = result.data.find(p => p.id === id);
        if (!post) {
          return {
            success: false,
            error: 'Post not found'
          };
        }

        return {
          success: true,
          data: post
        };
      })
    );
  }

  /**
   * Update existing post
   */
  updatePost(
    projectId: string,
    postId: string,
    data: ApprovePostDto
  ): Observable<Result<void>> {
    if (!projectId || !postId) {
      return of({
        success: false,
        error: 'Project ID and Post ID are required'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    return this.api.patch<void>(`/projects/${projectId}/posts/${postId}`, data).pipe(
      map(() => ({
        success: true
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to update post:', error);
        this.error.set(error.message || 'Unable to update post');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to update post. Please try again.'
        });
      })
    );
  }

  /**
   * Generate posts for a project
   */
  generatePosts(projectId: string): Observable<Result<{ message: string }>> {
    if (!projectId) {
      return of({
        success: false,
        error: 'Project ID is required'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    return this.api.post<{ message: string }>(`/projects/${projectId}/generate-posts`).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to generate posts:', error);
        this.error.set(error.message || 'Failed to generate posts');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to generate posts. Please try again.'
        });
      })
    );
  }

  /**
   * Approve multiple posts
   */
  approvePosts(
    projectId: string,
    postIds: string[],
    reviewNote?: string,
    autoSchedule?: boolean
  ): Observable<Result<any[]>> {
    if (!projectId) {
      return of({
        success: false,
        error: 'Project ID is required'
      });
    }
    if (!postIds || postIds.length === 0) {
      return of({
        success: false,
        error: 'At least one post must be selected'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    return this.api.post<any[]>(`/projects/${projectId}/approve-posts`, postIds).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to approve posts:', error);
        this.error.set(error.message || 'Failed to approve posts');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to approve posts. Please try again.'
        });
      })
    );
  }

  /**
   * Reject multiple posts
   */
  rejectPosts(
    projectId: string,
    postIds: string[],
    rejectionReason?: string,
    regenerateFromInsights?: boolean
  ): Observable<Result<{ rejectedCount: number }>> {
    if (!projectId) {
      return of({
        success: false,
        error: 'Project ID is required'
      });
    }
    if (!postIds || postIds.length === 0) {
      return of({
        success: false,
        error: 'At least one post must be selected'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    const rejectDto: RejectPostsDto = {
      postIds,
      rejectionReason,
      regenerateFromInsights
    };

    return this.api.post<{ message: string; rejectedCount: number }>(`/projects/${projectId}/reject-posts`, rejectDto).pipe(
      map(response => ({
        success: true,
        data: { rejectedCount: response.rejectedCount }
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to reject posts:', error);
        this.error.set(error.message || 'Failed to reject posts');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to reject posts. Please try again.'
        });
      })
    );
  }

  /**
   * Schedule posts
   */
  schedulePosts(
    projectId: string,
    scheduleItems: ScheduleItem[]
  ): Observable<Result<{ message: string }>> {
    if (!projectId) {
      return of({
        success: false,
        error: 'Project ID is required'
      });
    }
    if (!scheduleItems || scheduleItems.length === 0) {
      return of({
        success: false,
        error: 'At least one post must be scheduled'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    return this.api.post<{ message: string }>(`/projects/${projectId}/schedule-posts`, scheduleItems).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to schedule posts:', error);
        this.error.set(error.message || 'Failed to schedule posts');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to schedule posts. Please try again.'
        });
      })
    );
  }

  /**
   * Publish posts immediately
   */
  publishNow(
    projectId: string,
    postIds: string[]
  ): Observable<Result<{ message: string; queuedCount: number; jobIds: string[] }>> {
    if (!projectId) {
      return of({
        success: false,
        error: 'Project ID is required'
      });
    }
    if (!postIds || postIds.length === 0) {
      return of({
        success: false,
        error: 'At least one post must be selected'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    const publishDto: PublishNowDto = {
      postIds,
      publishToAllPlatforms: true
    };

    return this.api.post<{ message: string; queuedCount: number; jobIds: string[] }>(`/projects/${projectId}/publish-now`, publishDto).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to publish posts:', error);
        this.error.set(error.message || 'Failed to publish posts');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to publish posts. Please try again.'
        });
      })
    );
  }

  /**
   * Helper method to map DTOs to models
   */
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

  /**
   * Helper method to sanitize input
   */
  private sanitizeInput(input: string): string {
    if (!input) return '';
    return input.trim()
      .replace(/\s+/g, ' '); // Normalize whitespace
  }
}