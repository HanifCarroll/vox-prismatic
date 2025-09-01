import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

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

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private messageService: MessageService) {}

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
}