import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardCounts {
  transcripts: {
    total: number;
    processing: number;
    processed: number;
    failed: number;
  };
  insights: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  posts: {
    total: number;
    draft: number;
    approved: number;
    scheduled: number;
    published: number;
  };
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  entityType: 'transcript' | 'insight' | 'post';
  entityId: string;
  status?: string;
}

export interface PerformanceMetrics {
  processingTime: number;
  successRate: number;
  totalProcessed: number;
  avgInsightsPerTranscript: number;
  avgPostsPerInsight: number;
}

export interface DashboardData {
  counts: DashboardCounts;
  activity: ActivityItem[];
  performance: PerformanceMetrics;
  upcomingPosts: any[];
  actionableItems: {
    transcriptsToProcess: number;
    insightsToReview: number;
    postsToApprove: number;
    postsToSchedule: number;
  };
}

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`;

  /**
   * Fetch comprehensive dashboard data
   */
  getDashboard(): Observable<Result<DashboardData>> {
    return this.http.get<any>(`${this.apiUrl}/dashboard`).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to fetch dashboard data'
          };
        }

        if (!response.data) {
          return {
            success: false,
            error: 'No dashboard data available'
          };
        }

        // Transform activity timestamps to Date objects
        if (response.data.activity) {
          response.data.activity = response.data.activity.map((item: ActivityItem) => ({
            ...item,
            timestamp: new Date(item.timestamp).toISOString(),
          }));
        }

        return {
          success: true,
          data: response.data
        };
      }),
      catchError(error => {
        console.error('Failed to fetch dashboard data:', error);
        return of({
          success: false,
          error: 'Unable to load dashboard. Please try again.'
        });
      })
    );
  }

  /**
   * Fetch dashboard counts only (lighter endpoint for counts)
   */
  getDashboardCounts(): Observable<Result<DashboardCounts>> {
    return this.http.get<any>(`${this.apiUrl}/dashboard`).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to fetch dashboard counts'
          };
        }

        if (!response.data?.counts) {
          return {
            success: false,
            error: 'No counts data available'
          };
        }

        return {
          success: true,
          data: response.data.counts
        };
      }),
      catchError(error => {
        console.error('Failed to fetch dashboard counts:', error);
        return of({
          success: false,
          error: 'Unable to load dashboard counts. Please try again.'
        });
      })
    );
  }

  /**
   * Get actionable items for the dashboard
   */
  getActionableItems(): Observable<Result<any>> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/actionable`).pipe(
      map(response => {
        if (!response.success) {
          return {
            success: false,
            error: response.error || 'Failed to fetch actionable items'
          };
        }

        if (!response.data) {
          return {
            success: false,
            error: 'No actionable items available'
          };
        }

        return {
          success: true,
          data: response.data
        };
      }),
      catchError(error => {
        console.error('Failed to fetch actionable items:', error);
        return of({
          success: false,
          error: 'Unable to load actionable items. Please try again.'
        });
      })
    );
  }
}