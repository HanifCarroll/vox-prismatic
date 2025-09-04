import { Component, ChangeDetectionStrategy, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LinkedInAuthService } from '../auth/services/linkedin-auth.service';

type SettingsTab = 'general' | 'integrations' | 'automation' | 'account';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
      
      <div class="bg-white rounded-lg shadow">
        <div class="border-b border-gray-200">
          <nav class="flex -mb-px">
            <button 
              (click)="setActiveTab('general')"
              [class]="getTabClasses('general')">
              General
            </button>
            <button 
              (click)="setActiveTab('integrations')"
              [class]="getTabClasses('integrations')">
              Integrations
            </button>
            <button 
              (click)="setActiveTab('automation')"
              [class]="getTabClasses('automation')">
              Automation
            </button>
            <button 
              (click)="setActiveTab('account')"
              [class]="getTabClasses('account')">
              Account
            </button>
          </nav>
        </div>
        
        <div class="p-6">
          
          @if (activeTab() === 'general') {
            <div>
              <h2 class="text-lg font-semibold mb-4">General Settings</h2>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Default Project Template
                  </label>
                  <select class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Standard Content Pipeline</option>
                    <option>Quick Social Posts</option>
                    <option>Long-form Content</option>
                  </select>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Auto-approval Threshold
                  </label>
                  <input 
                    type="number" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Minimum score for auto-approval"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Default Platforms
                  </label>
                  <div class="space-y-2">
                    <label class="flex items-center">
                      <input type="checkbox" class="mr-2" checked />
                      <span>LinkedIn</span>
                    </label>
                    <label class="flex items-center">
                      <input type="checkbox" class="mr-2" checked />
                      <span>Twitter</span>
                    </label>
                    <label class="flex items-center">
                      <input type="checkbox" class="mr-2" />
                      <span>Threads</span>
                    </label>
                    <label class="flex items-center">
                      <input type="checkbox" class="mr-2" />
                      <span>Bluesky</span>
                    </label>
                  </div>
                </div>
                
                <div class="pt-4">
                  <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          }
          
          @if (activeTab() === 'integrations') {
            <div>
              <h2 class="text-lg font-semibold mb-4">Social Media Integrations</h2>
              
              <div class="space-y-6">
                <!-- LinkedIn Integration -->
                <div class="border border-gray-200 rounded-lg p-4">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clip-rule="evenodd"></path>
                        </svg>
                      </div>
                      <div>
                        <h3 class="font-medium text-gray-900">LinkedIn</h3>
                        <p class="text-sm text-gray-500">Connect to publish posts to LinkedIn</p>
                      </div>
                    </div>
                    
                    <div class="flex items-center space-x-3">
                      @if (linkedInAuth.isConnecting()) {
                        <div class="flex items-center space-x-2">
                          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span class="text-sm text-gray-600">Connecting...</span>
                        </div>
                      } @else if (linkedInAuth.isConnected()) {
                        <div class="flex items-center space-x-2">
                          <div class="flex items-center space-x-1">
                            <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span class="text-sm text-green-600 font-medium">Connected</span>
                          </div>
                          @if (linkedInAuth.isConnectionExpiringSoon()) {
                            <span class="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                              Expires in {{ linkedInAuth.connectionExpiresIn() }} days
                            </span>
                          }
                        </div>
                      } @else {
                        <span class="text-sm text-gray-500">Not connected</span>
                      }
                    </div>
                  </div>
                  
                  @if (linkedInAuth.connectionError()) {
                    <div class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div class="flex items-center space-x-2">
                        <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                        <p class="text-sm text-red-700">{{ linkedInAuth.connectionError() }}</p>
                        <button 
                          (click)="linkedInAuth.clearError()"
                          class="ml-auto text-red-500 hover:text-red-700">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  }
                  
                  <div class="flex items-center justify-between">
                    @if (linkedInAuth.isConnected()) {
                      <div class="text-sm text-gray-600">
                        @if (linkedInAuth.connectionExpiresAt()) {
                          <span>Connected until {{ linkedInAuth.connectionExpiresAt() | date:'medium' }}</span>
                        } @else {
                          <span>Connection active</span>
                        }
                      </div>
                    } @else {
                      <div class="text-sm text-gray-600">
                        Connect your LinkedIn account to enable automatic posting
                      </div>
                    }
                    
                    <div class="flex space-x-2">
                      @if (linkedInAuth.isConnected()) {
                        @if (linkedInAuth.isConnectionExpiringSoon()) {
                          <button 
                            (click)="refreshLinkedInConnection()"
                            [disabled]="linkedInAuth.isConnecting()"
                            class="px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50">
                            Refresh
                          </button>
                        }
                        <button 
                          (click)="disconnectLinkedIn()"
                          [disabled]="linkedInAuth.isConnecting()"
                          class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
                          Disconnect
                        </button>
                      } @else {
                        <button 
                          (click)="connectLinkedIn()"
                          [disabled]="linkedInAuth.isConnecting()"
                          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                          Connect LinkedIn
                        </button>
                      }
                    </div>
                  </div>
                </div>
                
                <!-- Other Integrations (Placeholder) -->
                <div class="border border-gray-200 rounded-lg p-4 opacity-50">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"></path>
                        </svg>
                      </div>
                      <div>
                        <h3 class="font-medium text-gray-900">Twitter/X</h3>
                        <p class="text-sm text-gray-500">Coming soon</p>
                      </div>
                    </div>
                    <span class="text-sm text-gray-500">Not available</span>
                  </div>
                </div>
              </div>
            </div>
          }
          
          @if (activeTab() === 'automation') {
            <div>
              <h2 class="text-lg font-semibold mb-4">Automation Settings</h2>
              <p class="text-gray-600">Automation settings will be available soon.</p>
            </div>
          }
          
          @if (activeTab() === 'account') {
            <div>
              <h2 class="text-lg font-semibold mb-4">Account Settings</h2>
              <p class="text-gray-600">Account settings will be available soon.</p>
            </div>
          }
          
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class SettingsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly linkedInAuth = inject(LinkedInAuthService);
  
  // Tab management
  private readonly _activeTab = signal<SettingsTab>('general');
  readonly activeTab = this._activeTab.asReadonly();
  
  constructor() {
    // Listen for query parameter changes to set active tab
    this.route.queryParams
      .pipe(takeUntilDestroyed())
      .subscribe(params => {
        const tab = params['tab'] as SettingsTab;
        if (tab && ['general', 'integrations', 'automation', 'account'].includes(tab)) {
          this._activeTab.set(tab);
        }
      });
  }
  
  ngOnInit(): void {
    // Refresh LinkedIn connection status when the integrations tab is accessed
    if (this.activeTab() === 'integrations') {
      this.linkedInAuth.refreshConnectionStatus();
    }
  }
  
  /**
   * Set the active settings tab
   */
  setActiveTab(tab: SettingsTab): void {
    this._activeTab.set(tab);
    this.router.navigate([], {
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
    
    // Refresh LinkedIn status when switching to integrations
    if (tab === 'integrations') {
      this.linkedInAuth.refreshConnectionStatus();
    }
  }
  
  /**
   * Get CSS classes for tab buttons
   */
  getTabClasses(tab: SettingsTab): string {
    const baseClasses = 'px-6 py-3 border-b-2 font-medium transition-colors';
    const activeClasses = 'border-blue-500 text-blue-600';
    const inactiveClasses = 'border-transparent text-gray-500 hover:text-gray-700';
    
    return `${baseClasses} ${this.activeTab() === tab ? activeClasses : inactiveClasses}`;
  }
  
  /**
   * Connect to LinkedIn
   */
  connectLinkedIn(): void {
    this.linkedInAuth.initiateLinkedInAuth()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => {
          // Connection initiated - the service handles the rest
        },
        error: (error) => {
          console.error('Failed to initiate LinkedIn connection:', error);
        }
      });
  }
  
  /**
   * Disconnect from LinkedIn
   */
  disconnectLinkedIn(): void {
    if (!confirm('Are you sure you want to disconnect your LinkedIn account? You will no longer be able to publish posts to LinkedIn.')) {
      return;
    }
    
    this.linkedInAuth.revokeLinkedInConnection()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (response) => {
          console.log('LinkedIn disconnected:', response.message);
        },
        error: (error) => {
          console.error('Failed to disconnect LinkedIn:', error);
        }
      });
  }
  
  /**
   * Refresh LinkedIn connection (attempt to get new tokens)
   */
  refreshLinkedInConnection(): void {
    this.linkedInAuth.refreshAccessToken()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => {
          console.log('LinkedIn tokens refreshed');
        },
        error: (error) => {
          console.error('Failed to refresh LinkedIn tokens:', error);
          // If refresh fails, user may need to reconnect
          if (confirm('Unable to refresh your LinkedIn connection. Would you like to reconnect?')) {
            this.connectLinkedIn();
          }
        }
      });
  }
}