import { Injectable } from '@angular/core';
import { ConfirmationService, ConfirmEventType } from 'primeng/api';

export interface ConfirmOptions {
  message: string;
  header?: string;
  icon?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptButtonStyleClass?: string;
  rejectButtonStyleClass?: string;
  acceptIcon?: string;
  rejectIcon?: string;
  dismissableMask?: boolean;
  closeOnEscape?: boolean;
  blockScroll?: boolean;
  key?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  constructor(private confirmationService: ConfirmationService) {}

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmationService.confirm({
        message: options.message,
        header: options.header || 'Confirmation',
        icon: options.icon || 'pi pi-exclamation-triangle',
        acceptLabel: options.acceptLabel || 'Yes',
        rejectLabel: options.rejectLabel || 'No',
        acceptButtonStyleClass: options.acceptButtonStyleClass || 'p-button-primary',
        rejectButtonStyleClass: options.rejectButtonStyleClass || 'p-button-secondary',
        acceptIcon: options.acceptIcon,
        rejectIcon: options.rejectIcon,
        dismissableMask: options.dismissableMask ?? false,
        closeOnEscape: options.closeOnEscape ?? true,
        blockScroll: options.blockScroll ?? true,
        key: options.key,
        accept: () => resolve(true),
        reject: (type: ConfirmEventType) => {
          resolve(false);
        }
      });
    });
  }

  confirmDelete(itemName?: string): Promise<boolean> {
    return this.confirm({
      message: itemName 
        ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
        : 'Are you sure you want to delete this item? This action cannot be undone.',
      header: 'Delete Confirmation',
      icon: 'pi pi-trash',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger'
    });
  }

  confirmAction(action: string, details?: string): Promise<boolean> {
    return this.confirm({
      message: details || `Are you sure you want to ${action}?`,
      header: `Confirm ${action}`,
      icon: 'pi pi-question-circle'
    });
  }

  confirmSave(hasUnsavedChanges: boolean = true): Promise<boolean> {
    if (!hasUnsavedChanges) return Promise.resolve(true);

    return this.confirm({
      message: 'You have unsaved changes. Do you want to save them before continuing?',
      header: 'Unsaved Changes',
      icon: 'pi pi-save',
      acceptLabel: 'Save',
      rejectLabel: "Don't Save"
    });
  }

  confirmNavigation(hasUnsavedChanges: boolean = true): Promise<boolean> {
    if (!hasUnsavedChanges) return Promise.resolve(true);

    return this.confirm({
      message: 'You have unsaved changes. Are you sure you want to leave?',
      header: 'Unsaved Changes',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Leave',
      rejectLabel: 'Stay',
      acceptButtonStyleClass: 'p-button-warning'
    });
  }

  confirmBulkAction(action: string, count: number): Promise<boolean> {
    return this.confirm({
      message: `This will ${action} ${count} item${count > 1 ? 's' : ''}. Do you want to continue?`,
      header: 'Bulk Action Confirmation',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Continue',
      rejectLabel: 'Cancel'
    });
  }

  confirmPublish(itemName?: string): Promise<boolean> {
    return this.confirm({
      message: itemName
        ? `Are you ready to publish "${itemName}"?`
        : 'Are you ready to publish this content?',
      header: 'Publish Confirmation',
      icon: 'pi pi-send',
      acceptLabel: 'Publish',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-success'
    });
  }

  confirmArchive(itemName?: string): Promise<boolean> {
    return this.confirm({
      message: itemName
        ? `Are you sure you want to archive "${itemName}"?`
        : 'Are you sure you want to archive this item?',
      header: 'Archive Confirmation',
      icon: 'pi pi-box',
      acceptLabel: 'Archive',
      rejectLabel: 'Cancel'
    });
  }
}