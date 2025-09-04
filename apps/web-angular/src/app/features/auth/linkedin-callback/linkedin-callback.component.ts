import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LinkedInAuthService } from '../services/linkedin-auth.service';

@Component({
  selector: 'app-linkedin-callback',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        
        @if (isProcessing()) {
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">Processing LinkedIn Authentication</h2>
            <p class="text-gray-600">Please wait while we complete your LinkedIn connection...</p>
          </div>
        }
        
        @if (isSuccess()) {
          <div class="text-center">
            <div class="rounded-full bg-green-100 p-3 mx-auto mb-4 w-12 h-12 flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">LinkedIn Connected Successfully!</h2>
            <p class="text-gray-600 mb-4">Your LinkedIn account has been connected to your Content Creation account.</p>
            <button 
              (click)="closeWindow()"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Continue
            </button>
          </div>
        }
        
        @if (hasError()) {
          <div class="text-center">
            <div class="rounded-full bg-red-100 p-3 mx-auto mb-4 w-12 h-12 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">Connection Failed</h2>
            <p class="text-gray-600 mb-4">{{ errorMessage() }}</p>
            <div class="space-x-3">
              <button 
                (click)="retryConnection()"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Retry
              </button>
              <button 
                (click)="closeWindow()"
                class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors">
                Close
              </button>
            </div>
          </div>
        }
        
      </div>
    </div>
  `
})
export class LinkedInCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly linkedInAuth = inject(LinkedInAuthService);

  // Component state signals
  private readonly _isProcessing = signal(true);
  private readonly _isSuccess = signal(false);
  private readonly _hasError = signal(false);
  private readonly _errorMessage = signal<string>('');

  // Public read-only signals
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly isSuccess = this._isSuccess.asReadonly();
  readonly hasError = this._hasError.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();

  constructor() {
    // Handle route parameter changes
    this.route.queryParams
      .pipe(takeUntilDestroyed())
      .subscribe(params => {
        this.handleCallback(params);
      });
  }

  ngOnInit(): void {
    // Component initialization is handled in constructor via route subscription
  }

  /**
   * Handle the OAuth callback parameters
   */
  private handleCallback(params: any): void {
    const code = params['code'];
    const state = params['state'];
    const error = params['error'];
    const errorDescription = params['error_description'];

    // Reset state
    this._isProcessing.set(true);
    this._isSuccess.set(false);
    this._hasError.set(false);
    this._errorMessage.set('');

    // Handle OAuth error from LinkedIn
    if (error) {
      this._isProcessing.set(false);
      this._hasError.set(true);
      this._errorMessage.set(
        errorDescription || 
        this.getErrorDescription(error) || 
        'LinkedIn authentication was cancelled or failed.'
      );
      return;
    }

    // Handle successful OAuth response
    if (code && state) {
      this.linkedInAuth.handleLinkedInCallback(code, state)
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (response) => {
            this._isProcessing.set(false);
            this._isSuccess.set(true);
            
            // Close the popup window after a short delay for user to see success message
            setTimeout(() => {
              this.closeWindow();
            }, 2000);
          },
          error: (error) => {
            console.error('LinkedIn callback error:', error);
            this._isProcessing.set(false);
            this._hasError.set(true);
            this._errorMessage.set(
              error.message || 'Failed to complete LinkedIn authentication.'
            );
          }
        });
      return;
    }

    // Invalid callback - missing required parameters
    this._isProcessing.set(false);
    this._hasError.set(true);
    this._errorMessage.set('Invalid LinkedIn authentication response. Missing required parameters.');
  }

  /**
   * Retry the LinkedIn connection
   */
  retryConnection(): void {
    this.linkedInAuth.initiateLinkedInAuth()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => {
          // Initiation successful - the service will handle opening the auth window
        },
        error: (error) => {
          console.error('Failed to retry LinkedIn connection:', error);
          this._hasError.set(true);
          this._errorMessage.set(error.message || 'Failed to initiate LinkedIn authentication.');
        }
      });
  }

  /**
   * Close the callback window
   */
  closeWindow(): void {
    // If this is a popup window, close it
    if (window.opener) {
      window.close();
      return;
    }

    // Otherwise, navigate to settings or dashboard
    this.router.navigate(['/settings'], { queryParams: { tab: 'integrations' } });
  }

  /**
   * Get human-readable error description for OAuth error codes
   */
  private getErrorDescription(error: string): string | null {
    const errorDescriptions: Record<string, string> = {
      'access_denied': 'You denied access to your LinkedIn account.',
      'invalid_request': 'The authentication request was invalid.',
      'invalid_client': 'The LinkedIn application is not properly configured.',
      'invalid_grant': 'The authorization code is invalid or expired.',
      'unsupported_response_type': 'The authentication method is not supported.',
      'invalid_scope': 'The requested permissions are invalid.',
      'server_error': 'LinkedIn encountered an internal error.',
      'temporarily_unavailable': 'LinkedIn authentication is temporarily unavailable.'
    };

    return errorDescriptions[error] || null;
  }
}