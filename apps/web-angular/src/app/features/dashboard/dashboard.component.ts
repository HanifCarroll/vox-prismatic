import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProjectService } from '../../core/services/project.service';
import { DashboardService, DashboardData } from '../../core/services/dashboard.service';
import { ContentProject, ProjectStage } from '../../core/models/project.model';
import { PipelineVisualizationComponent } from '../../shared/components/pipeline-visualization/pipeline-visualization.component';
import { ActivityTimelineComponent } from '../projects/activity-timeline/activity-timeline.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PipelineVisualizationComponent, ActivityTimelineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p class="text-gray-600 mt-1">Monitor your content pipeline and manage projects</p>
        </div>
        <button 
          routerLink="/projects/new"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-md"
        >
          <i class="pi pi-plus mr-2"></i>
          New Project
        </button>
      </div>
      
      <!-- Project Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Total Projects</p>
              <p class="text-3xl font-bold text-gray-900">{{ totalProjects() }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ activeProjects() }} active</p>
            </div>
            <div class="bg-blue-100 p-3 rounded-full">
              <i class="pi pi-folder text-2xl text-blue-600"></i>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Published Content</p>
              <p class="text-3xl font-bold text-gray-900">{{ publishedContent() }}</p>
              <p class="text-xs text-gray-500 mt-1">This month</p>
            </div>
            <div class="bg-green-100 p-3 rounded-full">
              <i class="pi pi-check-circle text-2xl text-green-600"></i>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Insights Generated</p>
              <p class="text-3xl font-bold text-gray-900">{{ totalInsights() }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ pendingInsights() }} pending review</p>
            </div>
            <div class="bg-purple-100 p-3 rounded-full">
              <i class="pi pi-lightbulb text-2xl text-purple-600"></i>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Success Rate</p>
              <p class="text-3xl font-bold text-gray-900">{{ engagementRate() }}%</p>
              <p class="text-xs text-gray-500 mt-1">Published vs Total</p>
            </div>
            <div class="bg-orange-100 p-3 rounded-full">
              <i class="pi pi-chart-line text-2xl text-orange-600"></i>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Action Items -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-800">Action Required</h2>
          <span class="text-sm text-gray-500">
            <i class="pi pi-info-circle mr-1"></i>
            Items requiring your attention
          </span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-purple-50 rounded-lg p-4 border border-purple-200 hover:shadow-md transition-shadow cursor-pointer"
               (click)="navigateToAction('insights')">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-purple-600 font-medium">Insights Review</p>
                <p class="text-2xl font-bold text-purple-800">{{ actionItems?.insightsNeedingReview || 0 }}</p>
                <p class="text-xs text-purple-500 mt-1">{{ getActionDescription('insights') }}</p>
              </div>
              <i class="pi pi-eye text-3xl text-purple-400"></i>
            </div>
          </div>
          
          <div class="bg-blue-50 rounded-lg p-4 border border-blue-200 hover:shadow-md transition-shadow cursor-pointer"
               (click)="navigateToAction('posts')">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-blue-600 font-medium">Posts Review</p>
                <p class="text-2xl font-bold text-blue-800">{{ actionItems?.postsNeedingReview || 0 }}</p>
                <p class="text-xs text-blue-500 mt-1">{{ getActionDescription('posts') }}</p>
              </div>
              <i class="pi pi-file-edit text-3xl text-blue-400"></i>
            </div>
          </div>
          
          <div class="bg-orange-50 rounded-lg p-4 border border-orange-200 hover:shadow-md transition-shadow cursor-pointer"
               (click)="navigateToAction('schedule')">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-orange-600 font-medium">Ready to Schedule</p>
                <p class="text-2xl font-bold text-orange-800">{{ actionItems?.readyToSchedule || 0 }}</p>
                <p class="text-xs text-orange-500 mt-1">{{ getActionDescription('schedule') }}</p>
              </div>
              <i class="pi pi-calendar text-3xl text-orange-400"></i>
            </div>
          </div>
          
          <div class="bg-red-50 rounded-lg p-4 border border-red-200 hover:shadow-md transition-shadow cursor-pointer"
               (click)="navigateToAction('failed')">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-red-600 font-medium">Failed Jobs</p>
                <p class="text-2xl font-bold text-red-800">{{ actionItems?.failedJobs || 0 }}</p>
                <p class="text-xs text-red-500 mt-1">{{ getActionDescription('failed') }}</p>
              </div>
              <i class="pi pi-exclamation-triangle text-3xl text-red-400"></i>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Recent Projects with Enhanced Cards -->
      <div class="bg-white rounded-lg shadow-md">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-xl font-semibold text-gray-800">Recent Projects</h2>
          <button 
            routerLink="/projects"
            class="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View All <i class="pi pi-arrow-right ml-1"></i>
          </button>
        </div>
        <div class="p-6">
          <div class="space-y-4" *ngIf="recentProjects().length > 0">
            <div 
              *ngFor="let project of recentProjects()"
              class="border border-gray-200 rounded-lg hover:shadow-lg transition-all cursor-pointer group"
              [routerLink]="['/projects', project.id]"
            >
              <div class="p-4">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center">
                      <h3 class="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {{ project.title }}
                      </h3>
                      <span 
                        class="ml-3 px-2 py-1 text-xs rounded-full"
                        [ngClass]="getStageClass(project.currentStage)"
                      >
                        {{ formatStage(project.currentStage) }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ project.description }}</p>
                    
                    <!-- Project Metrics -->
                    <div class="flex items-center mt-3 space-x-4 text-xs text-gray-500">
                      <span>
                        <i class="pi pi-clock mr-1"></i>
                        {{ formatDate(project.updatedAt) }}
                      </span>
                      <span *ngIf="getProjectMetrics(project).insights > 0">
                        <i class="pi pi-lightbulb mr-1"></i>
                        {{ getProjectMetrics(project).insights }} insights
                      </span>
                      <span *ngIf="getProjectMetrics(project).posts > 0">
                        <i class="pi pi-file-edit mr-1"></i>
                        {{ getProjectMetrics(project).posts }} posts
                      </span>
                    </div>
                  </div>
                  
                  <!-- Progress Indicator -->
                  <div class="ml-4 flex flex-col items-center">
                    <div class="relative w-16 h-16">
                      <svg class="transform -rotate-90 w-16 h-16">
                        <circle 
                          cx="32" cy="32" r="28" 
                          stroke="#e5e7eb" 
                          stroke-width="4" 
                          fill="none"
                        />
                        <circle 
                          cx="32" cy="32" r="28" 
                          [attr.stroke]="getProgressColor(project.overallProgress)" 
                          stroke-width="4" 
                          fill="none"
                          [attr.stroke-dasharray]="getProgressDasharray(project.overallProgress)"
                          stroke-linecap="round"
                        />
                      </svg>
                      <div class="absolute inset-0 flex items-center justify-center">
                        <span class="text-sm font-bold text-gray-700">{{ project.overallProgress }}%</span>
                      </div>
                    </div>
                    <span class="text-xs text-gray-500 mt-1">Progress</span>
                  </div>
                </div>
              </div>
              
              <!-- Pipeline Visualization Preview -->
              <div class="border-t border-gray-100 px-4 py-3 bg-gray-50">
                <app-pipeline-visualization
                  [currentStage]="project.currentStage"
                  [progress]="project.overallProgress"
                ></app-pipeline-visualization>
              </div>
            </div>
          </div>
          
          <div *ngIf="recentProjects().length === 0" class="text-center py-8">
            <i class="pi pi-inbox text-5xl text-gray-300"></i>
            <p class="mt-4 text-gray-500">No projects yet</p>
            <button 
              routerLink="/projects/new"
              class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Project
            </button>
          </div>
        </div>
      </div>
      
      <!-- Pipeline Overview with Enhanced Visualization -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4 text-gray-800">Pipeline Status</h2>
          <div class="space-y-3">
            <div 
              *ngFor="let stage of stages"
              class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              [class.bg-blue-50]="getProjectCountByStage(stage) > 0"
            >
              <div class="flex items-center">
                <div class="w-2 h-8 rounded-full mr-3" [style.backgroundColor]="getStageColor(stage)"></div>
                <div>
                  <p class="text-sm font-medium text-gray-700">{{ formatStage(stage) }}</p>
                  <p class="text-xs text-gray-500">{{ getStageDescription(stage) }}</p>
                </div>
              </div>
              <div class="flex items-center">
                <span class="text-2xl font-bold text-gray-800 mr-2">{{ getProjectCountByStage(stage) }}</span>
                <button 
                  *ngIf="getProjectCountByStage(stage) > 0"
                  (click)="navigateToStage(stage)"
                  class="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <i class="pi pi-arrow-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Activity Timeline -->
        <app-activity-timeline 
          [activities]="recentActivities()"
        ></app-activity-timeline>
      </div>
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit {
  private projectService = inject(ProjectService);
  private dashboardService = inject(DashboardService);
  Math = Math;
  
  // Signals for reactive state
  dashboardData = signal<DashboardData | null>(null);
  recentProjects = signal<ContentProject[]>([]);
  actionItems = signal<any>({});
  projectsByStage = signal<Record<string, number>>({});
  allProjects = signal<ContentProject[]>([]);
  
  stages = Object.values(ProjectStage).filter(s => s !== ProjectStage.ARCHIVED);
  
  // Computed values for overview cards
  totalProjects = computed(() => {
    const data = this.dashboardData();
    return data?.counts?.transcripts?.total || this.allProjects().length;
  });
  
  activeProjects = computed(() => {
    const data = this.dashboardData();
    return data?.counts?.transcripts?.processing || 
           this.allProjects().filter(p => p.currentStage !== ProjectStage.ARCHIVED && p.currentStage !== ProjectStage.PUBLISHED).length;
  });
  
  publishedContent = computed(() => {
    const data = this.dashboardData();
    return data?.counts?.posts?.published || 
           this.allProjects().filter(p => p.currentStage === ProjectStage.PUBLISHED).length;
  });
  
  totalInsights = computed(() => {
    const data = this.dashboardData();
    return data?.counts?.insights?.total || 
           this.allProjects().reduce((sum, p) => {
             return sum + (p.insights?.length || 0);
           }, 0);
  });
  
  pendingInsights = computed(() => {
    const data = this.dashboardData();
    return data?.counts?.insights?.pending || this.actionItems().insightsNeedingReview || 0;
  });
  
  engagementRate = computed(() => {
    // Simple calculation: published posts as percentage of total posts
    const published = this.publishedContent();
    const total = this.totalProjects();
    return total > 0 ? Math.round((published / total) * 100) : 0;
  });
  
  engagementTrend = computed(() => 0); // Simplified: no trend calculation
  
  // Recent activities for timeline
  recentActivities = computed(() => {
    const activities: any[] = [];
    const projects = this.recentProjects().slice(0, 5);
    
    projects.forEach(p => {
      activities.push({
        id: p.id,
        type: 'project_update',
        title: `Project "${p.title}" updated`,
        description: `Stage changed to ${this.formatStage(p.currentStage)}`,
        timestamp: p.updatedAt,
        icon: this.getStageIcon(p.currentStage),
        color: this.getStageColor(p.currentStage)
      });
    });
    
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });
  
  ngOnInit(): void {
    this.loadDashboardData();
  }
  
  loadDashboardData(): void {
    // Load dashboard data from the dashboard service
    this.dashboardService.getDashboard().subscribe(result => {
      if (result.success && result.data) {
        this.dashboardData.set(result.data);
        
        // Update action items based on dashboard data
        this.actionItems.set({
          insightsNeedingReview: result.data.actionableItems?.insightsToReview || 0,
          postsNeedingReview: result.data.actionableItems?.postsToApprove || 0,
          readyToSchedule: result.data.actionableItems?.postsToSchedule || 0,
          failedJobs: result.data.actionableItems?.transcriptsToProcess || 0
        });
        
        // Map activity to recent projects format (temporary)
        const recentProjectsFromActivity = result.data.activity?.slice(0, 5).map(activity => ({
          id: activity.entityId,
          title: activity.title,
          description: activity.description,
          currentStage: ProjectStage.PROCESSING_CONTENT,
          overallProgress: 50,
          updatedAt: new Date(activity.timestamp),
          insights: [],
          posts: []
        } as ContentProject)) || [];
        
        this.recentProjects.set(recentProjectsFromActivity);
      }
    });
    
    // Load all projects for statistics
    this.projectService.getProjects().subscribe(projects => {
      this.allProjects.set(projects);
      
      // Calculate projects by stage
      const byStage: Record<string, number> = {};
      projects.forEach(project => {
        byStage[project.currentStage] = (byStage[project.currentStage] || 0) + 1;
      });
      this.projectsByStage.set(byStage);
    });
  }
  
  getProjectCountByStage(stage: ProjectStage): number {
    return this.projectsByStage()[stage] || 0;
  }
  
  getProjectMetrics(project: ContentProject): { insights: number; posts: number } {
    return {
      insights: project.insights?.length || 0,
      posts: project.posts?.length || 0
    };
  }
  
  getProgressColor(progress: number): string {
    if (progress >= 80) return '#10b981';
    if (progress >= 50) return '#3b82f6';
    if (progress >= 20) return '#f59e0b';
    return '#ef4444';
  }
  
  getProgressDasharray(progress: number): string {
    const circumference = 2 * Math.PI * 28;
    const offset = circumference - (progress / 100) * circumference;
    return `${circumference} ${circumference}`;
  }
  
  getStageColor(stage: string): string {
    const colors: Record<string, string> = {
      'RAW_CONTENT': '#9ca3af',
      'PROCESSING_CONTENT': '#fbbf24',
      'INSIGHTS_READY': '#a855f7',
      'INSIGHTS_APPROVED': '#6366f1',
      'POSTS_GENERATED': '#3b82f6',
      'POSTS_APPROVED': '#14b8a6',
      'SCHEDULED': '#f97316',
      'PUBLISHING': '#ec4899',
      'PUBLISHED': '#10b981',
      'ARCHIVED': '#6b7280'
    };
    return colors[stage] || '#9ca3af';
  }
  
  getStageIcon(stage: string): string {
    const icons: Record<string, string> = {
      'RAW_CONTENT': 'pi-file',
      'PROCESSING_CONTENT': 'pi-cog',
      'INSIGHTS_READY': 'pi-lightbulb',
      'INSIGHTS_APPROVED': 'pi-check',
      'POSTS_GENERATED': 'pi-file-edit',
      'POSTS_APPROVED': 'pi-check-circle',
      'SCHEDULED': 'pi-calendar',
      'PUBLISHING': 'pi-send',
      'PUBLISHED': 'pi-check-circle',
      'ARCHIVED': 'pi-inbox'
    };
    return icons[stage] || 'pi-circle';
  }
  
  getStageDescription(stage: string): string {
    const descriptions: Record<string, string> = {
      'RAW_CONTENT': 'Uploaded content awaiting processing',
      'PROCESSING_CONTENT': 'AI analyzing and cleaning content',
      'INSIGHTS_READY': 'Insights generated, ready for review',
      'INSIGHTS_APPROVED': 'Insights approved, ready for posts',
      'POSTS_GENERATED': 'Posts created, awaiting review',
      'POSTS_APPROVED': 'Posts approved, ready to schedule',
      'SCHEDULED': 'Posts scheduled for publishing',
      'PUBLISHING': 'Publishing to social platforms',
      'PUBLISHED': 'Successfully published',
      'ARCHIVED': 'Project archived'
    };
    return descriptions[stage] || '';
  }
  
  getActionDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'insights': 'Projects with new insights',
      'posts': 'Posts awaiting approval',
      'schedule': 'Approved posts to schedule',
      'failed': 'Requires manual intervention'
    };
    return descriptions[type] || '';
  }
  
  navigateToAction(type: string): void {
    // Navigate to appropriate filtered view
    console.log('Navigate to action:', type);
  }
  
  navigateToStage(stage: string): void {
    // Navigate to projects filtered by stage
    console.log('Navigate to stage:', stage);
  }
  
  getStageClass(stage: string): string {
    const stageClasses: Record<string, string> = {
      'RAW_CONTENT': 'bg-gray-100 text-gray-700',
      'PROCESSING_CONTENT': 'bg-yellow-100 text-yellow-700',
      'INSIGHTS_READY': 'bg-purple-100 text-purple-700',
      'INSIGHTS_APPROVED': 'bg-indigo-100 text-indigo-700',
      'POSTS_GENERATED': 'bg-blue-100 text-blue-700',
      'POSTS_APPROVED': 'bg-teal-100 text-teal-700',
      'SCHEDULED': 'bg-orange-100 text-orange-700',
      'PUBLISHING': 'bg-pink-100 text-pink-700',
      'PUBLISHED': 'bg-green-100 text-green-700',
      'ARCHIVED': 'bg-gray-100 text-gray-500'
    };
    return stageClasses[stage] || 'bg-gray-100 text-gray-700';
  }
  
  formatStage(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  
  formatDate(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return d.toLocaleDateString();
  }
}