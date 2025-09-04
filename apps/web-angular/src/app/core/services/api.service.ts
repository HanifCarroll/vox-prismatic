import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Backend response structures (not wrapped in 'data')
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedRequest {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private handleError(error: HttpErrorResponse): Observable<never> {
    const apiError: ApiError = {
      message: error.error?.error || error.error?.message || error.message || 'An error occurred',
      statusCode: error.status || 500,
      error: error.error?.error || error.statusText
    };
    console.error('API Error:', apiError);
    return throwError(() => apiError);
  }

  private buildParams(params?: any): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => {
              httpParams = httpParams.append(key, v.toString());
            });
          } else {
            httpParams = httpParams.set(key, value.toString());
          }
        }
      });
    }
    return httpParams;
  }

  get<T>(endpoint: string, params?: any): Observable<T> {
    const httpParams = this.buildParams(params);
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, { params: httpParams })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Overloaded for paginated responses
  getPaginated<T>(endpoint: string, params?: any): Observable<PaginatedResponse<T>> {
    const httpParams = this.buildParams(params);
    return this.http.get<PaginatedResponse<T>>(`${this.baseUrl}${endpoint}`, { params: httpParams })
      .pipe(
        catchError(this.handleError)
      );
  }

  post<T>(endpoint: string, body?: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body || {})
      .pipe(
        catchError(this.handleError)
      );
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body)
      .pipe(
        catchError(this.handleError)
      );
  }

  patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, body)
      .pipe(
        catchError(this.handleError)
      );
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  upload<T>(endpoint: string, file: File, additionalData?: any): Observable<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    return this.http.post<T>(`${this.baseUrl}${endpoint}`, formData)
      .pipe(
        catchError(this.handleError)
      );
  }
}