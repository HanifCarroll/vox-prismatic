import { Component, OnInit, inject, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DashboardService } from '../../../core/services/dashboard.service';
import { ProjectService } from '../../../core/services/project.service';
import { ContentProject, ProjectStage } from '../../../core/models/project.model';

export interface ActionItem {
  id: string;
  type: 'insight_review' | 'post_approval' | 'scheduling' | 'failed_job' | 'blocked_pipeline';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  projectId?: string;
  projectTitle?: string;
  entityId?: string;
  entityType?: 'transcript' | 'insight' | 'post';
  count?: number;
  createdAt: Date;
  action: {
    label: string;
    route?: string[];
    handler?: () => void;
  };
}

@Component({
  selector: 'app-action-center',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div [class]="'bg-white rounded-lg shadow-md ' + className">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <i class="pi pi-bell text-xl text-orange-500 mr-2"></i>
            <h3 class="text-lg font-semibold text-gray-800">Action Center</h3>
            <span 
              *ngIf="totalActionItems() > 0"
              class="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full"
            >
              {{ totalActionItems() }}
            </span>
          </div>
          
          <!-- Filter Pills -->
          <div class="flex items-center space-x-2">
            <button
              *ngFor="let filter of filters"
              (click)="activeFilter.set(filter.value)"
              class="px-3 py-1 text-xs rounded-full transition-colors"
              [class.bg-blue-100]="activeFilter() === filter.value"
              [class.text-blue-700]="activeFilter() === filter.value"
              [class.font-semibold]="activeFilter() === filter.value"
              [class.bg-gray-100]="activeFilter() !== filter.value"
              [class.text-gray-600]="activeFilter() !== filter.value"
            >
              {{ filter.label }}
              <span 
                *ngIf="filter.count > 0"
                class="ml-1"
              >
                ({{ filter.count }})
              </span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Loading State -->
      <div *ngIf="isLoading()" class="px-6 py-8 text-center">
        <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
        <p class="mt-2 text-gray-500">Loading action items...</p>
      </div>
      
      <!-- Action Items List -->
      <div *ngIf="!isLoading() && filteredActionItems().length > 0" class="divide-y divide-gray-200">
        <div 
          *ngFor="let item of filteredActionItems()"
          class="px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-start justify-between">
            <!-- Icon and Content -->
            <div class="flex items-start space-x-3">
              <!-- Priority Icon -->
              <div 
                class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                [class.bg-red-100]="item.priority === 'high'"
                [class.bg-yellow-100]="item.priority === 'medium'"
                [class.bg-blue-100]="item.priority === 'low'"
              >
                <i 
                  [class]="'pi ' + getActionIcon(item.type)"
                  [class.text-red-600]="item.priority === 'high'"
                  [class.text-yellow-600]="item.priority === 'medium'"
                  [class.text-blue-600]="item.priority === 'low'"
                ></i>
              </div>
              
              <!-- Content -->
              <div class="flex-1">
                <div class="flex items-center">
                  <h4 class="text-sm font-medium text-gray-900">
                    {{ item.title }}
                  </h4>
                  <span 
                    *ngIf="item.count && item.count > 1"
                    class="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
                  >
                    {{ item.count }} items
                  </span>
                </div>
                
                <p class="text-sm text-gray-600 mt-1">
                  {{ item.description }}
                </p>
                
                <!-- Project Context -->
                <div *ngIf="item.projectTitle" class="mt-2 flex items-center text-xs text-gray-500">
                  <i class="pi pi-folder mr-1"></i>
                  <span>{{ item.projectTitle }}</span>
                </div>
                
                <!-- Time -->
                <div class="mt-2 text-xs text-gray-400">
                  {{ formatTime(item.createdAt) }}
                </div>
              </div>
            </div>
            
            <!-- Action Button -->
            <div class="flex-shrink-0 ml-4">
              <button
                *ngIf="item.action.route"
                [routerLink]="item.action.route"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {{ item.action.label }}
                <i class="pi pi-arrow-right ml-1"></i>
              </button>
              <button
                *ngIf="item.action.handler && !item.action.route"
                (click)="item.action.handler!()"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {{ item.action.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div *ngIf="!isLoading() && filteredActionItems().length === 0" class="px-6 py-12 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <i class="pi pi-check-circle text-3xl text-green-600"></i>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
        <p class="text-sm text-gray-500">
          {{ activeFilter() === 'all' ? 'No action items require your attention' : `No ${activeFilter()} items` }}
        </p>
      </div>
      
      <!-- Quick Actions Footer -->
      <div *ngIf="!isLoading() && showQuickActions" class="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500">Quick Actions:</span>
          <div class="flex items-center space-x-2">
            <button
              (click)="approveAllInsights()"
              *ngIf="hasInsightReviews()"
              class="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium rounded-lg transition-colors"
            >
              <i class="pi pi-check mr-1"></i>
              Approve All Insights
            </button>
            <button
              (click)="scheduleAllPosts()"
              *ngIf="hasSchedulingItems()"
              class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded-lg transition-colors"
            >
              <i class="pi pi-calendar mr-1"></i>
              Bulk Schedule
            </button>
            <button
              (click)="retryAllFailed()"
              *ngIf="hasFailedItems()"
              class="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs font-medium rounded-lg transition-colors"
            >
              <i class="pi pi-refresh mr-1"></i>
              Retry Failed
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ActionCenterComponent implements OnInit {
  @Input() className = '';
  @Input() showQuickActions = true;
  @Input() maxItems = 10;
  
  private dashboardService = inject(DashboardService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  
  // State signals
  actionItems = signal<ActionItem[]>([]);
  isLoading = signal(true);
  activeFilter = signal<'all' | 'high' | 'insights' | 'posts' | 'failed'>('all');
  
  // Computed values
  filteredActionItems = computed(() => {
    const items = this.actionItems();
    const filter = this.activeFilter();
    
    let filtered = items;
    
    switch (filter) {
      case 'high':
        filtered = items.filter(i => i.priority === 'high');
        break;
      case 'insights':
        filtered = items.filter(i => i.type === 'insight_review');
        break;
      case 'posts':
        filtered = items.filter(i => i.type === 'post_approval' || i.type === 'scheduling');
        break;
      case 'failed':
        filtered = items.filter(i => i.type === 'failed_job' || i.type === 'blocked_pipeline');
        break;
    }
    
    return filtered.slice(0, this.maxItems);
  });
  
  totalActionItems = computed(() => this.actionItems().length);
  
  hasInsightReviews = computed(() => 
    this.actionItems().some(i => i.type === 'insight_review')
  );
  
  hasSchedulingItems = computed(() => 
    this.actionItems().some(i => i.type === 'scheduling')
  );
  
  hasFailedItems = computed(() => 
    this.actionItems().some(i => i.type === 'failed_job')
  );
  
  filters = computed(() => [
    { 
      label: 'All', 
      value: 'all' as const, 
      count: this.totalActionItems() 
    },
    { 
      label: 'High Priority', 
      value: 'high' as const, 
      count: this.actionItems().filter(i => i.priority === 'high').length 
    },
    { 
      label: 'Insights', 
      value: 'insights' as const, 
      count: this.actionItems().filter(i => i.type === 'insight_review').length 
    },
    { 
      label: 'Posts', 
      value: 'posts' as const, 
      count: this.actionItems().filter(i => i.type === 'post_approval' || i.type === 'scheduling').length 
    },
    { 
      label: 'Failed', 
      value: 'failed' as const, 
      count: this.actionItems().filter(i => i.type === 'failed_job' || i.type === 'blocked_pipeline').length 
    }
  ]);
  
  ngOnInit(): void {
    this.loadActionItems();
  }
  
  loadActionItems(): void {
    this.isLoading.set(true);
    
    // Load dashboard data to get actionable items
    this.dashboardService.getDashboard().subscribe(result => {
      if (result.success && result.data) {
        const items: ActionItem[] = [];
        const data = result.data;
        
        // Convert actionable items to action items
        if (data.actionableItems) {
          // Insights needing review
          if (data.actionableItems.insightsToReview > 0) {
            items.push({
              id: 'insights-review',
              type: 'insight_review',
              priority: 'high',
              title: 'Insights Need Review',
              description: `${data.actionableItems.insightsToReview} insights are ready for your review`,
              count: data.actionableItems.insightsToReview,
              createdAt: new Date(),
              action: {
                label: 'Review',
                route: ['/projects']
              }
            });
          }
          
          // Posts needing approval
          if (data.actionableItems.postsToApprove > 0) {
            items.push({
              id: 'posts-approval',
              type: 'post_approval',
              priority: 'high',
              title: 'Posts Awaiting Approval',
              description: `${data.actionableItems.postsToApprove} posts need your approval before scheduling`,
              count: data.actionableItems.postsToApprove,
              createdAt: new Date(),
              action: {
                label: 'Review',
                route: ['/projects']
              }
            });
          }
          
          // Posts ready to schedule
          if (data.actionableItems.postsToSchedule > 0) {
            items.push({
              id: 'posts-schedule',
              type: 'scheduling',
              priority: 'medium',
              title: 'Ready to Schedule',
              description: `${data.actionableItems.postsToSchedule} approved posts can be scheduled`,
              count: data.actionableItems.postsToSchedule,
              createdAt: new Date(),
              action: {
                label: 'Schedule',
                route: ['/calendar']
              }
            });
          }
          
          // Failed transcripts
          if (data.actionableItems.transcriptsToProcess > 0) {
            items.push({
              id: 'transcripts-failed',
              type: 'failed_job',
              priority: 'high',
              title: 'Processing Failed',
              description: `${data.actionableItems.transcriptsToProcess} transcripts failed to process`,
              count: data.actionableItems.transcriptsToProcess,
              createdAt: new Date(),
              action: {
                label: 'Retry',
                handler: () => this.retryAllFailed()
              }
            });
          }
        }
        
        this.actionItems.set(items);
      }
      
      this.isLoading.set(false);
    });
  }
  
  getActionIcon(type: ActionItem['type']): string {
    const icons: Record<ActionItem['type'], string> = {
      'insight_review': 'pi-eye',
      'post_approval': 'pi-check-square',
      'scheduling': 'pi-calendar',
      'failed_job': 'pi-exclamation-triangle',
      'blocked_pipeline': 'pi-ban'
    };
    return icons[type] || 'pi-bell';
  }
  
  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }
  
  approveAllInsights(): void {
    console.log('Approving all insights...');
    // TODO: Implement bulk approval
    this.loadActionItems();
  }
  
  scheduleAllPosts(): void {
    console.log('Opening bulk scheduling...');
    this.router.navigate(['/calendar'], { queryParams: { mode: 'bulk-schedule' } });
  }
  
  retryAllFailed(): void {
    console.log('Retrying all failed jobs...');
    // TODO: Implement retry logic
    this.loadActionItems();
  }
}