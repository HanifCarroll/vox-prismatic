import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { ContentProject, Insight, Post } from '../../../core/models/project.model';
import { PipelineVisualizationComponent } from '../../../shared/components/pipeline-visualization/pipeline-visualization.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, PipelineVisualizationComponent],
  template: `
    <div class="space-y-6" *ngIf="project">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <a routerLink="/projects" class="hover:text-blue-600">Projects</a>
              <i class="pi pi-angle-right"></i>
              <span>{{ project.title }}</span>
            </div>
            <h1 class="text-2xl font-bold text-gray-900">{{ project.title }}</h1>
            <p class="text-gray-600 mt-2">{{ project.description }}</p>
            <div class="flex items-center space-x-4 mt-4">
              <span 
                class="px-3 py-1 text-sm rounded-full"
                [ngClass]="getStageClass(project.currentStage)"
              >
                {{ formatStage(project.currentStage) }}
              </span>
              <span class="text-sm text-gray-500">
                <i class="pi pi-clock mr-1"></i>
                Updated {{ formatDate(project.updatedAt) }}
              </span>
              <span class="text-sm text-gray-500">
                <i class="pi pi-user mr-1"></i>
                {{ project.createdBy }}
              </span>
            </div>
          </div>
          <div class="flex space-x-2">
            <button class="px-4 py-2 text-gray-600 hover:text-gray-800">
              <i class="pi pi-pencil"></i>
            </button>
            <button class="px-4 py-2 text-gray-600 hover:text-gray-800">
              <i class="pi pi-trash"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Pipeline Visualization -->
      <app-pipeline-visualization 
        [currentStage]="project.currentStage"
        [progress]="project.overallProgress"
      />
      
      <!-- Action Panel -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Available Actions</h2>
        <div class="flex flex-wrap gap-3">
          <button
            *ngIf="canProcessContent()"
            (click)="processContent()"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i class="pi pi-play mr-2"></i>
            Process Content
          </button>
          <button
            *ngIf="canExtractInsights()"
            (click)="extractInsights()"
            class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <i class="pi pi-lightbulb mr-2"></i>
            Extract Insights
          </button>
          <button
            *ngIf="canGeneratePosts()"
            (click)="generatePosts()"
            class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <i class="pi pi-file-edit mr-2"></i>
            Generate Posts
          </button>
          <button
            *ngIf="canSchedulePosts()"
            (click)="schedulePosts()"
            class="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            <i class="pi pi-calendar mr-2"></i>
            Schedule Posts
          </button>
        </div>
      </div>
      
      <!-- Content Tree -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Transcript -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-4 border-b border-gray-200">
            <h3 class="font-semibold text-gray-800">Transcript</h3>
          </div>
          <div class="p-4">
            <div *ngIf="project.transcript" class="space-y-3">
              <div class="text-sm text-gray-600">
                <i class="pi pi-file-text mr-1"></i>
                {{ project.transcript.wordCount }} words
              </div>
              <div class="text-sm text-gray-700 line-clamp-5">
                {{ project.transcript.cleanedContent || project.transcript.content }}
              </div>
              <button class="text-blue-600 text-sm hover:underline">
                View Full Transcript
              </button>
            </div>
            <div *ngIf="!project.transcript" class="text-center py-8 text-gray-500">
              <i class="pi pi-file-text text-3xl mb-2"></i>
              <p>No transcript yet</p>
            </div>
          </div>
        </div>
        
        <!-- Insights -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 class="font-semibold text-gray-800">
              Insights
              <span class="ml-2 text-sm text-gray-500">
                ({{ insights.length }})
              </span>
            </h3>
            <span class="text-sm text-green-600">
              {{ getApprovedInsightsCount() }} approved
            </span>
          </div>
          <div class="p-4">
            <div *ngIf="insights.length > 0" class="space-y-3">
              <div 
                *ngFor="let insight of insights.slice(0, 3)"
                class="p-3 border border-gray-200 rounded-lg"
                [class.border-green-500]="insight.isApproved"
                [class.bg-green-50]="insight.isApproved"
              >
                <div class="flex items-start justify-between">
                  <p class="text-sm text-gray-700 flex-1">{{ insight.content }}</p>
                  <i 
                    *ngIf="insight.isApproved"
                    class="pi pi-check-circle text-green-600 ml-2"
                  ></i>
                </div>
                <div class="mt-2 flex items-center justify-between">
                  <span class="text-xs text-gray-500">
                    Score: {{ insight.score }}
                  </span>
                  <button 
                    *ngIf="!insight.isApproved"
                    (click)="approveInsight(insight)"
                    class="text-xs text-blue-600 hover:underline"
                  >
                    Approve
                  </button>
                </div>
              </div>
              <button 
                *ngIf="insights.length > 3"
                class="text-blue-600 text-sm hover:underline"
              >
                View All Insights ({{ insights.length }})
              </button>
            </div>
            <div *ngIf="insights.length === 0" class="text-center py-8 text-gray-500">
              <i class="pi pi-lightbulb text-3xl mb-2"></i>
              <p>No insights generated</p>
            </div>
          </div>
        </div>
        
        <!-- Posts -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 class="font-semibold text-gray-800">
              Posts
              <span class="ml-2 text-sm text-gray-500">
                ({{ posts.length }})
              </span>
            </h3>
            <span class="text-sm text-green-600">
              {{ getApprovedPostsCount() }} approved
            </span>
          </div>
          <div class="p-4">
            <div *ngIf="posts.length > 0" class="space-y-3">
              <div 
                *ngFor="let post of posts.slice(0, 3)"
                class="p-3 border border-gray-200 rounded-lg"
                [class.border-green-500]="post.isApproved"
                [class.bg-green-50]="post.isApproved"
              >
                <div class="flex items-center justify-between mb-2">
                  <i [class]="getPlatformIcon(post.platform)"></i>
                  <span class="text-xs text-gray-500">
                    {{ post.characterCount }} chars
                  </span>
                </div>
                <p class="text-sm text-gray-700 line-clamp-3">{{ post.content }}</p>
                <div class="mt-2 flex justify-end">
                  <button 
                    *ngIf="!post.isApproved"
                    (click)="approvePost(post)"
                    class="text-xs text-blue-600 hover:underline"
                  >
                    Approve
                  </button>
                </div>
              </div>
              <button 
                *ngIf="posts.length > 3"
                class="text-blue-600 text-sm hover:underline"
              >
                View All Posts ({{ posts.length }})
              </button>
            </div>
            <div *ngIf="posts.length === 0" class="text-center py-8 text-gray-500">
              <i class="pi pi-file-edit text-3xl mb-2"></i>
              <p>No posts generated</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Activity Timeline -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Activity Timeline</h2>
        <div class="space-y-4">
          <div class="flex items-start space-x-3">
            <div class="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
            <div class="flex-1">
              <p class="text-sm text-gray-700">Project created</p>
              <p class="text-xs text-gray-500">{{ formatDate(project.createdAt) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Loading State -->
    <div *ngIf="loading" class="flex items-center justify-center h-64">
      <i class="pi pi-spin pi-spinner text-4xl text-blue-600"></i>
    </div>
  `,
  styles: [`
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .line-clamp-5 {
      display: -webkit-box;
      -webkit-line-clamp: 5;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  
  project: ContentProject | null = null;
  insights: Insight[] = [];
  posts: Post[] = [];
  loading = true;
  
  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.loadProject(projectId);
    }
  }
  
  loadProject(id: string): void {
    this.loading = true;
    this.projectService.getProject(id).subscribe({
      next: (project) => {
        this.project = project;
        this.insights = project.insights || [];
        this.posts = project.posts || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading project:', error);
        this.loading = false;
      }
    });
  }
  
  canProcessContent(): boolean {
    return this.project?.currentStage === 'RAW_CONTENT';
  }
  
  canExtractInsights(): boolean {
    return this.project?.currentStage === 'PROCESSING_CONTENT' || 
           this.project?.currentStage === 'INSIGHTS_READY';
  }
  
  canGeneratePosts(): boolean {
    return this.project?.currentStage === 'INSIGHTS_APPROVED' ||
           this.project?.currentStage === 'POSTS_GENERATED';
  }
  
  canSchedulePosts(): boolean {
    return this.project?.currentStage === 'POSTS_APPROVED';
  }
  
  processContent(): void {
    if (this.project) {
      this.projectService.processContent(this.project.id).subscribe({
        next: () => {
          // Reload project
          this.loadProject(this.project!.id);
        }
      });
    }
  }
  
  extractInsights(): void {
    if (this.project) {
      this.projectService.extractInsights(this.project.id).subscribe({
        next: () => {
          this.loadProject(this.project!.id);
        }
      });
    }
  }
  
  generatePosts(): void {
    if (this.project) {
      const approvedInsightIds = this.insights
        .filter(i => i.isApproved)
        .map(i => i.id);
      
      this.projectService.generatePosts(this.project.id, approvedInsightIds).subscribe({
        next: () => {
          this.loadProject(this.project!.id);
        }
      });
    }
  }
  
  schedulePosts(): void {
    if (this.project) {
      const approvedPostIds = this.posts
        .filter(p => p.isApproved)
        .map(p => p.id);
      
      this.projectService.schedulePosts(this.project.id, approvedPostIds).subscribe({
        next: () => {
          this.loadProject(this.project!.id);
        }
      });
    }
  }
  
  approveInsight(insight: Insight): void {
    if (this.project) {
      this.projectService.updateInsight(this.project.id, insight.id, {
        isApproved: true
      }).subscribe({
        next: () => {
          insight.isApproved = true;
        }
      });
    }
  }
  
  approvePost(post: Post): void {
    if (this.project) {
      this.projectService.updatePost(this.project.id, post.id, {
        isApproved: true
      }).subscribe({
        next: () => {
          post.isApproved = true;
        }
      });
    }
  }
  
  getApprovedInsightsCount(): number {
    return this.insights.filter(i => i.isApproved).length;
  }
  
  getApprovedPostsCount(): number {
    return this.posts.filter(p => p.isApproved).length;
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
  
  getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
      'LINKEDIN': 'pi pi-linkedin text-blue-700',
      'TWITTER': 'pi pi-twitter text-blue-400',
      'THREADS': 'pi pi-at text-gray-700',
      'BLUESKY': 'pi pi-cloud text-sky-500'
    };
    return icons[platform] || 'pi pi-globe text-gray-500';
  }
  
  formatStage(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  
  formatDate(date: Date | string): string {
    return new Date(date).toLocaleString();
  }
}