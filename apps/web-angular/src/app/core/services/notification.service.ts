import { Injectable, signal, computed, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SSEService, SSEEvent } from './sse.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface NotificationOptions {
  severity?: 'success' | 'info' | 'warn' | 'error';
  summary?: string;
  detail?: string;
  life?: number;
  sticky?: boolean;
  closable?: boolean;
  icon?: string;
  key?: string;
  data?: any;
}

export interface SSENotificationPreferences {
  showProcessingStarted: boolean;
  showProcessingCompleted: boolean;
  showStageChanged: boolean;
  showInsightApproved: boolean;
  showPostApproved: boolean;
  showPostPublished: boolean;
  showErrorsOnly: boolean;
  soundEnabled: boolean;
}

export interface InAppNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  persistent?: boolean;
  projectId?: string;
  actionUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly sseService = inject(SSEService);
  
  // State signals for in-app notifications
  private readonly _inAppNotifications = signal<InAppNotification[]>([]);
  private readonly _ssePreferences = signal<SSENotificationPreferences>({
    showProcessingStarted: true,
    showProcessingCompleted: true,
    showStageChanged: true,
    showInsightApproved: true,
    showPostApproved: true,
    showPostPublished: true,
    showErrorsOnly: false,
    soundEnabled: true
  });
  
  // Public read-only signals
  readonly inAppNotifications = this._inAppNotifications.asReadonly();
  readonly ssePreferences = this._ssePreferences.asReadonly();
  
  // Computed values
  readonly unreadCount = computed(() => 
    this._inAppNotifications().filter(n => !n.read).length
  );
  
  readonly recentNotifications = computed(() => 
    this._inAppNotifications()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
  );
  
  constructor(private messageService: MessageService) {
    this.setupSSENotifications();
    this.loadSSEPreferencesFromStorage();
  }
  
  /**
   * Set up SSE event notifications
   */
  private setupSSENotifications(): void {
    this.sseService.events$
      .pipe(takeUntilDestroyed())
      .subscribe(event => {
        this.handleSSENotification(event);
      });
  }
  
  /**
   * Handle SSE events and create notifications
   */
  private handleSSENotification(event: SSEEvent): void {
    const preferences = this._ssePreferences();
    
    // Skip if user only wants errors and this isn't an error
    if (preferences.showErrorsOnly && !this.isErrorEvent(event)) {
      return;
    }
    
    // Skip if specific event type is disabled
    if (!this.shouldNotifyForEventType(event.type, preferences)) {
      return;
    }
    
    // Create Toast notification
    this.createToastFromSSEEvent(event);
    
    // Create In-app notification
    const inAppNotification = this.createInAppNotificationFromSSEEvent(event);
    if (inAppNotification) {
      this.addInAppNotification(inAppNotification);
    }
    
    // Play sound if enabled
    if (preferences.soundEnabled) {
      this.playNotificationSound(this.getNotificationType(event));
    }
  }

  success(message: string, title?: string, options?: NotificationOptions) {
    this.show({
      severity: 'success',
      summary: title || 'Success',
      detail: message,
      ...options
    });
  }

  info(message: string, title?: string, options?: NotificationOptions) {
    this.show({
      severity: 'info',
      summary: title || 'Info',
      detail: message,
      ...options
    });
  }

  warning(message: string, title?: string, options?: NotificationOptions) {
    this.show({
      severity: 'warn',
      summary: title || 'Warning',
      detail: message,
      ...options
    });
  }

  error(message: string, title?: string, options?: NotificationOptions) {
    this.show({
      severity: 'error',
      summary: title || 'Error',
      detail: message,
      life: 5000,
      ...options
    });
  }

  show(options: NotificationOptions) {
    this.messageService.add({
      severity: options.severity || 'info',
      summary: options.summary,
      detail: options.detail,
      life: options.life || 3000,
      sticky: options.sticky || false,
      closable: options.closable !== false,
      icon: options.icon,
      key: options.key,
      data: options.data
    });
  }

  showMultiple(messages: NotificationOptions[]) {
    const messageOptions = messages.map(msg => ({
      severity: msg.severity || 'info',
      summary: msg.summary,
      detail: msg.detail,
      life: msg.life || 3000,
      sticky: msg.sticky || false,
      closable: msg.closable !== false,
      icon: msg.icon,
      key: msg.key,
      data: msg.data
    }));
    this.messageService.addAll(messageOptions);
  }

  clear(key?: string) {
    this.messageService.clear(key);
  }

  confirmAction(
    message: string,
    onAccept: () => void,
    onReject?: () => void,
    options?: {
      header?: string;
      icon?: string;
      acceptLabel?: string;
      rejectLabel?: string;
    }
  ) {
    this.messageService.add({
      severity: 'info',
      summary: options?.header || 'Confirmation',
      detail: message,
      sticky: true,
      key: 'confirm',
      closable: false
    });
  }

  showProgress(message: string, progress: number, key: string = 'progress') {
    this.show({
      severity: 'info',
      summary: 'Processing',
      detail: `${message} (${progress}%)`,
      sticky: true,
      key,
      data: { progress }
    });
  }

  showConnectionStatus(isConnected: boolean) {
    if (isConnected) {
      this.success('Connection restored', 'Connected');
    } else {
      this.warning('Connection lost. Attempting to reconnect...', 'Disconnected', {
        sticky: true,
        key: 'connection'
      });
    }
  }

  showSaveStatus(status: 'saving' | 'saved' | 'error', message?: string) {
    const key = 'save-status';
    this.clear(key);

    switch (status) {
      case 'saving':
        this.info(message || 'Saving changes...', 'Saving', { sticky: true, key });
        break;
      case 'saved':
        this.success(message || 'Changes saved successfully', 'Saved', { key });
        break;
      case 'error':
        this.error(message || 'Failed to save changes', 'Save Error', { key });
        break;
    }
  }

  // SSE Notification Methods

  /**
   * Create toast notification from SSE event
   */
  private createToastFromSSEEvent(event: SSEEvent): void {
    const { title, message, severity } = this.getNotificationContent(event);
    
    this.show({
      severity,
      summary: title,
      detail: message,
      life: severity === 'error' ? 8000 : 4000,
      key: `sse-${event.projectId}`
    });
  }

  /**
   * Create in-app notification from SSE event
   */
  private createInAppNotificationFromSSEEvent(event: SSEEvent): InAppNotification | null {
    const { title, message, type } = this.getNotificationContent(event);
    
    return {
      id: `sse-${event.projectId}-${event.timestamp}`,
      type,
      title,
      message,
      timestamp: new Date(event.timestamp),
      read: false,
      persistent: type === 'error',
      projectId: event.projectId,
      actionUrl: `/projects/${event.projectId}`
    };
  }

  /**
   * Get notification content based on SSE event type
   */
  private getNotificationContent(event: SSEEvent): {
    title: string;
    message: string;
    severity: 'success' | 'info' | 'warn' | 'error';
    type: 'success' | 'info' | 'warning' | 'error';
  } {
    const projectTitle = this.getProjectTitle(event.projectId);
    
    switch (event.type) {
      case 'ProcessingStarted':
        return {
          title: 'Processing Started',
          message: `${projectTitle} is now being processed`,
          severity: 'info',
          type: 'info'
        };
      
      case 'ProcessingCompleted':
        return {
          title: 'Processing Complete',
          message: `${projectTitle} processing finished successfully`,
          severity: 'success',
          type: 'success'
        };
      
      case 'StageChanged':
        return {
          title: 'Stage Updated',
          message: `${projectTitle} moved to ${this.formatStage(event.data.newStage || '')}`,
          severity: 'info',
          type: 'info'
        };
      
      case 'InsightApproved':
        return {
          title: 'Insight Approved',
          message: `New insight approved for ${projectTitle}`,
          severity: 'success',
          type: 'success'
        };
      
      case 'PostApproved':
        return {
          title: 'Post Approved',
          message: `Post approved for ${projectTitle}`,
          severity: 'success',
          type: 'success'
        };
      
      case 'PostPublished':
        return {
          title: 'Post Published',
          message: `Post from ${projectTitle} successfully published`,
          severity: 'success',
          type: 'success'
        };
      
      case 'ProcessingFailed':
        return {
          title: 'Processing Failed',
          message: `${projectTitle} processing failed: ${event.data.error?.message || 'Unknown error'}`,
          severity: 'error',
          type: 'error'
        };
      
      case 'PublishingFailed':
        return {
          title: 'Publishing Failed',
          message: `Failed to publish post from ${projectTitle}: ${event.data.error?.message || 'Unknown error'}`,
          severity: 'error',
          type: 'error'
        };
      
      case 'ErrorOccurred':
        return {
          title: 'Error Occurred',
          message: `Error in ${projectTitle}: ${event.data.error?.message || 'Unknown error'}`,
          severity: 'error',
          type: 'error'
        };
      
      default:
        return {
          title: 'Update',
          message: `${projectTitle} has been updated`,
          severity: 'info',
          type: 'info'
        };
    }
  }

  /**
   * Get notification type from SSE event
   */
  private getNotificationType(event: SSEEvent): 'success' | 'info' | 'warning' | 'error' {
    const errorEvents = ['ProcessingFailed', 'PublishingFailed', 'ErrorOccurred'];
    const successEvents = ['ProcessingCompleted', 'InsightApproved', 'PostApproved', 'PostPublished'];
    
    if (errorEvents.includes(event.type)) return 'error';
    if (successEvents.includes(event.type)) return 'success';
    return 'info';
  }

  /**
   * Check if event type should generate notification
   */
  private shouldNotifyForEventType(eventType: SSEEvent['type'], preferences: SSENotificationPreferences): boolean {
    switch (eventType) {
      case 'ProcessingStarted':
        return preferences.showProcessingStarted;
      case 'ProcessingCompleted':
        return preferences.showProcessingCompleted;
      case 'StageChanged':
        return preferences.showStageChanged;
      case 'InsightApproved':
        return preferences.showInsightApproved;
      case 'PostApproved':
        return preferences.showPostApproved;
      case 'PostPublished':
        return preferences.showPostPublished;
      case 'ProcessingFailed':
      case 'PublishingFailed':
      case 'ErrorOccurred':
        return true; // Always notify for errors
      default:
        return true;
    }
  }

  /**
   * Check if event is an error event
   */
  private isErrorEvent(event: SSEEvent): boolean {
    return ['ProcessingFailed', 'PublishingFailed', 'ErrorOccurred'].includes(event.type);
  }

  /**
   * Format stage name for display
   */
  private formatStage(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get project title (simplified - in real implementation would lookup from store)
   */
  private getProjectTitle(projectId: string): string {
    return `Project ${projectId.substring(0, 8)}`;
  }

  /**
   * Play notification sound
   */
  private playNotificationSound(type: 'success' | 'info' | 'warning' | 'error'): void {
    if ('Audio' in window) {
      try {
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        // Different frequencies for different notification types
        const frequency = type === 'error' ? 440 : type === 'warning' ? 330 : 523;
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
        
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.3);
      } catch (error) {
        console.warn('Failed to play notification sound:', error);
      }
    }
  }

  // In-app notification management

  /**
   * Add in-app notification
   */
  private addInAppNotification(notification: InAppNotification): void {
    this._inAppNotifications.update(notifications => [notification, ...notifications]);
    
    // Auto-remove non-persistent notifications after 30 seconds
    if (!notification.persistent) {
      setTimeout(() => {
        this.removeInAppNotification(notification.id);
      }, 30000);
    }
  }

  /**
   * Mark in-app notification as read
   */
  markInAppNotificationAsRead(notificationId: string): void {
    this._inAppNotifications.update(notifications =>
      notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }

  /**
   * Remove in-app notification
   */
  removeInAppNotification(notificationId: string): void {
    this._inAppNotifications.update(notifications =>
      notifications.filter(n => n.id !== notificationId)
    );
  }

  /**
   * Clear all in-app notifications
   */
  clearAllInAppNotifications(): void {
    this._inAppNotifications.set([]);
  }

  /**
   * Mark all in-app notifications as read
   */
  markAllInAppNotificationsAsRead(): void {
    this._inAppNotifications.update(notifications =>
      notifications.map(n => ({ ...n, read: true }))
    );
  }

  /**
   * Update SSE notification preferences
   */
  updateSSEPreferences(preferences: Partial<SSENotificationPreferences>): void {
    this._ssePreferences.update(current => ({
      ...current,
      ...preferences
    }));
    
    // Save to localStorage
    localStorage.setItem('sseNotificationPreferences', JSON.stringify(this._ssePreferences()));
  }

  /**
   * Load SSE preferences from localStorage
   */
  private loadSSEPreferencesFromStorage(): void {
    try {
      const stored = localStorage.getItem('sseNotificationPreferences');
      if (stored) {
        const preferences = JSON.parse(stored);
        this._ssePreferences.update(current => ({
          ...current,
          ...preferences
        }));
      }
    } catch (error) {
      console.warn('Failed to load SSE notification preferences:', error);
    }
  }
}