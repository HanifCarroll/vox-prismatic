import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../stores/auth.store';
import { AuthService } from '../services/auth.service';

/**
 * Functional HTTP interceptor for JWT authentication
 * Automatically adds Authorization header to requests and handles token refresh
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip authentication for certain endpoints
  if (shouldSkipAuth(req.url)) {
    return next(req);
  }

  const token = authStore.accessToken();
  
  // Add Authorization header if token exists
  const authReq = token 
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized responses
      if (error.status === 401 && !isRefreshTokenRequest(req.url)) {
        return handle401Error(authService, router, req, next);
      }
      
      return throwError(() => error);
    })
  );
};

/**
 * Handle 401 errors by attempting to refresh the token
 */
function handle401Error(
  authService: AuthService, 
  router: Router, 
  req: any, 
  next: any
) {
  return authService.refreshToken().pipe(
    switchMap((response) => {
      // Retry the original request with the new token
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${response.accessToken}`
        }
      });
      return next(authReq);
    }),
    catchError((refreshError) => {
      // Refresh failed, redirect to login
      router.navigate(['/login']);
      return throwError(() => refreshError);
    })
  );
}

/**
 * Determine if the request should skip authentication
 */
function shouldSkipAuth(url: string): boolean {
  const skipAuthUrls = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/resend-verification',
    '/health'
  ];

  return skipAuthUrls.some(skipUrl => url.includes(skipUrl));
}

/**
 * Check if the request is for refreshing the token
 */
function isRefreshTokenRequest(url: string): boolean {
  return url.includes('/auth/refresh');
}