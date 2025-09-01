import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WorkflowStats {
  queues: {
    total: number;
    active: number;
    paused: number;
  };
  jobs: {
    active: number;
    waiting: number;
    completed: number;
    failed: number;
    delayed: number;
    total: number;
  };
  processors: {
    active: number;
    idle: number;
  };
  performance: {
    jobsPerMinute: number;
    avgProcessingTime: number;
    successRate: number;
  };
}

export interface SystemHealth {
  redis: boolean;
  queues: {
    publisher: boolean;
    processor?: boolean;
    scheduler?: boolean;
  };
  processors: {
    publisher: boolean;
    processor?: boolean;
    scheduler?: boolean;
  };
}

export interface JobInfo {
  id: string;
  name: string;
  data: any;
  progress: number;
  status: 'active' | 'waiting' | 'completed' | 'failed' | 'delayed';
  timestamp: string;
  attemptsMade?: number;
  failedReason?: string;
  processedOn?: number;
  finishedOn?: number;
}

export interface PipelineInfo {
  id: string;
  transcriptId: string;
  currentStage: string;
  status: string;
  progress: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`;

  /**
   * System operations
   */
  getStats(): Observable<Result<WorkflowStats>> {
    return this.http.get<any>(`${this.apiUrl}/workflow/stats`).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      catchError(error => {
        console.error('Failed to fetch workflow stats:', error);
        return of({
          success: false,
          error: 'Unable to load workflow stats'
        });
      })
    );
  }

  getHealth(): Observable<Result<SystemHealth>> {
    return this.http.get<any>(`${this.apiUrl}/workflow/health`).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      catchError(error => {
        console.error('Failed to fetch system health:', error);
        return of({
          success: false,
          error: 'Unable to load system health'
        });
      })
    );
  }

  pauseAll(): Observable<Result<void>> {
    return this.http.post<any>(`${this.apiUrl}/workflow/pause-all`, {}).pipe(
      map(() => ({
        success: true
      })),
      catchError(error => {
        console.error('Failed to pause processing:', error);
        return of({
          success: false,
          error: 'Unable to pause processing'
        });
      })
    );
  }

  resumeAll(): Observable<Result<void>> {
    return this.http.post<any>(`${this.apiUrl}/workflow/resume-all`, {}).pipe(
      map(() => ({
        success: true
      })),
      catchError(error => {
        console.error('Failed to resume processing:', error);
        return of({
          success: false,
          error: 'Unable to resume processing'
        });
      })
    );
  }

  clearCompleted(): Observable<Result<{ cleared: number }>> {
    return this.http.post<any>(`${this.apiUrl}/workflow/clear-completed`, {}).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      catchError(error => {
        console.error('Failed to clear completed jobs:', error);
        return of({
          success: false,
          error: 'Unable to clear completed jobs'
        });
      })
    );
  }

  clearFailed(): Observable<Result<{ cleared: number }>> {
    return this.http.post<any>(`${this.apiUrl}/workflow/clear-failed`, {}).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      catchError(error => {
        console.error('Failed to clear failed jobs:', error);
        return of({
          success: false,
          error: 'Unable to clear failed jobs'
        });
      })
    );
  }

  retryFailed(): Observable<Result<{ retried: number }>> {
    return this.http.post<any>(`${this.apiUrl}/workflow/retry-failed`, {}).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      catchError(error => {
        console.error('Failed to retry failed jobs:', error);
        return of({
          success: false,
          error: 'Unable to retry failed jobs'
        });
      })
    );
  }

  /**
   * Job operations
   */
  getJobs(status?: 'active' | 'waiting' | 'completed' | 'failed' | 'delayed'): Observable<Result<JobInfo[]>> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<any>(`${this.apiUrl}/workflow/jobs${params}`).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      catchError(error => {
        console.error('Failed to fetch jobs:', error);
        return of({
          success: false,
          error: 'Unable to load jobs'
        });
      })
    );
  }

  getJob(jobId: string): Observable<Result<JobInfo>> {
    return this.http.get<any>(`${this.apiUrl}/workflow/jobs/${jobId}`).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      catchError(error => {
        console.error('Failed to fetch job:', error);
        return of({
          success: false,
          error: 'Unable to load job details'
        });
      })
    );
  }

  retryJob(jobId: string): Observable<Result<void>> {
    return this.http.post<any>(`${this.apiUrl}/workflow/jobs/${jobId}/retry`, {}).pipe(
      map(() => ({
        success: true
      })),
      catchError(error => {
        console.error('Failed to retry job:', error);
        return of({
          success: false,
          error: 'Unable to retry job'
        });
      })
    );
  }

  cancelJob(jobId: string): Observable<Result<void>> {
    return this.http.post<any>(`${this.apiUrl}/workflow/jobs/${jobId}/cancel`, {}).pipe(
      map(() => ({
        success: true
      })),
      catchError(error => {
        console.error('Failed to cancel job:', error);
        return of({
          success: false,
          error: 'Unable to cancel job'
        });
      })
    );
  }

  /**
   * Pipeline operations
   */
  getPipelines(status?: string): Observable<Result<PipelineInfo[]>> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<any>(`${this.apiUrl}/pipelines${params}`).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      catchError(error => {
        console.error('Failed to fetch pipelines:', error);
        return of({
          success: false,
          error: 'Unable to load pipelines'
        });
      })
    );
  }

  getPipeline(pipelineId: string): Observable<Result<PipelineInfo>> {
    return this.http.get<any>(`${this.apiUrl}/pipelines/${pipelineId}`).pipe(
      map(response => ({
        success: true,
        data: response
      })),
      catchError(error => {
        console.error('Failed to fetch pipeline:', error);
        return of({
          success: false,
          error: 'Unable to load pipeline details'
        });
      })
    );
  }

  retryPipeline(pipelineId: string): Observable<Result<void>> {
    return this.http.post<any>(`${this.apiUrl}/pipelines/${pipelineId}/retry`, {}).pipe(
      map(() => ({
        success: true
      })),
      catchError(error => {
        console.error('Failed to retry pipeline:', error);
        return of({
          success: false,
          error: 'Unable to retry pipeline'
        });
      })
    );
  }

  cancelPipeline(pipelineId: string): Observable<Result<void>> {
    return this.http.post<any>(`${this.apiUrl}/pipelines/${pipelineId}/cancel`, {}).pipe(
      map(() => ({
        success: true
      })),
      catchError(error => {
        console.error('Failed to cancel pipeline:', error);
        return of({
          success: false,
          error: 'Unable to cancel pipeline'
        });
      })
    );
  }
}