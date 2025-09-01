import { Injectable, signal } from '@angular/core';

export type ViewMode = 'card' | 'list' | 'kanban' | 'table';

export interface ViewSettings {
  mode: ViewMode;
  itemsPerPage: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  groupBy?: string;
  showFilters: boolean;
  compactMode: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ViewModeService {
  private readonly defaultSettings: ViewSettings = {
    mode: 'card',
    itemsPerPage: 20,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    showFilters: true,
    compactMode: false
  };

  viewSettings = signal<ViewSettings>(this.loadSettings());

  constructor() {
    this.viewSettings.set(this.loadSettings());
  }

  setViewMode(mode: ViewMode): void {
    const current = this.viewSettings();
    const updated = { ...current, mode };
    this.viewSettings.set(updated);
    this.saveSettings(updated);
  }

  updateSettings(settings: Partial<ViewSettings>): void {
    const current = this.viewSettings();
    const updated = { ...current, ...settings };
    this.viewSettings.set(updated);
    this.saveSettings(updated);
  }

  toggleCompactMode(): void {
    const current = this.viewSettings();
    const updated = { ...current, compactMode: !current.compactMode };
    this.viewSettings.set(updated);
    this.saveSettings(updated);
  }

  toggleFilters(): void {
    const current = this.viewSettings();
    const updated = { ...current, showFilters: !current.showFilters };
    this.viewSettings.set(updated);
    this.saveSettings(updated);
  }

  resetSettings(): void {
    this.viewSettings.set(this.defaultSettings);
    this.saveSettings(this.defaultSettings);
  }

  private loadSettings(): ViewSettings {
    const stored = localStorage.getItem('contentViewSettings');
    if (stored) {
      try {
        return { ...this.defaultSettings, ...JSON.parse(stored) };
      } catch {
        return this.defaultSettings;
      }
    }
    return this.defaultSettings;
  }

  private saveSettings(settings: ViewSettings): void {
    localStorage.setItem('contentViewSettings', JSON.stringify(settings));
  }
}