import { Injectable, signal, computed, effect } from '@angular/core';

export type ViewMode = 'cards' | 'list' | 'kanban';
export type CalendarView = 'month' | 'week' | 'day';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface UIPreferences {
  // View modes
  projectsViewMode: ViewMode;
  calendarViewMode: CalendarView;
  
  // Sidebar and panels
  sidebarCollapsed: boolean;
  filtersVisible: boolean;
  approvedPostsSidebarVisible: boolean;
  
  // Display preferences
  showCompletedProjects: boolean;
  showArchivedProjects: boolean;
  compactMode: boolean;
  
  // Date and time
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStartsOn: 0 | 1 | 6; // Sunday, Monday, Saturday
  
  // Theme
  theme: ThemeMode;
  
  // Notifications
  enableNotifications: boolean;
  notificationSound: boolean;
  
  // Calendar preferences
  showWeekNumbers: boolean;
  showWeekends: boolean;
  defaultEventDuration: number; // in minutes
  
  // Project defaults
  defaultProjectView: 'pipeline' | 'content-tree' | 'timeline';
  autoExpandInsights: boolean;
  autoExpandPosts: boolean;
  
  // Performance
  enableAnimations: boolean;
  enableAutoSave: boolean;
  autoSaveInterval: number; // in seconds
}

const DEFAULT_PREFERENCES: UIPreferences = {
  projectsViewMode: 'cards',
  calendarViewMode: 'month',
  sidebarCollapsed: false,
  filtersVisible: true,
  approvedPostsSidebarVisible: false,
  showCompletedProjects: true,
  showArchivedProjects: false,
  compactMode: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  weekStartsOn: 0,
  theme: 'system',
  enableNotifications: true,
  notificationSound: true,
  showWeekNumbers: false,
  showWeekends: true,
  defaultEventDuration: 30,
  defaultProjectView: 'pipeline',
  autoExpandInsights: false,
  autoExpandPosts: false,
  enableAnimations: true,
  enableAutoSave: true,
  autoSaveInterval: 30
};

@Injectable({
  providedIn: 'root'
})
export class UIPreferencesStore {
  private readonly STORAGE_KEY = 'ui-preferences';
  
  // State signals
  private readonly _preferences = signal<UIPreferences>(this.loadPreferences());
  private readonly _recentViews = signal<string[]>([]);
  private readonly _pinnedProjects = signal<Set<string>>(new Set());
  private readonly _collapsedSections = signal<Set<string>>(new Set());

  // Public read-only signals
  readonly preferences = this._preferences.asReadonly();
  readonly recentViews = this._recentViews.asReadonly();
  readonly pinnedProjects = this._pinnedProjects.asReadonly();
  readonly collapsedSections = this._collapsedSections.asReadonly();

  // Computed values
  readonly projectsViewMode = computed(() => this._preferences().projectsViewMode);
  readonly calendarViewMode = computed(() => this._preferences().calendarViewMode);
  readonly sidebarCollapsed = computed(() => this._preferences().sidebarCollapsed);
  readonly filtersVisible = computed(() => this._preferences().filtersVisible);
  readonly theme = computed(() => this._preferences().theme);
  readonly timezone = computed(() => this._preferences().timezone);
  readonly compactMode = computed(() => this._preferences().compactMode);
  
  readonly isDarkMode = computed(() => {
    const theme = this._preferences().theme;
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    // System preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  readonly dateTimeFormat = computed(() => {
    const prefs = this._preferences();
    return {
      date: prefs.dateFormat,
      time: prefs.timeFormat,
      timezone: prefs.timezone
    };
  });

