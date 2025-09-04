import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { DashboardDto, ProjectOverviewDto, ActionItemDto, RecentActivityDto } from '../models/api-dtos';

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProjectOverview {
  data: {
    id: string;
    title: string;
    currentStage: string;
    overallProgress: number;
    lastActivityAt?: string;
    insightsCount: number;
    postsCount: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly api = inject(ApiService);
  private readonly useMockData = environment.useMockData;
  
  // Loading and error states
  public isLoading = signal<boolean>(false);
  public error = signal<string | null>(null);

  /**
   * Fetch comprehensive dashboard data
   */
  getDashboard(): Observable<Result<DashboardDto>> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.api.get<DashboardDto>('/dashboard').pipe(
      map(response => ({
        success: true,
        data: response
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to fetch dashboard data:', error);
        this.error.set(error.message || 'Failed to fetch dashboard data');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to load dashboard. Please try again.'
        });
      })
    );
  }

  /**
   * Get project overview for dashboard
   */
  getProjectOverview(): Observable<Result<ProjectOverview>> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.api.get<ProjectOverview>('/dashboard/project-overview').pipe(
      map(response => ({
        success: true,
        data: response
      })),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError(error => {
        console.error('Failed to fetch project overview:', error);
        this.error.set(error.message || 'Failed to fetch project overview');
        this.isLoading.set(false);
        return of({
          success: false,
          error: error.message || 'Unable to load project overview. Please try again.'
        });
      })
    );
  }

  /**
   * Get metrics from dashboard overview
   */
  getMetrics(): Observable<Result<ProjectOverviewDto>> {
    return this.getDashboard().pipe(
      map(result => {
        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Failed to get metrics'
          };
        }

        return {
          success: true,
          data: result.data.overview
        };
      })
    );
  }

  /**
   * Get action items from dashboard
   */
  getActionItems(): Observable<Result<ActionItemDto[]>> {
    return this.getDashboard().pipe(
      map(result => {
        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Failed to get action items'
          };
        }

        return {
          success: true,
          data: result.data.actionItems
        };
      })
    );
  }

  /**
   * Get recent activities from dashboard
   */
  getRecentActivities(): Observable<Result<RecentActivityDto[]>> {
    return this.getDashboard().pipe(
      map(result => {
        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Failed to get recent activities'
          };
        }

        return {
          success: true,
          data: result.data.recentActivities
        };
      })
    );
  }
}