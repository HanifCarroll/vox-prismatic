import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Insight } from '../../../core/models/project.model';
import { ProjectService } from '../../../core/services/project.service';

interface InsightFilter {
  showApproved: boolean;
  showPending: boolean;
  minScore: number;
  category: string;
  sortBy: 'score' | 'date' | 'category';
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-insight-reviewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header and Controls -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-800">Insights Review</h2>
            <p class="text-sm text-gray-600 mt-1">
              Review and approve insights extracted from the transcript
            </p>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-sm text-gray-600">
              <span class="font-medium">{{ getApprovedCount() }}</span> of 
              <span class="font-medium">{{ insights.length }}</span> approved
            </div>
            <div class="h-8 w-px bg-gray-300"></div>
            <button
              (click)="toggleFilters()"
              class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <i class="pi pi-filter mr-1"></i>
              Filters
              <span *ngIf="hasActiveFilters()" class="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {{ getActiveFilterCount() }}
              </span>
            </button>
          </div>
        </div>
        
        <!-- Filters Panel -->
        <div *ngIf="showFilters" class="border-t pt-4 mt-4">
          <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                [(ngModel)]="filterStatus"
                (ngModelChange)="applyFilters()"
                class="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Min Score</label>
              <input
                type="number"
                [(ngModel)]="filters.minScore"
                (ngModelChange)="applyFilters()"
                min="0"
                max="100"
                class="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                [(ngModel)]="filters.category"
                (ngModelChange)="applyFilters()"
                class="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
              <select
                [(ngModel)]="filters.sortBy"
                (ngModelChange)="applyFilters()"
                class="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="score">Score</option>
                <option value="date">Date</option>
                <option value="category">Category</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Order</label>
              <select
                [(ngModel)]="filters.sortOrder"
                (ngModelChange)="applyFilters()"
                class="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">High to Low</option>
                <option value="asc">Low to High</option>
              </select>
            </div>
            <div class="flex items-end">
              <button
                (click)="resetFilters()"
                class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
        
        <!-- Bulk Actions -->
        <div class="flex items-center justify-between mt-4">
          <div class="flex items-center space-x-2">
            <input
              type="checkbox"
              [(ngModel)]="selectAll"
              (change)="toggleSelectAll()"
              class="rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
            >
            <span class="text-sm text-gray-600">
              {{ selectedInsights.size }} selected
            </span>
          </div>
          <div class="flex items-center space-x-2" *ngIf="selectedInsights.size > 0">
            <button
              (click)="bulkApprove()"
              class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <i class="pi pi-check mr-1"></i>
              Approve Selected
            </button>
            <button
              (click)="bulkReject()"
              class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              <i class="pi pi-times mr-1"></i>
              Reject Selected
            </button>
            <button
              (click)="autoApproveHighScore()"
              class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <i class="pi pi-bolt mr-1"></i>
              Auto-Approve (Score > 80)
            </button>
          </div>
        </div>
      </div>
      
      <!-- Insights List -->
      <div class="space-y-4">
        <div 
          *ngFor="let insight of filteredInsights; let i = index"
          class="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          [class.border-l-4]="insight.isApproved"
          [class.border-green-500]="insight.isApproved"
        >
          <div class="p-4">
            <div class="flex items-start space-x-3">
              <!-- Selection Checkbox -->
              <input
                type="checkbox"
                [checked]="selectedInsights.has(insight.id)"
                (change)="toggleSelection(insight.id)"
                class="mt-1 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
              >
              
              <!-- Content -->
              <div class="flex-1">
                <!-- Header -->
                <div class="flex items-start justify-between mb-2">
                  <div class="flex items-center space-x-3">
                    <span class="text-sm font-medium text-gray-900">
                      Insight #{{ i + 1 }}
                    </span>
                    <span 
                      *ngIf="insight.category"
                      class="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
                    >
                      {{ insight.category }}
                    </span>
                    <span 
                      *ngIf="insight.postType"
                      class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                    >
                      {{ insight.postType }}
                    </span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <div 
                      class="flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      [ngClass]="getScoreClass(insight.score)"
                    >
                      <i class="pi pi-star-fill mr-1"></i>
                      Score: {{ insight.score }}
                    </div>
                    <span 
                      *ngIf="insight.isApproved"
                      class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                    >
                      <i class="pi pi-check-circle mr-1"></i>
                      Approved
                    </span>
                  </div>
                </div>
                
                <!-- Insight Content -->
                <div class="mb-3">
                  <p class="text-gray-700 leading-relaxed">{{ insight.content }}</p>
                </div>
                
