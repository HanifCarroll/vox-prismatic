import { Component, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { AuthStore } from '../../stores/auth.store';
import { AuthService } from '../../services/auth.service';
import { ProjectStore } from '../../stores/project.store';
import { SSEService, ConnectionStatus } from '../../services/sse.service';
import { NotificationService } from '../../services/notification.service';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { map } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, TooltipModule, BadgeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <ng-container *ngIf="currentProject$ | async as project">
              <span class="text-sm text-gray-500">Current Project:</span>
              <h2 class="text-lg font-semibold text-gray-800">{{ project.title }}</h2>
              <span 
                class="px-2 py-1 text-xs rounded-full"
                [ngClass]="getStageClass(project.currentStage)"
              >
                {{ formatStage(project.currentStage) }}
              </span>
            </ng-container>
            <div *ngIf="!(currentProject$ | async)" class="text-gray-500">
              Select a project to get started
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- SSE Connection Status -->
            <div class="flex items-center space-x-2">
              <div 
                class="flex items-center space-x-1 px-2 py-1 rounded-md transition-colors cursor-pointer"
                [ngClass]="getSSEStatusClass()"
                [pTooltip]="getSSETooltipText()"
                tooltipPosition="bottom"
                (click)="toggleSSEDetails()">
                <i [class]="getSSEStatusIcon()" class="text-xs"></i>
                <span class="text-xs font-medium">{{ getSSEStatusText() }}</span>
              </div>
              
              <!-- SSE Details Panel -->
              @if (showSSEDetails()) {
                <div class="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
                  <h4 class="font-medium text-sm mb-2">Real-time Connection</h4>
                  <div class="space-y-2 text-xs">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Status:</span>
                      <span [ngClass]="getConnectionStatusClass()">{{ getConnectionStatusText() }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Events received:</span>
                      <span class="font-medium">{{ sseService.eventCount() }}</span>
                    </div>
                    @if (sseService.error(); as error) {
                      <div class="text-red-600">
                        <span class="font-medium">Error:</span> {{ error }}
                      </div>
                    }
                    @if (projectStore.realTimeUpdates() | keyvalue; as updates) {
                      @if (updates.length > 0) {
                        <div class="border-t pt-2 mt-2">
                          <span class="text-gray-600">Active projects:</span>
                          @for (update of updates.slice(0, 3); track update.key) {
                            <div class="flex justify-between mt-1">
                              <span class="truncate max-w-24">{{ getProjectTitle(update.key) }}</span>
                              <span class="text-green-600 text-xs">{{ update.value.type }}</span>
                            </div>
                          }
                        </div>
                      }
                    }
                    <div class="border-t pt-2 mt-2 flex justify-between">
                      <button 
                        (click)="reconnectSSE()"
                        class="text-blue-600 hover:text-blue-800 text-xs">
                        Reconnect
                      </button>
                      <button 
                        (click)="toggleSSEDetails()"
                        class="text-gray-600 hover:text-gray-800 text-xs">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
            
            <!-- In-app Notifications Bell -->
            <div class="relative">
              <button 
                (click)="toggleNotifications()"
                class="p-2 text-gray-600 hover:text-gray-800 transition-colors relative">
                <i class="pi pi-bell text-xl"></i>
                @if (notificationService.unreadCount() > 0) {
                  <p-badge 
                    [value]="notificationService.unreadCount().toString()" 
                    severity="danger"
                    [style]="{'position': 'absolute', 'top': '4px', 'right': '4px', 'font-size': '0.75rem'}">
                  </p-badge>
                }
              </button>
              
              <!-- Notifications Panel -->
              @if (showNotifications()) {
                <div class="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
                  <div class="p-3 border-b border-gray-200 flex items-center justify-between">
                    <h4 class="font-medium text-sm">Notifications</h4>
                    <div class="flex items-center space-x-2">
                      @if (notificationService.unreadCount() > 0) {
                        <button 
                          (click)="markAllNotificationsAsRead()"
                          class="text-xs text-blue-600 hover:text-blue-800">
                          Mark all read
                        </button>
                      }
                      <button 
                        (click)="clearAllNotifications()"
                        class="text-xs text-gray-600 hover:text-gray-800">
                        Clear all
                      </button>
                    </div>
                  </div>
                  
                  <div class="max-h-64 overflow-y-auto">
                    @if (notificationService.recentNotifications().length === 0) {
                      <div class="p-4 text-center text-gray-500 text-sm">
                        No notifications yet
                      </div>
                    } @else {
                      @for (notification of notificationService.recentNotifications(); track notification.id) {
                        <div 
                          class="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                          [class.bg-blue-50]="!notification.read"
                          (click)="handleNotificationClick(notification)">
                          <div class="flex items-start space-x-3">
                            <div class="flex-shrink-0 mt-1">
                              <i 
                                class="text-sm"
                                [class]="getNotificationIcon(notification.type)"
                                [ngClass]="getNotificationIconColor(notification.type)">
                              </i>
                            </div>
                            <div class="flex-1 min-w-0">
                              <p class="text-sm font-medium text-gray-900">{{ notification.title }}</p>
                              <p class="text-xs text-gray-600 mt-1">{{ notification.message }}</p>
                              <p class="text-xs text-gray-400 mt-1">{{ getRelativeTime(notification.timestamp) }}</p>
                            </div>
                            @if (!notification.read) {
                              <div class="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            }
                          </div>
                        </div>
                      }
                    }
                  </div>
                </div>
              }
            </div>
            <button class="p-2 text-gray-600 hover:text-gray-800 transition-colors">
              <i class="pi pi-question-circle text-xl"></i>
            </button>
            
            @if (authStore.user(); as user) {
              <div class="relative">
                <button 
                  (click)="toggleUserMenu()"
                  class="flex items-center space-x-3 text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {{ getUserInitials(user) }}
                  </div>
                  <div class="text-left">
                    <div class="font-medium text-gray-700">{{ authStore.getUserDisplayName() }}</div>
                    <div class="text-gray-500">{{ user.email }}</div>
                  </div>
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                @if (showUserMenu()) {
                  <div class="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div class="py-1">
                      <div class="px-4 py-3 border-b border-gray-100">
                        <p class="text-sm font-medium text-gray-700">{{ authStore.getUserDisplayName() }}</p>
                        <p class="text-sm text-gray-500">{{ user.email }}</p>
                        @if (!user.emailVerified) {
                          <p class="text-xs text-orange-600 mt-1">Email not verified</p>
                        }
                      </div>
                      
                      <a 
                        routerLink="/settings"
                        (click)="closeUserMenu()"
                        class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Account Settings
                      </a>
                      
                      <a 
                        routerLink="/settings/prompts"
                        (click)="closeUserMenu()"
                        class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Prompt Templates
                      </a>
                      
                      <div class="border-t border-gray-100 mt-1">
                        <button 
                          (click)="logout()"
                          class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign out
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </header>
  `,
  styles: []
})
export class HeaderComponent {
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);
  readonly authStore = inject(AuthStore);
  readonly projectStore = inject(ProjectStore);
  readonly sseService = inject(SSEService);
  readonly notificationService = inject(NotificationService);
  
  currentProject$ = this.projectService.currentProject$;
  readonly showUserMenu = signal(false);
  readonly showSSEDetails = signal(false);
  readonly showNotifications = signal(false);
  
  // SSE connection status computed values
  readonly sseConnectionStatus = computed(() => this.sseService.connectionStatus());
  readonly sseEventCount = computed(() => this.sseService.eventCount());
  readonly hasRecentActivity = computed(() => {
    const lastEvent = this.sseService.lastEvent();
    if (!lastEvent) return false;
    
    const eventTime = new Date(lastEvent.timestamp);
    const now = new Date();
    return (now.getTime() - eventTime.getTime()) < 60000; // Less than 1 minute
  });
  
  getStageClass(stage: string): string {
    const stageClasses: Record<string, string> = {
      'RAW_CONTENT': 'bg-gray-100 text-gray-700',
      'PROCESSING_CONTENT': 'bg-yellow-100 text-yellow-700',
      'INSIGHTS_READY': 'bg-purple-100 text-purple-700',
      'INSIGHTS_APPROVED': 'bg-indigo-100 text-indigo-700',
      'POSTS_GENERATED': 'bg-blue-100 text-blue-700',
      'POSTS_APPROVED': 'bg-teal-100 text-teal-700',
      'SCHEDULED': 'bg-orange-100 text-orange-700',
      'PUBLISHING': 'bg-pink-100 text-pink-700',
      'PUBLISHED': 'bg-green-100 text-green-700',
      'ARCHIVED': 'bg-gray-100 text-gray-500'
    };
    return stageClasses[stage] || 'bg-gray-100 text-gray-700';
  }
  
  formatStage(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // Auth-related methods
  getUserInitials(user: any): string {
    const firstName = user.firstName?.[0] || '';
    const lastName = user.lastName?.[0] || '';
    
    if (firstName && lastName) {
      return (firstName + lastName).toUpperCase();
    }
    
    if (firstName) {
      return firstName.toUpperCase();
    }
    
    return user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
  }

  toggleUserMenu(): void {
    this.showUserMenu.update(current => !current);
  }

  closeUserMenu(): void {
    this.showUserMenu.set(false);
  }

  logout(): void {
    this.closeUserMenu();
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logged out successfully');
      },
      error: (error) => {
        console.error('Logout error:', error);
      }
    });
  }

  // SSE Status Methods
  
  getSSEStatusClass(): string {
    const status = this.sseConnectionStatus();
    const baseClass = 'transition-colors';
    
    switch (status) {
      case 'connected':
        return `${baseClass} bg-green-50 text-green-700 border border-green-200`;
      case 'connecting':
      case 'reconnecting':
        return `${baseClass} bg-yellow-50 text-yellow-700 border border-yellow-200`;
      case 'error':
        return `${baseClass} bg-red-50 text-red-700 border border-red-200`;
      default:
        return `${baseClass} bg-gray-50 text-gray-700 border border-gray-200`;
    }
  }
  
  getSSEStatusIcon(): string {
    const status = this.sseConnectionStatus();
    
    switch (status) {
      case 'connected':
        return this.hasRecentActivity() ? 'pi pi-circle-fill text-green-500 animate-pulse' : 'pi pi-circle-fill text-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'pi pi-spin pi-spinner text-yellow-500';
      case 'error':
        return 'pi pi-exclamation-circle text-red-500';
      default:
        return 'pi pi-circle text-gray-500';
    }
  }
  
  getSSEStatusText(): string {
    const status = this.sseConnectionStatus();
    
    switch (status) {
      case 'connected':
        return 'LIVE';
      case 'connecting':
        return 'Connecting';
      case 'reconnecting':
        return 'Reconnecting';
      case 'error':
        return 'Offline';
      default:
        return 'Disconnected';
    }
  }
  
  getSSETooltipText(): string {
    const status = this.sseConnectionStatus();
    const eventCount = this.sseEventCount();
    
    switch (status) {
      case 'connected':
        return `Real-time updates active. ${eventCount} events received.`;
      case 'connecting':
      case 'reconnecting':
        return 'Connecting to real-time updates...';
      case 'error':
        return 'Real-time updates unavailable. Click to retry.';
      default:
        return 'Real-time updates disconnected';
    }
  }
  
  getConnectionStatusClass(): string {
    const status = this.sseConnectionStatus();
    
    switch (status) {
      case 'connected':
        return 'text-green-600 font-medium';
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-600 font-medium';
      case 'error':
        return 'text-red-600 font-medium';
      default:
        return 'text-gray-600';
    }
  }
  
  getConnectionStatusText(): string {
    const status = this.sseConnectionStatus();
    
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  }
  
  getProjectTitle(projectId: string): string {
    // In a real implementation, you'd look up the project title
    // For now, just show a truncated project ID
    return `Project ${projectId.substring(0, 8)}...`;
  }
  
  toggleSSEDetails(): void {
    this.showSSEDetails.update(current => !current);
  }
  
  reconnectSSE(): void {
    this.sseService.reconnect();
    this.showSSEDetails.set(false);
  }

  // Notification Methods

  /**
   * Toggle notifications panel
   */
  toggleNotifications(): void {
    this.showNotifications.update(current => !current);
  }

  /**
   * Handle notification click
   */
  handleNotificationClick(notification: any): void {
    // Mark as read
    this.notificationService.markInAppNotificationAsRead(notification.id);
    
    // Navigate to action URL if available (would need router injection)
    if (notification.actionUrl) {
      console.log('Navigate to:', notification.actionUrl);
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead(): void {
    this.notificationService.markAllInAppNotificationsAsRead();
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.notificationService.clearAllInAppNotifications();
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'success':
        return 'pi pi-check-circle';
      case 'error':
        return 'pi pi-exclamation-circle';
      case 'warning':
        return 'pi pi-exclamation-triangle';
      default:
        return 'pi pi-info-circle';
    }
  }

  /**
   * Get notification icon color
   */
  getNotificationIconColor(type: string): string {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-orange-600';
      default:
        return 'text-blue-600';
    }
  }

  /**
   * Get relative time from timestamp
   */
  getRelativeTime(timestamp: Date): string {
    const now = new Date();
    const diff = (now.getTime() - timestamp.getTime()) / 1000;

    if (diff < 60) {
      return 'just now';
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `${minutes}m ago`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diff / 86400);
      return `${days}d ago`;
    }
  }
}