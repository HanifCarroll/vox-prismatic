import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Platform } from '../models/project.model';

export enum PostStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED'
}

export interface PostView {
  id: string;
  content: string;
  platform: Platform;
  status: PostStatus;
  characterCount: number;
  insightId: string;
  insightTitle?: string;
  transcriptId?: string;
  transcriptTitle?: string;
  scheduledFor?: Date | null;
  publishedAt?: Date | null;
  mediaUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PostsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`;

  /**
   * Get all posts
   */
  getPosts(): Observable<Result<PostView[]>> {
    return this.http.get<any>(`${this.apiUrl}/posts`).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to fetch posts'
          };
        }

        // Convert date strings to Date objects
        const posts = response.data?.map((post: any) => ({
          ...post,
          createdAt: new Date(post.createdAt),
          updatedAt: new Date(post.updatedAt),
          scheduledFor: post.scheduledFor ? new Date(post.scheduledFor) : null,
          publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
        })) || [];

        return {
          success: true,
          data: posts
        };
      }),
      catchError(error => {
        console.error('Failed to fetch posts:', error);
        return of({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      })
    );
  }

  /**
   * Get single post by ID
   */
  getPost(id: string): Observable<Result<PostView>> {
    if (!id) {
      return of({
        success: false,
        error: 'Post ID is required'
      });
    }

    return this.http.get<any>(`${this.apiUrl}/posts/${id}`).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to fetch post'
          };
        }

        if (!response.data) {
          return {
            success: false,
            error: 'Post not found'
          };
        }

        // Convert date strings to Date objects
        const post = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
          scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
          publishedAt: response.data.publishedAt ? new Date(response.data.publishedAt) : null,
        };

        return {
          success: true,
          data: post
        };
      }),
      catchError(error => {
        console.error('Failed to fetch post:', error);
        return of({
          success: false,
          error: 'Unable to load post. Please try again.'
        });
      })
    );
  }

  /**
   * Update existing post
   */
  updatePost(
    id: string,
    data: {
      content?: string;
      status?: string;
      platform?: string;
      scheduledFor?: Date | null;
      mediaUrls?: string[];
    }
  ): Observable<Result<PostView>> {
    if (!id) {
      return of({
        success: false,
        error: 'Post ID is required'
      });
    }

    // Sanitize content
    const sanitizedData = { ...data };
    if (sanitizedData.content) {
      sanitizedData.content = this.sanitizeInput(sanitizedData.content);
    }

    return this.http.patch<any>(`${this.apiUrl}/posts/${id}`, sanitizedData).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to update post'
          };
        }

        if (!response.data) {
          return {
            success: false,
            error: 'No data returned from server'
          };
        }

        // Convert date strings to Date objects
        const post = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
          scheduledFor: response.data.scheduledFor ? new Date(response.data.scheduledFor) : null,
          publishedAt: response.data.publishedAt ? new Date(response.data.publishedAt) : null,
        };

        return {
          success: true,
          data: post
        };
      }),
      catchError(error => {
        console.error('Failed to update post:', error);
        return of({
          success: false,
          error: 'Unable to update post. Please try again.'
        });
      })
    );
  }

  /**
   * Delete post
   */
  deletePost(id: string): Observable<Result<{ id: string }>> {
    if (!id) {
      return of({
        success: false,
        error: 'Post ID is required'
      });
    }

    return this.http.delete<any>(`${this.apiUrl}/posts/${id}`).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to delete post'
          };
        }

        return {
          success: true,
          data: { id }
        };
      }),
      catchError(error => {
        console.error('Failed to delete post:', error);
        return of({
          success: false,
          error: 'Unable to delete post. Please try again.'
        });
      })
    );
  }

  /**
   * Bulk update posts
   */
  bulkUpdatePosts(
    action: string,
    postIds: string[]
  ): Observable<Result<{ action: string; affectedCount: number }>> {
    if (!action) {
      return of({
        success: false,
        error: 'Action is required'
      });
    }
    if (!postIds || postIds.length === 0) {
      return of({
        success: false,
        error: 'At least one post must be selected'
      });
    }

    return this.http.post<any>(`${this.apiUrl}/posts/bulk`, {
      action,
      postIds
    }).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to perform bulk operation'
          };
        }

        return {
          success: true,
          data: {
            action,
            affectedCount: postIds.length
          }
        };
      }),
      catchError(error => {
        console.error('Failed to perform bulk operation:', error);
        return of({
          success: false,
          error: 'Unable to perform bulk operation. Please try again.'
        });
      })
    );
  }

  /**
   * Schedule posts
   */
  schedulePosts(
    postIds: string[],
    scheduleData: {
      scheduledFor?: Date;
      interval?: number;
      timezone?: string;
    }
  ): Observable<Result<{ scheduledCount: number }>> {
    if (!postIds || postIds.length === 0) {
      return of({
        success: false,
        error: 'At least one post must be selected'
      });
    }

    return this.http.post<any>(`${this.apiUrl}/posts/schedule`, {
      postIds,
      ...scheduleData
    }).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to schedule posts'
          };
        }

        return {
          success: true,
          data: {
            scheduledCount: postIds.length
          }
        };
      }),
      catchError(error => {
        console.error('Failed to schedule posts:', error);
        return of({
          success: false,
          error: 'Unable to schedule posts. Please try again.'
        });
      })
    );
  }

  /**
   * Publish posts immediately
   */
  publishNow(postIds: string[]): Observable<Result<{ publishedCount: number }>> {
    if (!postIds || postIds.length === 0) {
      return of({
        success: false,
        error: 'At least one post must be selected'
      });
    }

    return this.http.post<any>(`${this.apiUrl}/posts/publish-now`, {
      postIds
    }).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to publish posts'
          };
        }

        return {
          success: true,
          data: {
            publishedCount: postIds.length
          }
        };
      }),
      catchError(error => {
        console.error('Failed to publish posts:', error);
        return of({
          success: false,
          error: 'Unable to publish posts. Please try again.'
        });
      })
    );
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