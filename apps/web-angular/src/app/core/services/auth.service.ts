import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError, BehaviorSubject, timer } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { 
  User, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  RefreshTokenRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  LoginCredentials,
  RegisterData
} from '../models/user.model';
import { AuthStore } from '../stores/auth.store';
import { ApiService } from './api.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly authStore = inject(AuthStore);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);
  private refreshTokenObservable = this.refreshTokenSubject.asObservable();

  constructor() {
    // Set up automatic token refresh
    this.setupTokenRefresh();
  }

  // Login
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.authStore.setLoading(true);
    this.authStore.clearError();

    const loginRequest: LoginRequest = {
      emailOrUsername: credentials.emailOrUsername,
      password: credentials.password
    };

    return this.api.post<AuthResponse>('/auth/login', loginRequest).pipe(
      tap(response => {
        this.authStore.setAuthResponse(response);
        this.authStore.setLoading(false);
      }),
      catchError(error => {
        this.authStore.setError(this.getErrorMessage(error));
        this.authStore.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  // Register
  register(userData: RegisterData): Observable<AuthResponse> {
    this.authStore.setLoading(true);
    this.authStore.clearError();

    // Validate password confirmation
    if (userData.password !== userData.confirmPassword) {
      const error = 'Passwords do not match';
      this.authStore.setError(error);
      this.authStore.setLoading(false);
      return throwError(() => new Error(error));
    }

    const registerRequest: RegisterRequest = {
      email: userData.email,
      username: userData.username,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName
    };

    return this.api.post<AuthResponse>('/auth/register', registerRequest).pipe(
      tap(response => {
        this.authStore.setAuthResponse(response);
        this.authStore.setLoading(false);
      }),
      catchError(error => {
        this.authStore.setError(this.getErrorMessage(error));
        this.authStore.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  // Logout
  logout(): Observable<void> {
    return this.api.post<void>('/auth/logout', {}).pipe(
      tap(() => {
        this.authStore.logout();
        this.router.navigate(['/login']);
      }),
      catchError(error => {
        // Even if API call fails, clear local state
        this.authStore.logout();
        this.router.navigate(['/login']);
        return of(undefined);
      })
    );
  }

  // Refresh token
  refreshToken(): Observable<AuthResponse> {
    const currentRefreshToken = this.authStore.refreshToken();
    
    if (!currentRefreshToken) {
      this.authStore.logout();
      this.router.navigate(['/login']);
      return throwError(() => new Error('No refresh token available'));
    }

    // Prevent multiple concurrent refresh requests
    if (this.refreshTokenSubject.value) {
      return this.refreshTokenObservable.pipe(
        switchMap(() => of({} as AuthResponse))
      );
    }

    this.refreshTokenSubject.next(currentRefreshToken);

    const refreshRequest: RefreshTokenRequest = {
      refreshToken: currentRefreshToken
    };

    return this.api.post<AuthResponse>('/auth/refresh', refreshRequest).pipe(
      tap(response => {
        this.authStore.updateTokens(
          response.accessToken, 
          response.refreshToken, 
          new Date(response.expiresAt)
        );
        this.refreshTokenSubject.next(null);
      }),
      catchError(error => {
        this.authStore.logout();
        this.router.navigate(['/login']);
        this.refreshTokenSubject.next(null);
        return throwError(() => error);
      })
    );
  }

  // Change password
  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.api.post<void>('/auth/change-password', request).pipe(
      catchError(error => {
        this.authStore.setError(this.getErrorMessage(error));
        return throwError(() => error);
      })
    );
  }

  // Forgot password
  forgotPassword(request: ForgotPasswordRequest): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/auth/forgot-password', request).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  // Reset password
  resetPassword(request: ResetPasswordRequest): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/auth/reset-password', request).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  // Verify email
  verifyEmail(request: VerifyEmailRequest): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/auth/verify-email', request).pipe(
      tap(() => {
        // Update user's email verification status
        const currentUser = this.authStore.user();
        if (currentUser) {
          this.authStore.setUser({
            ...currentUser,
            emailVerified: true
          });
        }
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  // Resend verification email
  resendVerificationEmail(request: ResendVerificationRequest): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/auth/resend-verification', request).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  // Get current user profile
  getCurrentUser(): Observable<User> {
    return this.api.get<User>('/auth/me').pipe(
      tap(user => {
        this.authStore.setUser(user);
      }),
      catchError(error => {
        if (error.status === 401) {
          this.authStore.logout();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }

  // Update user profile
  updateProfile(userData: Partial<User>): Observable<User> {
    return this.api.patch<User>('/auth/profile', userData).pipe(
      tap(user => {
        this.authStore.setUser(user);
      }),
      catchError(error => {
        this.authStore.setError(this.getErrorMessage(error));
        return throwError(() => error);
      })
    );
  }

  // Check if current session is valid
  validateSession(): Observable<boolean> {
    const token = this.authStore.accessToken();
    
    if (!token) {
      return of(false);
    }

    return this.getCurrentUser().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // Set up automatic token refresh
  private setupTokenRefresh(): void {
    // Check token expiry every minute
    timer(0, 60000).subscribe(() => {
      if (this.authStore.isAuthenticated() && this.authStore.isTokenExpiringSoon()) {
        this.refreshToken().subscribe({
          next: () => console.debug('Token refreshed automatically'),
          error: (error) => console.warn('Failed to refresh token:', error)
        });
      }
    });
  }

  // Utility method to extract error messages
  private getErrorMessage(error: any): string {
    if (error.error?.message) {
      return error.error.message;
    }
    
    if (error.error?.errors) {
      // Handle validation errors
      const firstError = Object.values(error.error.errors)[0];
      return Array.isArray(firstError) ? firstError[0] : String(firstError);
    }
    
    if (error.message) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  }
}