  constructor() {
    // Auto-save preferences to localStorage
    effect(() => {
      const prefs = this._preferences();
      this.savePreferences(prefs);
    });

    // Apply theme on change
    effect(() => {
      const isDark = this.isDarkMode();
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });

    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (this._preferences().theme === 'system') {
          // Trigger recomputation
          this._preferences.set({ ...this._preferences() });
        }
      });
    }
  }

  // Actions
  updatePreference<K extends keyof UIPreferences>(
    key: K, 
    value: UIPreferences[K]
  ): void {
    this._preferences.update(prefs => ({
      ...prefs,
      [key]: value
    }));
  }

  updatePreferences(updates: Partial<UIPreferences>): void {
    this._preferences.update(prefs => ({
      ...prefs,
      ...updates
    }));
  }

  resetPreferences(): void {
    this._preferences.set(DEFAULT_PREFERENCES);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // View mode helpers
  setProjectsViewMode(mode: ViewMode): void {
    this.updatePreference('projectsViewMode', mode);
    this.addToRecentViews(`projects-${mode}`);
  }

  setCalendarViewMode(mode: CalendarView): void {
    this.updatePreference('calendarViewMode', mode);
    this.addToRecentViews(`calendar-${mode}`);
  }

  toggleSidebar(): void {
    this.updatePreference('sidebarCollapsed', !this._preferences().sidebarCollapsed);
  }

  toggleFilters(): void {
    this.updatePreference('filtersVisible', !this._preferences().filtersVisible);
  }

  toggleCompactMode(): void {
    this.updatePreference('compactMode', !this._preferences().compactMode);
  }

  // Theme management
  setTheme(theme: ThemeMode): void {
    this.updatePreference('theme', theme);
  }

  toggleTheme(): void {
    const current = this._preferences().theme;
    const next = current === 'light' ? 'dark' : 
                 current === 'dark' ? 'system' : 'light';
    this.setTheme(next);
  }

  // Pinned projects
  pinProject(projectId: string): void {
    this._pinnedProjects.update(pinned => {
      const newPinned = new Set(pinned);
      newPinned.add(projectId);
      return newPinned;
    });
  }

  unpinProject(projectId: string): void {
    this._pinnedProjects.update(pinned => {
      const newPinned = new Set(pinned);
      newPinned.delete(projectId);
      return newPinned;
    });
  }

  togglePinProject(projectId: string): void {
    if (this._pinnedProjects().has(projectId)) {
      this.unpinProject(projectId);
    } else {
      this.pinProject(projectId);
    }
  }

  isPinned(projectId: string): boolean {
    return this._pinnedProjects().has(projectId);
  }

  // Collapsed sections
  toggleSection(sectionId: string): void {
    this._collapsedSections.update(sections => {
      const newSections = new Set(sections);
      if (newSections.has(sectionId)) {
        newSections.delete(sectionId);
      } else {
        newSections.add(sectionId);
      }
      return newSections;
    });
  }

  isSectionCollapsed(sectionId: string): boolean {
    return this._collapsedSections().has(sectionId);
  }

  // Recent views tracking
  private addToRecentViews(view: string): void {
    this._recentViews.update(views => {
      const newViews = [view, ...views.filter(v => v !== view)];
      return newViews.slice(0, 10); // Keep last 10
    });
  }

  // Persistence
  private loadPreferences(): UIPreferences {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load UI preferences:', error);
    }
    return DEFAULT_PREFERENCES;
  }

  private savePreferences(preferences: UIPreferences): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save UI preferences:', error);
    }
  }

  // URL state management (for filters and views)
  getUrlState(): Record<string, string> {
    const prefs = this._preferences();
    return {
      view: prefs.projectsViewMode,
      calendar: prefs.calendarViewMode,
      compact: prefs.compactMode ? '1' : '0'
    };
  }

  applyUrlState(params: Record<string, string>): void {
    if (params.view && ['cards', 'list', 'kanban'].includes(params.view)) {
      this.setProjectsViewMode(params.view as ViewMode);
    }
    if (params.calendar && ['month', 'week', 'day'].includes(params.calendar)) {
      this.setCalendarViewMode(params.calendar as CalendarView);
    }
    if (params.compact === '1' || params.compact === '0') {
      this.updatePreference('compactMode', params.compact === '1');
    }
  }
}