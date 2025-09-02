import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export enum TranscriptStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED'
}

export interface TranscriptView {
  id: string;
  title: string;
  content: string;
  status: TranscriptStatus;
  sourceUrl?: string | null;
  fileName?: string | null;
  duration?: number | null;
  wordCount?: number | null;
  insightCount?: number;
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
export class TranscriptsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`;

  /**
   * Get all transcripts
   */
  getTranscripts(): Observable<Result<TranscriptView[]>> {
    return this.http.get<any>(`${this.apiUrl}/transcripts`).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to fetch transcripts'
          };
        }

        // Convert date strings to Date objects
        const transcripts = response.data?.map((transcript: any) => ({
          ...transcript,
          createdAt: new Date(transcript.createdAt),
          updatedAt: new Date(transcript.updatedAt),
        })) || [];

        return {
          success: true,
          data: transcripts
        };
      }),
      catchError(error => {
        console.error('Failed to fetch transcripts:', error);
        return of({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      })
    );
  }

  /**
   * Get single transcript by ID
   */
  getTranscript(id: string): Observable<Result<TranscriptView>> {
    if (!id) {
      return of({
        success: false,
        error: 'Transcript ID is required'
      });
    }

    return this.http.get<any>(`${this.apiUrl}/transcripts/${id}`).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to fetch transcript'
          };
        }

        if (!response.data) {
          return {
            success: false,
            error: 'Transcript not found'
          };
        }

        // Convert date strings to Date objects
        const transcript = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
        };

        return {
          success: true,
          data: transcript
        };
      }),
      catchError(error => {
        console.error('Failed to fetch transcript:', error);
        return of({
          success: false,
          error: 'Unable to load transcript. Please try again.'
        });
      })
    );
  }

  /**
   * Create new transcript
   */
  createTranscript(data: {
    title: string;
    content: string;
    sourceUrl?: string;
    fileName?: string;
  }): Observable<Result<TranscriptView>> {
    // Sanitize inputs
    const sanitizedData = {
      ...data,
      title: this.sanitizeInput(data.title),
      content: this.sanitizeInput(data.content),
      sourceUrl: data.sourceUrl ? this.sanitizeInput(data.sourceUrl) : undefined,
      fileName: data.fileName ? this.sanitizeInput(data.fileName) : undefined,
    };

    return this.http.post<any>(`${this.apiUrl}/transcripts`, sanitizedData).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to create transcript'
          };
        }

        if (!response.data) {
          return {
            success: false,
            error: 'No data returned from server'
          };
        }

        // Convert date strings to Date objects
        const transcript = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
        };

        return {
          success: true,
          data: transcript
        };
      }),
      catchError(error => {
        console.error('Failed to create transcript:', error);
        return of({
          success: false,
          error: 'Unable to create transcript. Please try again.'
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
      content?: string;
      status?: string;
    }
  ): Observable<Result<TranscriptView>> {
    if (!id) {
      return of({
        success: false,
        error: 'Transcript ID is required'
      });
    }

    // Sanitize inputs
    const sanitizedData = { ...data };
    if (sanitizedData.title) sanitizedData.title = this.sanitizeInput(sanitizedData.title);
    if (sanitizedData.content) sanitizedData.content = this.sanitizeInput(sanitizedData.content);

    return this.http.patch<any>(`${this.apiUrl}/transcripts/${id}`, sanitizedData).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to update transcript'
          };
        }

        if (!response.data) {
          return {
            success: false,
            error: 'No data returned from server'
          };
        }

        // Convert date strings to Date objects
        const transcript = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
        };

        return {
          success: true,
          data: transcript
        };
      }),
      catchError(error => {
        console.error('Failed to update transcript:', error);
        return of({
          success: false,
          error: 'Unable to update transcript. Please try again.'
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

    return this.http.delete<any>(`${this.apiUrl}/transcripts/${id}`).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to delete transcript'
          };
        }

        return {
          success: true,
          data: { id }
        };
      }),
      catchError(error => {
        console.error('Failed to delete transcript:', error);
        return of({
          success: false,
          error: 'Unable to delete transcript. Please try again.'
        });
      })
    );
  }

  /**
   * Process transcript
   */
  processTranscript(id: string): Observable<Result<{ jobId: string }>> {
    if (!id) {
      return of({
        success: false,
        error: 'Transcript ID is required'
      });
    }

    return this.http.post<any>(`${this.apiUrl}/transcripts/${id}/process`, {}).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to process transcript'
          };
        }

        return {
          success: true,
          data: response.data
        };
      }),
      catchError(error => {
        console.error('Failed to process transcript:', error);
        return of({
          success: false,
          error: 'Unable to process transcript. Please try again.'
        });
      })
    );
  }

  /**
   * Extract insights from transcript
   */
  extractInsights(id: string): Observable<Result<{ jobId: string }>> {
    if (!id) {
      return of({
        success: false,
        error: 'Transcript ID is required'
      });
    }

    return this.http.post<any>(`${this.apiUrl}/transcripts/${id}/extract-insights`, {}).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to extract insights'
          };
        }

        return {
          success: true,
          data: response.data
        };
      }),
      catchError(error => {
        console.error('Failed to extract insights:', error);
        return of({
          success: false,
          error: 'Unable to extract insights. Please try again.'
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