                <!-- Verbatim Quote -->
                <div class="bg-gray-50 border-l-4 border-gray-300 p-3 mb-3">
                  <p class="text-sm text-gray-600 mb-1 font-medium">Verbatim Quote:</p>
                  <p class="text-sm text-gray-700 italic">"{{ insight.quote }}"</p>
                </div>
                
                <!-- Actions -->
                <div class="flex items-center justify-between">
                  <div class="text-xs text-gray-500">
                    Created {{ formatRelativeDate(insight.createdAt) }}
                    <span *ngIf="insight.reviewedBy">
                      • Reviewed by {{ insight.reviewedBy }}
                    </span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button
                      *ngIf="!insight.isApproved"
                      (click)="approveInsight(insight)"
                      class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      <i class="pi pi-check mr-1"></i>
                      Approve
                    </button>
                    <button
                      *ngIf="!insight.isApproved"
                      (click)="rejectInsight(insight)"
                      class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      <i class="pi pi-times mr-1"></i>
                      Reject
                    </button>
                    <button
                      *ngIf="insight.isApproved"
                      (click)="revokeApproval(insight)"
                      class="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      <i class="pi pi-undo mr-1"></i>
                      Revoke
                    </button>
                    <button
                      (click)="editInsight(insight)"
                      class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      <i class="pi pi-pencil mr-1"></i>
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Empty State -->
        <div *ngIf="filteredInsights.length === 0" class="bg-white rounded-lg shadow p-12 text-center">
          <i class="pi pi-lightbulb text-5xl text-gray-300 mb-4"></i>
          <p class="text-lg text-gray-600 mb-2">No insights found</p>
          <p class="text-sm text-gray-500">
            {{ insights.length === 0 ? 'Generate insights from the transcript to get started' : 'Try adjusting your filters' }}
          </p>
        </div>
      </div>
      
