import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export enum InsightStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface InsightView {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: InsightStatus;
  scores: Record<string, number>;
  transcriptId: string;
  transcriptTitle?: string;
  verbatimQuotes: string[];
  postTypes: string[];
  postCount?: number;
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
export class InsightsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`;

  /**
   * Get all insights
   */
  getInsights(): Observable<Result<InsightView[]>> {
    return this.http.get<any>(`${this.apiUrl}/insights`).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to fetch insights'
          };
        }

        // Convert date strings to Date objects
        const insights = response.data?.map((insight: any) => ({
          ...insight,
          createdAt: new Date(insight.createdAt),
          updatedAt: new Date(insight.updatedAt),
        })) || [];

        return {
          success: true,
          data: insights
        };
      }),
      catchError(error => {
        console.error('Failed to fetch insights:', error);
        return of({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      })
    );
  }

  /**
   * Get single insight by ID
   */
  getInsight(id: string): Observable<Result<InsightView>> {
    if (!id) {
      return of({
        success: false,
        error: 'Insight ID is required'
      });
    }

    return this.http.get<any>(`${this.apiUrl}/insights/${id}`).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to fetch insight'
          };
        }

        if (!response.data) {
          return {
            success: false,
            error: 'Insight not found'
          };
        }

        // Convert date strings to Date objects
        const insight = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
        };

        return {
          success: true,
          data: insight
        };
      }),
      catchError(error => {
        console.error('Failed to fetch insight:', error);
        return of({
          success: false,
          error: 'Unable to load insight. Please try again.'
        });
      })
    );
  }

  /**
   * Update existing insight
   */
  updateInsight(
    id: string,
    data: {
      title?: string;
      summary?: string;
      category?: string;
      status?: string;
      scores?: Record<string, number>;
    }
  ): Observable<Result<InsightView>> {
    if (!id) {
      return of({
        success: false,
        error: 'Insight ID is required'
      });
    }

    // Sanitize inputs
    const sanitizedData = { ...data };
    if (sanitizedData.title) sanitizedData.title = this.sanitizeInput(sanitizedData.title);
    if (sanitizedData.summary) sanitizedData.summary = this.sanitizeInput(sanitizedData.summary);
    if (sanitizedData.category) sanitizedData.category = this.sanitizeInput(sanitizedData.category);

    return this.http.patch<any>(`${this.apiUrl}/insights/${id}`, sanitizedData).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to update insight'
          };
        }

        if (!response.data) {
          return {
            success: false,
            error: 'No data returned from server'
          };
        }

        // Convert date strings to Date objects
        const insight = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
        };

        return {
          success: true,
          data: insight
        };
      }),
      catchError(error => {
        console.error('Failed to update insight:', error);
        return of({
          success: false,
          error: 'Unable to update insight. Please try again.'
        });
      })
    );
  }

  /**
   * Delete insight
   */
  deleteInsight(id: string): Observable<Result<{ id: string }>> {
    if (!id) {
      return of({
        success: false,
        error: 'Insight ID is required'
      });
    }

    return this.http.delete<any>(`${this.apiUrl}/insights/${id}`).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to delete insight'
          };
        }

        return {
          success: true,
          data: { id }
        };
      }),
      catchError(error => {
        console.error('Failed to delete insight:', error);
        return of({
          success: false,
          error: 'Unable to delete insight. Please try again.'
        });
      })
    );
  }

  /**
   * Bulk update insights
   */
  bulkUpdateInsights(
    action: string,
    insightIds: string[]
  ): Observable<Result<{ action: string; affectedCount: number }>> {
    if (!action) {
      return of({
        success: false,
        error: 'Action is required'
      });
    }
    if (!insightIds || insightIds.length === 0) {
      return of({
        success: false,
        error: 'At least one insight must be selected'
      });
    }

    return this.http.post<any>(`${this.apiUrl}/insights/bulk`, {
      action,
      insightIds
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
            affectedCount: insightIds.length
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
   * Generate posts from insights
   */
  generatePosts(insightIds: string[]): Observable<Result<{ jobId: string }>> {
    if (!insightIds || insightIds.length === 0) {
      return of({
        success: false,
        error: 'At least one insight must be selected'
      });
    }

    return this.http.post<any>(`${this.apiUrl}/insights/generate-posts`, {
      insightIds
    }).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to generate posts'
          };
        }

        return {
          success: true,
          data: response.data
        };
      }),
      catchError(error => {
        console.error('Failed to generate posts:', error);
        return of({
          success: false,
          error: 'Unable to generate posts. Please try again.'
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
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/\s+/g, ' '); // Normalize whitespace
  }
}