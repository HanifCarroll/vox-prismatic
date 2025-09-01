import { Component, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStage, Platform } from '../../../core/models/project.model';

export interface ProjectFilterConfig {
  stages: ProjectStage[];
  platforms: Platform[];
  tags: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchTerm: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  config: ProjectFilterConfig;
}

@Component({
  selector: 'app-project-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow h-full">
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">Filters</h3>
          <button 
            (click)="clearFilters()"
            class="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        </div>
      </div>
      
      <div class="p-4 space-y-6">
        <!-- Search -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <input
            type="text"
            [ngModel]="searchTerm()"
            (ngModelChange)="updateSearch($event)"
            placeholder="Search projects..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <!-- Stage Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Project Stage</label>
          <div class="space-y-2">
            <label *ngFor="let stage of allStages" class="flex items-center">
              <input
                type="checkbox"
                [checked]="isStageSelected(stage)"
                (change)="toggleStage(stage)"
                class="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm">{{ formatStage(stage) }}</span>
              <span class="ml-auto text-xs text-gray-500">{{ getStageCount(stage) }}</span>
            </label>
          </div>
        </div>
        
        <!-- Platform Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Target Platforms</label>
          <div class="space-y-2">
            <label *ngFor="let platform of allPlatforms" class="flex items-center">
              <input
                type="checkbox"
                [checked]="isPlatformSelected(platform)"
                (change)="togglePlatform(platform)"
                class="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm">{{ formatPlatform(platform) }}</span>
            </label>
          </div>
        </div>
        
        <!-- Date Range -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <div class="space-y-2">
            <input
              type="date"
              [ngModel]="dateRangeStart()"
              (ngModelChange)="updateDateRangeStart($event)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Start date"
            />
            <input
              type="date"
              [ngModel]="dateRangeEnd()"
              (ngModelChange)="updateDateRangeEnd($event)"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="End date"
            />
          </div>
        </div>
        
        <!-- Tags Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tags</label>
          <div class="flex flex-wrap gap-2">
            <button
              *ngFor="let tag of availableTags"
              (click)="toggleTag(tag)"
              [class.bg-blue-600]="isTagSelected(tag)"
              [class.text-white]="isTagSelected(tag)"
              [class.bg-gray-200]="!isTagSelected(tag)"
              [class.text-gray-700]="!isTagSelected(tag)"
              class="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            >
              {{ tag }}
            </button>
          </div>
        </div>
        
        <!-- Filter Presets -->
        <div class="border-t pt-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Saved Filters</label>
          <div class="space-y-2">
            <button
              *ngFor="let preset of filterPresets()"
              (click)="applyPreset(preset)"
              class="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {{ preset.name }}
            </button>
          </div>
          <button
            (click)="saveCurrentAsPreset()"
            [disabled]="!hasActiveFilters()"
            class="mt-2 w-full px-3 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Current Filter
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ProjectFiltersComponent {
  @Output() filterChanged = new EventEmitter<ProjectFilterConfig>();
  
  // Filter state signals
  selectedStages = signal<ProjectStage[]>([]);
  selectedPlatforms = signal<Platform[]>([]);
  selectedTags = signal<string[]>([]);
  dateRangeStart = signal<string>('');
  dateRangeEnd = signal<string>('');
  searchTerm = signal('');
  
  // Filter presets
  filterPresets = signal<FilterPreset[]>([
    {
      id: 'needs-review',
      name: 'Needs Review',
      config: {
        stages: [ProjectStage.INSIGHTS_READY, ProjectStage.POSTS_GENERATED],
        platforms: [],
        tags: [],
        dateRange: { start: null, end: null },
        searchTerm: ''
      }
    },
    {
      id: 'ready-to-publish',
      name: 'Ready to Publish',
      config: {
        stages: [ProjectStage.POSTS_APPROVED, ProjectStage.SCHEDULED],
        platforms: [],
        tags: [],
        dateRange: { start: null, end: null },
        searchTerm: ''
      }
    },
    {
      id: 'in-progress',
      name: 'In Progress',
      config: {
        stages: [ProjectStage.PROCESSING_CONTENT, ProjectStage.PUBLISHING],
        platforms: [],
        tags: [],
        dateRange: { start: null, end: null },
        searchTerm: ''
      }
    }
  ]);
  
  // Available options
  allStages = Object.values(ProjectStage);
  allPlatforms = Object.values(Platform);
  availableTags = ['AI', 'Technology', 'Innovation', 'Leadership', 'Marketing', 
                    'Strategy', 'Growth', 'Productivity', 'Insights', 'Trends'];
  
  // Stage counts (would be provided by parent component in real implementation)
  stageCounts = signal<Record<ProjectStage, number>>({} as any);
  
  hasActiveFilters = computed(() => {
    return this.selectedStages().length > 0 ||
           this.selectedPlatforms().length > 0 ||
           this.selectedTags().length > 0 ||
           this.dateRangeStart() !== '' ||
           this.dateRangeEnd() !== '' ||
           this.searchTerm() !== '';
  });
  
  ngOnInit() {
    // Emit initial state
    this.emitFilterConfig();
  }
  
  updateSearch(term: string) {
    this.searchTerm.set(term);
    this.emitFilterConfig();
  }
  
  toggleStage(stage: ProjectStage) {
    const current = this.selectedStages();
    if (this.isStageSelected(stage)) {
      this.selectedStages.set(current.filter(s => s !== stage));
    } else {
      this.selectedStages.set([...current, stage]);
    }
    this.emitFilterConfig();
  }
  
  togglePlatform(platform: Platform) {
    const current = this.selectedPlatforms();
    if (this.isPlatformSelected(platform)) {
      this.selectedPlatforms.set(current.filter(p => p !== platform));
    } else {
      this.selectedPlatforms.set([...current, platform]);
    }
    this.emitFilterConfig();
  }
  
  toggleTag(tag: string) {
    const current = this.selectedTags();
    if (this.isTagSelected(tag)) {
      this.selectedTags.set(current.filter(t => t !== tag));
    } else {
      this.selectedTags.set([...current, tag]);
    }
    this.emitFilterConfig();
  }
  
  updateDateRangeStart(date: string) {
    this.dateRangeStart.set(date);
    this.emitFilterConfig();
  }
  
  updateDateRangeEnd(date: string) {
    this.dateRangeEnd.set(date);
    this.emitFilterConfig();
  }
  
  isStageSelected(stage: ProjectStage): boolean {
    return this.selectedStages().includes(stage);
  }
  
  isPlatformSelected(platform: Platform): boolean {
    return this.selectedPlatforms().includes(platform);
  }
  
  isTagSelected(tag: string): boolean {
    return this.selectedTags().includes(tag);
  }
  
  clearFilters() {
    this.selectedStages.set([]);
    this.selectedPlatforms.set([]);
    this.selectedTags.set([]);
    this.dateRangeStart.set('');
    this.dateRangeEnd.set('');
    this.searchTerm.set('');
    this.emitFilterConfig();
  }
  
  applyPreset(preset: FilterPreset) {
    this.selectedStages.set(preset.config.stages);
    this.selectedPlatforms.set(preset.config.platforms);
    this.selectedTags.set(preset.config.tags);
    this.dateRangeStart.set(preset.config.dateRange.start ? preset.config.dateRange.start.toISOString().split('T')[0] : '');
    this.dateRangeEnd.set(preset.config.dateRange.end ? preset.config.dateRange.end.toISOString().split('T')[0] : '');
    this.searchTerm.set(preset.config.searchTerm);
    this.emitFilterConfig();
  }
  
  saveCurrentAsPreset() {
    const name = prompt('Enter a name for this filter preset:');
    if (name) {
      const newPreset: FilterPreset = {
        id: `custom-${Date.now()}`,
        name,
        config: this.getCurrentFilterConfig()
      };
      this.filterPresets.update(presets => [...presets, newPreset]);
    }
  }
  
  private getCurrentFilterConfig(): ProjectFilterConfig {
    return {
      stages: this.selectedStages(),
      platforms: this.selectedPlatforms(),
      tags: this.selectedTags(),
      dateRange: {
        start: this.dateRangeStart() ? new Date(this.dateRangeStart()) : null,
        end: this.dateRangeEnd() ? new Date(this.dateRangeEnd()) : null
      },
      searchTerm: this.searchTerm()
    };
  }
  
  private emitFilterConfig() {
    this.filterChanged.emit(this.getCurrentFilterConfig());
  }
  
  formatStage(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  
  formatPlatform(platform: string): string {
    return platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
  }
  
  getStageCount(stage: ProjectStage): number {
    return this.stageCounts()[stage] || 0;
  }
  
  setStageCountsFromProjects(projects: any[]) {
    const counts: Record<ProjectStage, number> = {} as any;
    Object.values(ProjectStage).forEach(stage => {
      counts[stage] = projects.filter(p => p.currentStage === stage).length;
    });
    this.stageCounts.set(counts);
  }
}