import { Injectable, signal, computed, effect } from '@angular/core';
import { User, AuthResponse, AuthState } from '../models/user.model';

const AUTH_STORAGE_KEY = 'auth_state';
const TOKEN_STORAGE_KEY = 'access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';

@Injectable({
  providedIn: 'root'
})
export class AuthStore {
  // Private state signals
  private readonly _user = signal<User | null>(null);
  private readonly _accessToken = signal<string | null>(null);
  private readonly _refreshToken = signal<string | null>(null);
  private readonly _expiresAt = signal<Date | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Public read-only signals
  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly refreshToken = this._refreshToken.asReadonly();
  readonly expiresAt = this._expiresAt.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed values
  readonly isAuthenticated = computed(() => {
    const user = this._user();
    const token = this._accessToken();
    const expiresAt = this._expiresAt();
    
    if (!user || !token || !expiresAt) return false;
    
    // Check if token is expired
    return new Date() < expiresAt;
  });

  readonly authState = computed<AuthState>(() => ({
    user: this._user(),
    accessToken: this._accessToken(),
    refreshToken: this._refreshToken(),
    expiresAt: this._expiresAt(),
    isAuthenticated: this.isAuthenticated(),
    isLoading: this._isLoading(),
    error: this._error()
  }));

  readonly tokenExpiresIn = computed(() => {
    const expiresAt = this._expiresAt();
    if (!expiresAt) return null;
    
    const now = new Date();
    const expiresInMs = expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(expiresInMs / 1000)); // seconds
  });

  readonly isTokenExpiringSoon = computed(() => {
    const expiresIn = this.tokenExpiresIn();
    if (expiresIn === null) return false;
    
    // Consider token as expiring soon if less than 5 minutes remaining
    return expiresIn < 300;
  });

  constructor() {
    // Load persisted auth state on initialization
    this.loadPersistedState();
    
    // Auto-save auth state changes to localStorage
    effect(() => {
      this.persistAuthState();
    });
  }

  // Actions
  setAuthResponse(authResponse: AuthResponse): void {
    this._user.set(authResponse.user);
    this._accessToken.set(authResponse.accessToken);
    this._refreshToken.set(authResponse.refreshToken);
    this._expiresAt.set(new Date(authResponse.expiresAt));
    this._error.set(null);
    
    // Update last login time
    const updatedUser = {
      ...authResponse.user,
      lastLoginAt: new Date()
    };
    this._user.set(updatedUser);
  }

  setUser(user: User): void {
    this._user.set(user);
    this._error.set(null);
  }

  updateTokens(accessToken: string, refreshToken: string, expiresAt: Date): void {
    this._accessToken.set(accessToken);
    this._refreshToken.set(refreshToken);
    this._expiresAt.set(expiresAt);
    this._error.set(null);
  }

  setLoading(loading: boolean): void {
    this._isLoading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  clearError(): void {
    this._error.set(null);
  }

  logout(): void {
    this._user.set(null);
    this._accessToken.set(null);
    this._refreshToken.set(null);
    this._expiresAt.set(null);
    this._error.set(null);
    this._isLoading.set(false);
    
    // Clear persisted state
    this.clearPersistedState();
  }

  // Check if user has specific permissions (for future use)
  hasPermission(permission: string): boolean {
    const user = this._user();
    if (!user) return false;
    
    // Basic implementation - extend as needed
    return true;
  }

  // Get user display name
  getUserDisplayName(): string {
    const user = this._user();
    if (!user) return 'Guest';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    if (user.firstName) {
      return user.firstName;
    }
    
    return user.username;
  }

  // Persistence methods
  private loadPersistedState(): void {
    try {
      const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      
      if (storedAuth && storedToken && storedRefreshToken) {
        const authData = JSON.parse(storedAuth);
        
        // Validate that the stored data is still valid
        const expiresAt = new Date(authData.expiresAt);
        if (new Date() < expiresAt) {
          this._user.set({
            ...authData.user,
            createdAt: new Date(authData.user.createdAt),
            lastLoginAt: authData.user.lastLoginAt ? new Date(authData.user.lastLoginAt) : undefined
          });
          this._accessToken.set(storedToken);
          this._refreshToken.set(storedRefreshToken);
          this._expiresAt.set(expiresAt);
        } else {
          // Token expired, clear stored data
          this.clearPersistedState();
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted auth state:', error);
      this.clearPersistedState();
    }
  }

  private persistAuthState(): void {
    const user = this._user();
    const accessToken = this._accessToken();
    const refreshToken = this._refreshToken();
    const expiresAt = this._expiresAt();
    
    try {
      if (user && accessToken && refreshToken && expiresAt) {
        const authData = {
          user,
          expiresAt: expiresAt.toISOString()
        };
        
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
      } else {
        this.clearPersistedState();
      }
    } catch (error) {
      console.warn('Failed to persist auth state:', error);
    }
  }

  private clearPersistedState(): void {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear persisted auth state:', error);
    }
  }
}