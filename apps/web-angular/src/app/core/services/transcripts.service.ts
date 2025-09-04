import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { TranscriptDto, CreateTranscriptDto, UpdateTranscriptDto, TranscriptStatus } from '../models/api-dtos';

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Transcript {
  id: string;
  projectId: string;
  title: string;
  rawContent: string;
  cleanedContent?: string;
  status: TranscriptStatus;
  sourceType: string;
  sourceUrl?: string;
  fileName?: string;
  wordCount: number;
  duration?: number;
  processingDurationMs?: number;
  estimatedTokens?: number;
  estimatedCost?: number;
  queueJobId?: string;
  errorMessage?: string;
  failedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTranscriptRequest {
  title: string;
  content: string;
  sourceType?: string;
  sourceUrl?: string;
  fileName?: string;
  duration?: number;
  projectId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranscriptsService {
  private readonly api = inject(ApiService);
  private readonly useMockData = environment.useMockData;
  
  // Loading and error states
  public isLoading = signal<boolean>(false);
  public error = signal<string | null>(null);

  /**
   * Get transcripts for a specific project
   */
  getProjectTranscripts(projectId: string): Observable<Result<Transcript[]>> {
    if (!projectId) {
      return of({
        success: false,
        error: 'Project ID is required'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    return this.api.get<{ data: TranscriptDto[]; total: number }>(`/projects/${projectId}/transcripts`).pipe(
      map(response => {
        const transcripts = this.mapTranscriptDtosToModels(response.data);
        return {
          success: true,
          data: transcripts
        };
      }),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to fetch project transcripts:', error);
        this.error.set(error.message || 'Failed to fetch transcripts');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Failed to fetch transcripts'
        });
      })
    );
  }

  /**
   * Get single transcript by ID (via project context)
   */
  getTranscript(projectId: string, id: string): Observable<Result<Transcript>> {
    if (!projectId || !id) {
      return of({
        success: false,
        error: 'Project ID and Transcript ID are required'
      });
    }

    return this.getProjectTranscripts(projectId).pipe(
      map(result => {
        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Failed to fetch transcripts'
          };
        }

        const transcript = result.data.find(t => t.id === id);
        if (!transcript) {
          return {
            success: false,
            error: 'Transcript not found'
          };
        }

        return {
          success: true,
          data: transcript
        };
      })
    );
  }

  /**
   * Create new transcript for a project
   */
  createTranscript(
    projectId: string,
    data: CreateTranscriptRequest
  ): Observable<Result<Transcript>> {
    if (!projectId) {
      return of({
        success: false,
        error: 'Project ID is required'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    // Sanitize inputs
    const sanitizedData: CreateTranscriptDto = {
      title: this.sanitizeInput(data.title),
      rawContent: this.sanitizeInput(data.content),
      sourceType: data.sourceType || 'Manual',
      sourceUrl: data.sourceUrl ? this.sanitizeInput(data.sourceUrl) : undefined,
      fileName: data.fileName ? this.sanitizeInput(data.fileName) : undefined,
      duration: data.duration,
      projectId
    };

    return this.api.post<TranscriptDto>(`/projects/${projectId}/transcripts`, sanitizedData).pipe(
      map(response => {
        const transcript = this.mapTranscriptDtoToModel(response);
        return {
          success: true,
          data: transcript
        };
      }),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to create transcript:', error);
        this.error.set(error.message || 'Unable to create transcript');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to create transcript. Please try again.'
        });
      })
    );
  }

  /**
   * Update existing transcript
   */
  updateTranscript(
    id: string,
    data: {
      title?: string;
      rawContent?: string;
      cleanedContent?: string;
    }
  ): Observable<Result<void>> {
    if (!id) {
      return of({
        success: false,
        error: 'Transcript ID is required'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    // Sanitize inputs
    const sanitizedData: UpdateTranscriptDto = {};
    if (data.title) sanitizedData.title = this.sanitizeInput(data.title);
    if (data.rawContent) sanitizedData.rawContent = this.sanitizeInput(data.rawContent);
    if (data.cleanedContent) sanitizedData.cleanedContent = this.sanitizeInput(data.cleanedContent);

    return this.api.patch<void>(`/transcripts/${id}`, sanitizedData).pipe(
      map(() => ({
        success: true
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to update transcript:', error);
        this.error.set(error.message || 'Unable to update transcript');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to update transcript. Please try again.'
        });
      })
    );
  }

  /**
   * Delete transcript
   */
  deleteTranscript(id: string): Observable<Result<{ id: string }>> {
    if (!id) {
      return of({
        success: false,
        error: 'Transcript ID is required'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    return this.api.delete<void>(`/transcripts/${id}`).pipe(
      map(() => ({
        success: true,
        data: { id }
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to delete transcript:', error);
        this.error.set(error.message || 'Unable to delete transcript');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to delete transcript. Please try again.'
        });
      })
    );
  }

  /**
   * Process transcript content for a project
   */
  processContent(projectId: string): Observable<Result<{ message: string }>> {
    if (!projectId) {
      return of({
        success: false,
        error: 'Project ID is required'
      });
    }

    this.isLoading.set(true);
    this.error.set(null);

    return this.api.post<{ message: string }>(`/projects/${projectId}/process-content`).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to process content:', error);
        this.error.set(error.message || 'Failed to process content');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to process content. Please try again.'
        });
      })
    );
  }

  /**
   * Helper method to map DTOs to models
   */
  private mapTranscriptDtosToModels(dtos: TranscriptDto[]): Transcript[] {
    return dtos.map(dto => this.mapTranscriptDtoToModel(dto));
  }

  private mapTranscriptDtoToModel(dto: TranscriptDto): Transcript {
    return {
      id: dto.id,
      projectId: dto.projectId,
      title: dto.title,
      rawContent: dto.rawContent,
      cleanedContent: dto.cleanedContent,
      status: dto.status,
      sourceType: dto.sourceType,
      sourceUrl: dto.sourceUrl,
      fileName: dto.fileName,
      wordCount: dto.wordCount,
      duration: dto.duration,
      processingDurationMs: dto.processingDurationMs,
      estimatedTokens: dto.estimatedTokens,
      estimatedCost: dto.estimatedCost,
      queueJobId: dto.queueJobId,
      errorMessage: dto.errorMessage,
      failedAt: dto.failedAt ? new Date(dto.failedAt) : undefined,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt)
    };
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