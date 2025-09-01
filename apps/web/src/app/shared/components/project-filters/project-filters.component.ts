import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { CalendarModule } from 'primeng/calendar';
import { SliderModule } from 'primeng/slider';
import { ChipModule } from 'primeng/chip';
import { AccordionModule } from 'primeng/accordion';

import { ContentProject, ProjectStage, Platform, SourceType } from '../../../core/models/project.model';

export interface ProjectFilter {
  stages: ProjectStage[];
  platforms: Platform[];
  sourceTypes: SourceType[];
  dateRange: { start: Date | null; end: Date | null };
  progressRange: { min: number; max: number };
  tags: string[];
  hasInsights: boolean | null;
  hasPosts: boolean | null;
  isPublished: boolean | null;
}

export interface SortOption {
  field: keyof ContentProject;
  order: 'asc' | 'desc';
  label: string;
}

@Component({
  selector: 'app-project-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DropdownModule,
    MultiSelectModule,
    CalendarModule,
    SliderModule,
    ChipModule,
    AccordionModule
  ],
  templateUrl: './project-filters.component.html',
  styleUrl: './project-filters.component.css'
})
export class ProjectFiltersComponent {
  @Input() projects: ContentProject[] = [];
  @Output() filterChange = new EventEmitter<ProjectFilter>();
  @Output() sortChange = new EventEmitter<SortOption>();

  // Filter state
  filter = signal<ProjectFilter>({
    stages: [],
    platforms: [],
    sourceTypes: [],
    dateRange: { start: null, end: null },
    progressRange: { min: 0, max: 100 },
    tags: [],
    hasInsights: null,
    hasPosts: null,
    isPublished: null
  });

  // Options for dropdowns
  stageOptions = Object.values(ProjectStage).map(stage => ({
    label: this.formatLabel(stage),
    value: stage
  }));

  platformOptions = Object.values(Platform).map(platform => ({
    label: platform,
    value: platform
  }));

  sourceTypeOptions = Object.values(SourceType).map(type => ({
    label: type,
    value: type
  }));

  sortOptions: SortOption[] = [
    { field: 'updatedAt', order: 'desc', label: 'Recently Updated' },
    { field: 'updatedAt', order: 'asc', label: 'Oldest Updated' },
    { field: 'createdAt', order: 'desc', label: 'Newest First' },
    { field: 'createdAt', order: 'asc', label: 'Oldest First' },
    { field: 'title', order: 'asc', label: 'Title (A-Z)' },
    { field: 'title', order: 'desc', label: 'Title (Z-A)' },
    { field: 'overallProgress', order: 'desc', label: 'Progress (High to Low)' },
    { field: 'overallProgress', order: 'asc', label: 'Progress (Low to High)' }
  ];

  selectedSort = signal<SortOption>(this.sortOptions[0]);
  showAdvanced = signal(false);
  activeFiltersCount = signal(0);

  // Available tags from all projects
  availableTags = signal<string[]>([]);

  ngOnInit() {
    this.extractAvailableTags();
    this.updateActiveFiltersCount();
  }

  ngOnChanges() {
    this.extractAvailableTags();
  }

  private extractAvailableTags() {
    const tagSet = new Set<string>();
    this.projects.forEach(project => {
      project.tags?.forEach(tag => tagSet.add(tag));
    });
    this.availableTags.set(Array.from(tagSet).sort());
  }

  updateFilter(updates: Partial<ProjectFilter>) {
    const currentFilter = this.filter();
    const newFilter = { ...currentFilter, ...updates };
    this.filter.set(newFilter);
    this.updateActiveFiltersCount();
    this.filterChange.emit(newFilter);
  }

  updateSort(option: SortOption) {
    this.selectedSort.set(option);
    this.sortChange.emit(option);
  }

  clearFilters() {
    const defaultFilter: ProjectFilter = {
      stages: [],
      platforms: [],
      sourceTypes: [],
      dateRange: { start: null, end: null },
      progressRange: { min: 0, max: 100 },
      tags: [],
      hasInsights: null,
      hasPosts: null,
      isPublished: null
    };
    this.filter.set(defaultFilter);
    this.updateActiveFiltersCount();
    this.filterChange.emit(defaultFilter);
  }

  toggleAdvanced() {
    this.showAdvanced.update(v => !v);
  }

  private updateActiveFiltersCount() {
    const f = this.filter();
    let count = 0;
    
    if (f.stages.length > 0) count++;
    if (f.platforms.length > 0) count++;
    if (f.sourceTypes.length > 0) count++;
    if (f.dateRange.start || f.dateRange.end) count++;
    if (f.progressRange.min > 0 || f.progressRange.max < 100) count++;
    if (f.tags.length > 0) count++;
    if (f.hasInsights !== null) count++;
    if (f.hasPosts !== null) count++;
    if (f.isPublished !== null) count++;
    
    this.activeFiltersCount.set(count);
  }

  removeStage(stage: ProjectStage) {
    const current = this.filter();
    const stages = current.stages.filter(s => s !== stage);
    this.updateFilter({ stages });
  }

  removePlatform(platform: Platform) {
    const current = this.filter();
    const platforms = current.platforms.filter(p => p !== platform);
    this.updateFilter({ platforms });
  }

  removeTag(tag: string) {
    const current = this.filter();
    const tags = current.tags.filter(t => t !== tag);
    this.updateFilter({ tags });
  }

  private formatLabel(value: string): string {
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  applyFilter(projects: ContentProject[]): ContentProject[] {
    const f = this.filter();
    
    return projects.filter(project => {
      // Stage filter
      if (f.stages.length > 0 && !f.stages.includes(project.currentStage)) {
        return false;
      }

      // Platform filter
      if (f.platforms.length > 0) {
        const hasAnyPlatform = f.platforms.some(p => project.targetPlatforms?.includes(p));
        if (!hasAnyPlatform) return false;
      }

      // Source type filter
      if (f.sourceTypes.length > 0 && !f.sourceTypes.includes(project.sourceType)) {
        return false;
      }

      // Date range filter
      if (f.dateRange.start || f.dateRange.end) {
        const projectDate = new Date(project.updatedAt);
        if (f.dateRange.start && projectDate < f.dateRange.start) return false;
        if (f.dateRange.end && projectDate > f.dateRange.end) return false;
      }

      // Progress filter
      if (project.overallProgress < f.progressRange.min || 
          project.overallProgress > f.progressRange.max) {
        return false;
      }

      // Tags filter
      if (f.tags.length > 0) {
        const hasAllTags = f.tags.every(tag => project.tags?.includes(tag));
        if (!hasAllTags) return false;
      }

      // Has insights filter
      if (f.hasInsights !== null) {
        const hasInsights = (project.summary?.insightsTotal || 0) > 0;
        if (f.hasInsights !== hasInsights) return false;
      }

      // Has posts filter
      if (f.hasPosts !== null) {
        const hasPosts = (project.summary?.postsTotal || 0) > 0;
        if (f.hasPosts !== hasPosts) return false;
      }

      // Is published filter
      if (f.isPublished !== null) {
        const isPublished = project.currentStage === ProjectStage.PUBLISHED;
        if (f.isPublished !== isPublished) return false;
      }

      return true;
    });
  }

  applySort(projects: ContentProject[]): ContentProject[] {
    const sort = this.selectedSort();
    return [...projects].sort((a, b) => {
      const aVal = a[sort.field];
      const bVal = b[sort.field];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      } else {
        comparison = Number(aVal) - Number(bVal);
      }
      
      return sort.order === 'asc' ? comparison : -comparison;
    });
  }
}