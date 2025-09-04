import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { InsightDto, InsightStatus, ApproveInsightDto, RejectInsightsDto } from '../models/api-dtos';
import { Insight } from '../models/project.model';

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BulkApproveRequest {
  insightIds: string[];
  reviewNote?: string;
}

export interface BulkRejectRequest {
  insightIds: string[];
  rejectionReason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InsightsService {
  private readonly api = inject(ApiService);
  private readonly useMockData = environment.useMockData;
  
  // Loading and error states
  public isLoading = signal<boolean>(false);
  public error = signal<string | null>(null);

  /**
   * Get insights for a specific project
   */
  getProjectInsights(projectId: string): Observable<Result<Insight[]>> {
    if (!projectId) {
      return of({
        success: false,
        error: 'Project ID is required'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    return this.api.get<{ data: InsightDto[]; total: number }>(`/projects/${projectId}/insights`).pipe(
      map(response => {
        const insights = this.mapInsightDtosToModels(response.data);
        return {
          success: true,
          data: insights
        };
      }),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to fetch project insights:', error);
        this.error.set(error.message || 'Failed to fetch insights');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Failed to fetch insights'
        });
      })
    );
  }

  /**
   * Get single insight by ID (via project context)
   */
  getInsight(projectId: string, id: string): Observable<Result<Insight>> {
    if (!projectId || !id) {
      return of({
        success: false,
        error: 'Project ID and Insight ID are required'
      });
    }

    return this.getProjectInsights(projectId).pipe(
      map(result => {
        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Failed to fetch insights'
          };
        }

        const insight = result.data.find(i => i.id === id);
        if (!insight) {
          return {
            success: false,
            error: 'Insight not found'
          };
        }

        return {
          success: true,
          data: insight
        };
      })
    );
  }

  /**
   * Update existing insight
   */
  updateInsight(
    projectId: string,
    insightId: string,
    data: ApproveInsightDto
  ): Observable<Result<void>> {
    if (!projectId || !insightId) {
      return of({
        success: false,
        error: 'Project ID and Insight ID are required'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    return this.api.patch<void>(`/projects/${projectId}/insights/${insightId}`, data).pipe(
      map(() => ({
        success: true
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to update insight:', error);
        this.error.set(error.message || 'Unable to update insight');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to update insight. Please try again.'
        });
      })
    );
  }

  /**
   * Approve multiple insights
   */
  approveInsights(
    projectId: string,
    insightIds: string[],
    reviewNote?: string
  ): Observable<Result<any[]>> {
    if (!projectId) {
      return of({
        success: false,
        error: 'Project ID is required'
      });
    }
    if (!insightIds || insightIds.length === 0) {
      return of({
        success: false,
        error: 'At least one insight must be selected'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    return this.api.post<any[]>(`/projects/${projectId}/approve-insights`, insightIds).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to approve insights:', error);
        this.error.set(error.message || 'Failed to approve insights');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to approve insights. Please try again.'
        });
      })
    );
  }

  /**
   * Reject multiple insights
   */
  rejectInsights(
    projectId: string,
    insightIds: string[],
    rejectionReason?: string
  ): Observable<Result<{ rejectedCount: number }>> {
    if (!projectId) {
      return of({
        success: false,
        error: 'Project ID is required'
      });
    }
    if (!insightIds || insightIds.length === 0) {
      return of({
        success: false,
        error: 'At least one insight must be selected'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    const rejectDto: RejectInsightsDto = {
      insightIds,
      rejectionReason
    };

    return this.api.post<{ message: string; rejectedCount: number }>(`/projects/${projectId}/reject-insights`, rejectDto).pipe(
      map(response => ({
        success: true,
        data: { rejectedCount: response.rejectedCount }
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to reject insights:', error);
        this.error.set(error.message || 'Failed to reject insights');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to reject insights. Please try again.'
        });
      })
    );
  }

  /**
   * Extract insights for a project
   */
  extractInsights(projectId: string): Observable<Result<{ message: string }>> {
    if (!projectId) {
      return of({
        success: false,
        error: 'Project ID is required'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    return this.api.post<{ message: string }>(`/projects/${projectId}/extract-insights`).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to extract insights:', error);
        this.error.set(error.message || 'Failed to extract insights');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to extract insights. Please try again.'
        });
      })
    );
  }

  /**
   * Helper method to map DTOs to models
   */
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