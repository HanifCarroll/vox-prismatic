import { Injectable, signal } from '@angular/core';

export type ViewMode = 'card' | 'list' | 'kanban' | 'table';

export interface ViewSettings {
  mode: ViewMode;
  compactMode: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class ViewModeService {
  private viewSettingsSignal = signal<ViewSettings>({
    mode: 'card',
    compactMode: false
  });

  viewSettings = this.viewSettingsSignal.asReadonly();

  setViewMode(mode: ViewMode): void {
    this.viewSettingsSignal.update(settings => ({
      ...settings,
      mode
    }));
    this.saveToLocalStorage();
  }

  toggleCompactMode(): void {
    this.viewSettingsSignal.update(settings => ({
      ...settings,
      compactMode: !settings.compactMode
    }));
    this.saveToLocalStorage();
  }

  setSorting(sortBy: string, sortDirection: 'asc' | 'desc'): void {
    this.viewSettingsSignal.update(settings => ({
      ...settings,
      sortBy,
      sortDirection
    }));
    this.saveToLocalStorage();
  }

  loadFromLocalStorage(): void {
    const stored = localStorage.getItem('viewSettings');
    if (stored) {
      try {
        const settings = JSON.parse(stored) as ViewSettings;
        this.viewSettingsSignal.set(settings);
      } catch (e) {
        console.error('Failed to load view settings from localStorage', e);
      }
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('viewSettings', JSON.stringify(this.viewSettings()));
    } catch (e) {
      console.error('Failed to save view settings to localStorage', e);
    }
  }
}