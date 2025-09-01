import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProjectService } from '../../core/services/project.service';
import { ContentProject, ProjectStage } from '../../core/models/project.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button 
          routerLink="/projects/new"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <i class="pi pi-plus mr-2"></i>
          New Project
        </button>
      </div>
      
      <!-- Action Items -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">Action Required</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-purple-600 font-medium">Insights Review</p>
                <p class="text-2xl font-bold text-purple-800">{{ actionItems?.insightsNeedingReview || 0 }}</p>
              </div>
              <i class="pi pi-eye text-3xl text-purple-400"></i>
            </div>
          </div>
          
          <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-blue-600 font-medium">Posts Review</p>
                <p class="text-2xl font-bold text-blue-800">{{ actionItems?.postsNeedingReview || 0 }}</p>
              </div>
              <i class="pi pi-file-edit text-3xl text-blue-400"></i>
            </div>
          </div>
          
          <div class="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-orange-600 font-medium">Ready to Schedule</p>
                <p class="text-2xl font-bold text-orange-800">{{ actionItems?.readyToSchedule || 0 }}</p>
              </div>
              <i class="pi pi-calendar text-3xl text-orange-400"></i>
            </div>
          </div>
          
          <div class="bg-red-50 rounded-lg p-4 border border-red-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-red-600 font-medium">Failed Jobs</p>
                <p class="text-2xl font-bold text-red-800">{{ actionItems?.failedJobs || 0 }}</p>
              </div>
              <i class="pi pi-exclamation-triangle text-3xl text-red-400"></i>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Recent Projects -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-800">Recent Projects</h2>
        </div>
        <div class="p-6">
          <div class="space-y-4" *ngIf="recentProjects.length > 0">
            <div 
              *ngFor="let project of recentProjects"
              class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              [routerLink]="['/projects', project.id]"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h3 class="text-lg font-medium text-gray-900">{{ project.title }}</h3>
                  <p class="text-sm text-gray-500 mt-1">{{ project.description }}</p>
                  <div class="flex items-center mt-3 space-x-4">
                    <span class="text-xs text-gray-500">
                      <i class="pi pi-clock mr-1"></i>
                      {{ formatDate(project.updatedAt) }}
                    </span>
                    <span 
                      class="px-2 py-1 text-xs rounded-full"
                      [ngClass]="getStageClass(project.currentStage)"
                    >
                      {{ formatStage(project.currentStage) }}
                    </span>
                  </div>
                </div>
                <div class="ml-4">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600">
                      {{ project.overallProgress }}%
                    </div>
                    <div class="text-xs text-gray-500">Progress</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div *ngIf="recentProjects.length === 0" class="text-center py-8">
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
      
      <!-- Pipeline Overview -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">Pipeline Overview</h2>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div 
            *ngFor="let stage of stages"
            class="text-center"
          >
            <div class="bg-gray-100 rounded-lg p-4">
              <div class="text-2xl font-bold text-gray-700">
                {{ getProjectCountByStage(stage) }}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {{ formatStage(stage) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit {
  private projectService = inject(ProjectService);
  
  recentProjects: ContentProject[] = [];
  actionItems: any = {};
  projectsByStage: Record<string, number> = {};
  stages = Object.values(ProjectStage).filter(s => s !== ProjectStage.ARCHIVED);
  
  ngOnInit(): void {
    this.loadDashboardData();
  }
  
  loadDashboardData(): void {
    this.projectService.getDashboard().subscribe(data => {
      this.recentProjects = data.projectOverview.recentActivity || [];
      this.actionItems = data.actionItems;
      this.projectsByStage = data.projectOverview.byStage || {};
    });
    
    this.projectService.getActionItems().subscribe(projects => {
      // Process action items if needed
    });
  }
  
  getProjectCountByStage(stage: ProjectStage): number {
    return this.projectsByStage[stage] || 0;
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
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return d.toLocaleDateString();
  }
}