      <!-- Summary Stats -->
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Summary Statistics</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900">{{ insights.length }}</div>
            <div class="text-xs text-gray-500">Total Insights</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ getApprovedCount() }}</div>
            <div class="text-xs text-gray-500">Approved</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-yellow-600">{{ getPendingCount() }}</div>
            <div class="text-xs text-gray-500">Pending Review</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ getAverageScore() }}</div>
            <div class="text-xs text-gray-500">Average Score</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .insight-card {
      transition: all 0.2s ease;
    }
    
    .insight-card:hover {
      transform: translateY(-2px);
    }
  `]
})
export class InsightReviewerComponent {
  @Input() insights: Insight[] = [];
  @Input() projectId!: string;
  @Output() insightsUpdated = new EventEmitter<Insight[]>();
  
  private projectService = inject(ProjectService);
  
  filteredInsights: Insight[] = [];
  selectedInsights = new Set<string>();
  selectAll = false;
  showFilters = false;
  filterStatus = 'all';
  
  filters: InsightFilter = {
    showApproved: true,
    showPending: true,
    minScore: 0,
    category: '',
    sortBy: 'score',
    sortOrder: 'desc'
  };
  
  categories: string[] = [];
  
  ngOnInit(): void {
    this.extractCategories();
    this.applyFilters();
  }
  
  ngOnChanges(): void {
    this.extractCategories();
    this.applyFilters();
  }
  
  extractCategories(): void {
    const cats = new Set<string>();
    this.insights.forEach(insight => {
      if (insight.category) {
        cats.add(insight.category);
      }
    });
    this.categories = Array.from(cats).sort();
  }
  
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }
  
  applyFilters(): void {
    let filtered = [...this.insights];
    
    // Status filter
    if (this.filterStatus === 'approved') {
      filtered = filtered.filter(i => i.isApproved);
    } else if (this.filterStatus === 'pending') {
      filtered = filtered.filter(i => !i.isApproved);
    }
    
    // Score filter
    if (this.filters.minScore > 0) {
      filtered = filtered.filter(i => i.score >= this.filters.minScore);
    }
    
    // Category filter
    if (this.filters.category) {
      filtered = filtered.filter(i => i.category === this.filters.category);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (this.filters.sortBy) {
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
      }
      
      return this.filters.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    this.filteredInsights = filtered;
  }
  
  resetFilters(): void {
    this.filterStatus = 'all';
    this.filters = {
      showApproved: true,
      showPending: true,
      minScore: 0,
      category: '',
      sortBy: 'score',
      sortOrder: 'desc'
    };
    this.applyFilters();
  }
  
  hasActiveFilters(): boolean {
    return this.filterStatus !== 'all' || 
           this.filters.minScore > 0 || 
           this.filters.category !== '';
  }
  
  getActiveFilterCount(): number {
    let count = 0;
    if (this.filterStatus !== 'all') count++;
    if (this.filters.minScore > 0) count++;
    if (this.filters.category) count++;
    return count;
  }
  
  toggleSelectAll(): void {
    if (this.selectAll) {
      this.filteredInsights.forEach(insight => {
        this.selectedInsights.add(insight.id);
      });
    } else {
      this.selectedInsights.clear();
    }
  }
  
  toggleSelection(insightId: string): void {
    if (this.selectedInsights.has(insightId)) {
      this.selectedInsights.delete(insightId);
    } else {
      this.selectedInsights.add(insightId);
    }
    
    this.selectAll = this.selectedInsights.size === this.filteredInsights.length;
  }
  
  approveInsight(insight: Insight): void {
    this.projectService.updateInsight(this.projectId, insight.id, {
      isApproved: true,
      reviewedAt: new Date().toISOString()
    }).subscribe({
      next: () => {
        insight.isApproved = true;
        insight.reviewedAt = new Date();
        this.insightsUpdated.emit(this.insights);
      }
    });
  }
  
  rejectInsight(insight: Insight): void {
    this.projectService.updateInsight(this.projectId, insight.id, {
      isApproved: false,
      reviewedAt: new Date().toISOString()
    }).subscribe({
      next: () => {
        insight.isApproved = false;
        insight.reviewedAt = new Date();
        this.insightsUpdated.emit(this.insights);
      }
    });
  }
  
  revokeApproval(insight: Insight): void {
    this.projectService.updateInsight(this.projectId, insight.id, {
      isApproved: false,
      reviewedAt: null
    }).subscribe({
      next: () => {
        insight.isApproved = false;
        insight.reviewedAt = undefined;
        this.insightsUpdated.emit(this.insights);
      }
    });
  }
  
  editInsight(insight: Insight): void {
    // TODO: Implement inline editing
    console.log('Edit insight:', insight);
  }
  
  bulkApprove(): void {
    const selectedIds = Array.from(this.selectedInsights);
    const updates = selectedIds.map(id => 
      this.projectService.updateInsight(this.projectId, id, {
        isApproved: true,
        reviewedAt: new Date().toISOString()
      })
    );
    
    // Execute all updates
    Promise.all(updates.map(obs => obs.toPromise())).then(() => {
      this.insights.forEach(insight => {
        if (this.selectedInsights.has(insight.id)) {
          insight.isApproved = true;
          insight.reviewedAt = new Date();
        }
      });
      this.selectedInsights.clear();
      this.selectAll = false;
      this.insightsUpdated.emit(this.insights);
    });
  }
  
  bulkReject(): void {
    const selectedIds = Array.from(this.selectedInsights);
    const updates = selectedIds.map(id => 
      this.projectService.updateInsight(this.projectId, id, {
        isApproved: false,
        reviewedAt: new Date().toISOString()
      })
    );
    
    Promise.all(updates.map(obs => obs.toPromise())).then(() => {
      this.insights.forEach(insight => {
        if (this.selectedInsights.has(insight.id)) {
          insight.isApproved = false;
          insight.reviewedAt = new Date();
        }
      });
      this.selectedInsights.clear();
      this.selectAll = false;
      this.insightsUpdated.emit(this.insights);
    });
  }
  
  autoApproveHighScore(): void {
    const highScoreInsights = this.insights.filter(i => i.score >= 80 && !i.isApproved);
    const updates = highScoreInsights.map(insight => 
      this.projectService.updateInsight(this.projectId, insight.id, {
        isApproved: true,
        reviewedAt: new Date().toISOString()
      })
    );
    
    Promise.all(updates.map(obs => obs.toPromise())).then(() => {
      highScoreInsights.forEach(insight => {
        insight.isApproved = true;
        insight.reviewedAt = new Date();
      });
      this.insightsUpdated.emit(this.insights);
    });
  }
  
  getApprovedCount(): number {
    return this.insights.filter(i => i.isApproved).length;
  }
  
  getPendingCount(): number {
    return this.insights.filter(i => !i.isApproved).length;
  }
  
  getAverageScore(): number {
    if (this.insights.length === 0) return 0;
    const total = this.insights.reduce((sum, i) => sum + i.score, 0);
    return Math.round(total / this.insights.length);
  }
  
  getScoreClass(score: number): string {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    if (score >= 40) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  }
  
  formatRelativeDate(date: Date | string): string {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return then.toLocaleDateString();
  }
}