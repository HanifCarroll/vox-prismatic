import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, from, EMPTY } from 'rxjs';
import { catchError, tap, switchMap, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthStore } from '../../../core/stores/auth.store';

export interface LinkedInAuthUrl {
  authUrl: string;
}

export interface LinkedInAuthResponse {
  message: string;
}

export interface LinkedInStatus {
  isConnected: boolean;
  expiresAt?: string;
}

export interface LinkedInTokenRefresh {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class LinkedInAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);

  // OAuth state signals
  private readonly _isConnecting = signal(false);
  private readonly _connectionStatus = signal<LinkedInStatus>({ isConnected: false });
  private readonly _connectionError = signal<string | null>(null);

  // Public read-only signals
  readonly isConnecting = this._isConnecting.asReadonly();
  readonly connectionStatus = this._connectionStatus.asReadonly();
  readonly connectionError = this._connectionError.asReadonly();

  // Computed values
  readonly isConnected = computed(() => this._connectionStatus().isConnected);
  readonly connectionExpiresAt = computed(() => {
    const expiresAt = this._connectionStatus().expiresAt;
    return expiresAt ? new Date(expiresAt) : null;
  });

  readonly isConnectionExpiringSoon = computed(() => {
    const expiresAt = this.connectionExpiresAt();
    if (!expiresAt) return false;
    
    // Consider connection as expiring soon if less than 7 days remaining
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    return expiresAt < sevenDaysFromNow;
  });

  readonly connectionExpiresIn = computed(() => {
    const expiresAt = this.connectionExpiresAt();
    if (!expiresAt) return null;
    
    const now = new Date();
    const expiresInMs = expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(expiresInMs / (1000 * 60 * 60 * 24))); // days
  });

  private readonly LINKEDIN_AUTH_STATE_KEY = 'linkedin_oauth_state';
  private readonly LINKEDIN_CODE_VERIFIER_KEY = 'linkedin_code_verifier';

  constructor() {
    // Load connection status on initialization
    this.refreshConnectionStatus();
  }

  /**
   * Initiate LinkedIn OAuth flow with PKCE
   */
  initiateLinkedInAuth(): Observable<void> {
    this._isConnecting.set(true);
    this._connectionError.set(null);

    // Generate PKCE parameters
    const codeVerifier = this.generateCodeVerifier();
    const state = this.generateState();

    // Store PKCE parameters in localStorage
    localStorage.setItem(this.LINKEDIN_CODE_VERIFIER_KEY, codeVerifier);
    localStorage.setItem(this.LINKEDIN_AUTH_STATE_KEY, state);

    return from(this.generateCodeChallenge(codeVerifier)).pipe(
      switchMap(codeChallenge => 
        this.http.get<LinkedInAuthUrl>(`${environment.apiUrl}/auth/linkedin/auth`, {
          params: {
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            state: state
          }
        })
      ),
      tap(response => {
        // Open LinkedIn auth in new window
        const authWindow = window.open(
          response.authUrl,
          'linkedin-auth',
          'width=600,height=600,scrollbars=yes,resizable=yes'
        );

        if (authWindow) {
          // Monitor the auth window for completion
          this.monitorAuthWindow(authWindow);
        } else {
          throw new Error('Unable to open LinkedIn authentication window. Please allow popups.');
        }
      }),
      map(() => void 0),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Handle LinkedIn OAuth callback
   */
  handleLinkedInCallback(code: string, state: string): Observable<LinkedInAuthResponse> {
    this._isConnecting.set(true);
    this._connectionError.set(null);

    // Verify state parameter
    const storedState = localStorage.getItem(this.LINKEDIN_AUTH_STATE_KEY);
    if (!storedState || storedState !== state) {
      const error = 'Invalid OAuth state parameter';
      this._connectionError.set(error);
      this._isConnecting.set(false);
      return throwError(() => new Error(error));
    }

    const codeVerifier = localStorage.getItem(this.LINKEDIN_CODE_VERIFIER_KEY);
    if (!codeVerifier) {
      const error = 'Missing code verifier for OAuth flow';
      this._connectionError.set(error);
      this._isConnecting.set(false);
      return throwError(() => new Error(error));
    }

    return this.http.get<LinkedInAuthResponse>(`${environment.apiUrl}/auth/linkedin/callback`, {
      params: {
        code: code,
        state: state,
        code_verifier: codeVerifier
      }
    }).pipe(
      tap(() => {
        // Clear stored OAuth parameters
        localStorage.removeItem(this.LINKEDIN_AUTH_STATE_KEY);
        localStorage.removeItem(this.LINKEDIN_CODE_VERIFIER_KEY);
        
        // Refresh connection status
        this.refreshConnectionStatus();
        this._isConnecting.set(false);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get LinkedIn connection status
   */
  getConnectionStatus(): Observable<LinkedInStatus> {
    const user = this.authStore.user();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.get<LinkedInStatus>(`${environment.apiUrl}/auth/linkedin/status`, {
      params: { userId: user.id }
    }).pipe(
      tap(status => this._connectionStatus.set(status)),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Refresh connection status silently
   */
  refreshConnectionStatus(): void {
    const user = this.authStore.user();
    if (!user) {
      this._connectionStatus.set({ isConnected: false });
      return;
    }

    this.getConnectionStatus().subscribe({
      next: (status) => this._connectionStatus.set(status),
      error: () => this._connectionStatus.set({ isConnected: false })
    });
  }

  /**
   * Revoke LinkedIn connection
   */
  revokeLinkedInConnection(): Observable<{ message: string }> {
    const user = this.authStore.user();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    this._isConnecting.set(true);
    this._connectionError.set(null);

    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/linkedin/revoke`, {
      userId: user.id
    }).pipe(
      tap(() => {
        this._connectionStatus.set({ isConnected: false });
        this._isConnecting.set(false);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Refresh LinkedIn access token (if refresh token exists)
   */
  refreshAccessToken(): Observable<LinkedInTokenRefresh> {
    const user = this.authStore.user();
    if (!user) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.post<LinkedInTokenRefresh>(`${environment.apiUrl}/auth/linkedin/refresh`, {
      userId: user.id
    }).pipe(
      tap(() => {
        // Refresh connection status after token refresh
        this.refreshConnectionStatus();
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Clear connection error
   */
  clearError(): void {
    this._connectionError.set(null);
  }

  /**
   * Generate a cryptographically secure code verifier for PKCE
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate code challenge from code verifier using SHA256
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate a random state parameter for OAuth
   */
  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Monitor the OAuth authentication window
   */
  private monitorAuthWindow(authWindow: Window): void {
    const checkInterval = setInterval(() => {
      try {
        if (authWindow.closed) {
          clearInterval(checkInterval);
          this._isConnecting.set(false);
          return;
        }

        // Check if we can access the window's location (same origin)
        const url = authWindow.location.href;
        if (url.includes('/auth/callback')) {
          const urlParams = new URLSearchParams(authWindow.location.search);
          const code = urlParams.get('code');
          const state = urlParams.get('state');
          const error = urlParams.get('error');

          authWindow.close();
          clearInterval(checkInterval);

          if (error) {
            this._connectionError.set(`LinkedIn authentication failed: ${error}`);
            this._isConnecting.set(false);
          } else if (code && state) {
            this.handleLinkedInCallback(code, state).subscribe({
              next: () => {
                console.log('LinkedIn authentication successful');
              },
              error: (err) => {
                console.error('LinkedIn callback error:', err);
              }
            });
          } else {
            this._connectionError.set('Invalid LinkedIn authentication response');
            this._isConnecting.set(false);
          }
        }
      } catch (e) {
        // Cross-origin error - window is still on LinkedIn
        // Continue monitoring
      }
    }, 1000);

    // Set a timeout to prevent infinite monitoring
    setTimeout(() => {
      if (!authWindow.closed) {
        clearInterval(checkInterval);
        authWindow.close();
        this._isConnecting.set(false);
        this._connectionError.set('LinkedIn authentication timed out');
      }
    }, 300000); // 5 minutes timeout
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    this._isConnecting.set(false);
    
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 0) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else if (error.status >= 400 && error.status < 500) {
        errorMessage = error.error?.error || error.error?.message || `Client error (${error.status})`;
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
    }

    this._connectionError.set(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}