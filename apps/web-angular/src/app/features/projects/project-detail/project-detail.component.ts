import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { ContentProject, Insight, Post, ProcessingJob } from '../../../core/models/project.model';
import { PipelineVisualizationComponent } from '../../../shared/components/pipeline-visualization/pipeline-visualization.component';
import { ContentTreeComponent } from '../content-tree/content-tree.component';
import { TranscriptViewerComponent } from '../transcript-viewer/transcript-viewer.component';
import { InsightReviewerComponent } from '../insight-reviewer/insight-reviewer.component';
import { PostEditorComponent } from '../post-editor/post-editor.component';
import { ProjectActionsComponent } from '../project-actions/project-actions.component';
import { ProjectHeaderComponent } from '../project-header/project-header.component';
import { ProjectPipelineComponent } from '../project-pipeline/project-pipeline.component';
import { ActivityTimelineComponent, ActivityEvent } from '../activity-timeline/activity-timeline.component';
import { SchedulingPanelComponent, ScheduleSlot, OptimalTime } from '../scheduling-panel/scheduling-panel.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    RouterModule, 
    PipelineVisualizationComponent,
    ContentTreeComponent,
    TranscriptViewerComponent,
    InsightReviewerComponent,
    PostEditorComponent,
    ProjectActionsComponent,
    ProjectHeaderComponent,
    ProjectPipelineComponent,
    ActivityTimelineComponent,
    SchedulingPanelComponent
  ],
  template: `
    <div class="space-y-6" *ngIf="project">
      <!-- Project Header Component -->
      <app-project-header
        [project]="project"
        [insights]="insights"
        [posts]="posts"
        (editProject)="editProject()"
        (archiveProject)="archiveProject()"
      />
      
      <!-- Project Pipeline Component -->
      <app-project-pipeline
        [currentStage]="project.currentStage"
        [processingJobs]="processingJobs"
        (stageClicked)="onStageClicked($event)"
      />
      
      <!-- Project Actions Component -->
      <app-project-actions
        [project]="project"
        [insights]="insights"
        [posts]="posts"
        (actionTriggered)="onActionTriggered($event)"
      />
      
      <!-- Content Tree Component -->
      <app-content-tree
        [project]="project"
        [insights]="insights"
        [posts]="posts"
        (nodeSelected)="onNodeSelected($event)"
      />
      
      <!-- Content Management Components based on active view -->
      <div [ngSwitch]="activeView">
        <!-- Transcript Viewer -->
        <app-transcript-viewer
          *ngSwitchCase="'transcript'"
          [transcript]="project.transcript"
          [projectId]="project.id"
          (transcriptUpdated)="onTranscriptUpdated($event)"
        />
        
        <!-- Insight Reviewer -->
        <app-insight-reviewer
          *ngSwitchCase="'insights'"
          [insights]="insights"
          [projectId]="project.id"
          (insightsUpdated)="onInsightsUpdated($event)"
        />
        
        <!-- Post Editor -->
        <app-post-editor
          *ngSwitchCase="'posts'"
          [posts]="posts"
          [insights]="insights"
          [projectId]="project.id"
          [targetPlatforms]="project.targetPlatforms"
          (postsUpdated)="onPostsUpdated($event)"
        />
        
        <!-- Default view showing summary -->
        <div *ngSwitchDefault class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Quick Transcript Preview -->
          <div class="bg-white rounded-lg shadow">
            <div class="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 class="font-semibold text-gray-800">Transcript</h3>
              <button 
                (click)="setActiveView('transcript')"
                class="text-sm text-blue-600 hover:underline"
              >
                View Full
              </button>
            </div>
            <div class="p-4">
              <div *ngIf="project.transcript" class="space-y-3">
                <div class="text-sm text-gray-600">
                  <i class="pi pi-file-text mr-1"></i>
                  {{ project.transcript.wordCount }} words
                  <span *ngIf="project.transcript.duration" class="ml-2">
                    <i class="pi pi-clock mr-1"></i>
                    {{ formatDuration(project.transcript.duration) }}
                  </span>
                </div>
                <div class="text-sm text-gray-700 line-clamp-5">
                  {{ project.transcript.cleanedContent || project.transcript.content }}
                </div>
              </div>
              <div *ngIf="!project.transcript" class="text-center py-8 text-gray-500">
                <i class="pi pi-file-text text-3xl mb-2"></i>
                <p>No transcript yet</p>
              </div>
            </div>
          </div>
          
          <!-- Quick Insights Preview -->
          <div class="bg-white rounded-lg shadow">
            <div class="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 class="font-semibold text-gray-800">
                Insights
                <span class="ml-2 text-sm text-gray-500">
                  ({{ insights.length }})
                </span>
              </h3>
              <button 
                (click)="setActiveView('insights')"
                class="text-sm text-blue-600 hover:underline"
              >
                Review All
              </button>
            </div>
            <div class="p-4">
              <div *ngIf="insights.length > 0" class="space-y-3">
                <div 
                  *ngFor="let insight of insights.slice(0, 3)"
                  class="p-3 border border-gray-200 rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
                  [class.border-green-500]="insight.isApproved"
                  [class.bg-green-50]="insight.isApproved"
                  (click)="setActiveView('insights')"
                >
                  <p class="text-sm text-gray-700 line-clamp-2">{{ insight.content }}</p>
                  <div class="mt-2 flex items-center justify-between">
                    <span class="text-xs text-gray-500">
                      Score: {{ insight.score }}
                    </span>
                    <i 
                      *ngIf="insight.isApproved"
                      class="pi pi-check-circle text-green-600"
                    ></i>
                  </div>
                </div>
              </div>
              <div *ngIf="insights.length === 0" class="text-center py-8 text-gray-500">
                <i class="pi pi-lightbulb text-3xl mb-2"></i>
                <p>No insights generated</p>
              </div>
            </div>
          </div>
          
          <!-- Quick Posts Preview -->
          <div class="bg-white rounded-lg shadow">
            <div class="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 class="font-semibold text-gray-800">
                Posts
                <span class="ml-2 text-sm text-gray-500">
                  ({{ posts.length }})
                </span>
              </h3>
              <button 
                (click)="setActiveView('posts')"
                class="text-sm text-blue-600 hover:underline"
              >
                Edit All
              </button>
            </div>
            <div class="p-4">
              <div *ngIf="posts.length > 0" class="space-y-3">
                <div 
                  *ngFor="let post of posts.slice(0, 3)"
                  class="p-3 border border-gray-200 rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
                  [class.border-green-500]="post.isApproved"
                  [class.bg-green-50]="post.isApproved"
                  (click)="setActiveView('posts')"
                >
                  <div class="flex items-center justify-between mb-2">
                    <i [class]="getPlatformIcon(post.platform)"></i>
                    <span class="text-xs text-gray-500">
                      {{ post.characterCount }} chars
                    </span>
                  </div>
                  <p class="text-sm text-gray-700 line-clamp-2">{{ post.content }}</p>
                </div>
              </div>
              <div *ngIf="posts.length === 0" class="text-center py-8 text-gray-500">
                <i class="pi pi-file-edit text-3xl mb-2"></i>
                <p>No posts generated</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Scheduling Panel Component -->
      <app-scheduling-panel
        *ngIf="activeView === 'scheduling' || (project.currentStage === 'POSTS_APPROVED' || project.currentStage === 'SCHEDULED')"
        [posts]="posts"
        [scheduleSlots]="scheduleSlots"
        [optimalTimes]="optimalTimes"
        (schedulePost)="onSchedulePost($event)"
        (cancelSchedule)="onCancelSchedule($event)"
        (publishNow)="onPublishNow($event)"
      />
      
      <!-- Activity Timeline Component -->
      <app-activity-timeline
        [events]="activityEvents"
      />
      
      <!-- Processing Jobs Status -->
      <div class="bg-white rounded-lg shadow p-6" *ngIf="processingJobs.length > 0">
        <h2 class="text-lg font-semibold mb-4">Processing Status</h2>
        <div class="space-y-3">
          <div 
            *ngFor="let job of processingJobs"
            class="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
          >
            <div class="flex items-center space-x-3">
              <i 
                class="pi text-xl"
                [ngClass]="getJobIcon(job)"
              ></i>
              <div>
                <p class="text-sm font-medium">{{ formatJobType(job.type) }}</p>
                <p class="text-xs text-gray-500">{{ job.status }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <div *ngIf="job.progress" class="flex items-center">
                <div class="w-24 bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    class="bg-blue-600 h-2 rounded-full transition-all"
                    [style.width.%]="job.progress"
                  ></div>
                </div>
                <span class="text-sm">{{ job.progress }}%</span>
              </div>
              <span 
                *ngIf="job.completedAt"
                class="text-xs text-gray-500"
              >
                {{ formatRelativeDate(job.completedAt) }}
              </span>
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
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
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
  processingJobs: ProcessingJob[] = [];
  activityLog: any[] = [];
  activityEvents: ActivityEvent[] = [];
  scheduleSlots: ScheduleSlot[] = [];
  optimalTimes: OptimalTime[] = [];
  loading = true;
  activeView: 'summary' | 'transcript' | 'insights' | 'posts' | 'scheduling' = 'summary';
  
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
        this.loadProcessingJobs(id);
        this.loadActivityLog(id);
      },
      error: (error) => {
        console.error('Error loading project:', error);
        this.loading = false;
      }
    });
  }
  
  loadProcessingJobs(projectId: string): void {
    // TODO: Implement when API is available
    this.processingJobs = [];
  }
  
  loadActivityLog(projectId: string): void {
    // TODO: Implement when API is available
    this.activityLog = [];
    // Convert to ActivityEvent format
    this.activityEvents = this.convertToActivityEvents(this.activityLog);
  }
  
  convertToActivityEvents(logs: any[]): ActivityEvent[] {
    return logs.map(log => ({
      id: log.id || Math.random().toString(),
      timestamp: new Date(log.timestamp),
      type: log.type as any,
      title: log.title || log.description,
      description: log.description,
      actor: log.user ? {
        id: log.user.id,
        name: log.user.name,
        avatar: log.user.avatar
      } : undefined,
      metadata: log.metadata,
      severity: log.severity
    }));
  }
  
  loadScheduleData(projectId: string): void {
    // TODO: Load from API
    this.scheduleSlots = [];
    this.optimalTimes = [
      {
        platform: 'LINKEDIN' as any,
        dayOfWeek: 'Tuesday',
        time: '09:00',
        engagementScore: 85,
        reason: 'Peak professional engagement time'
      }
    ];
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
      'LINKEDIN': 'pi pi-linkedin text-blue-700'
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
  
  formatRelativeDate(date: Date | string): string {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }
  
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  }
  
  formatSourceType(type: string): string {
    const types: Record<string, string> = {
      'AUDIO': 'Audio',
      'VIDEO': 'Video',
      'TEXT': 'Text',
      'URL': 'Web URL'
    };
    return types[type] || type;
  }
  
  formatJobType(type: string): string {
    return type.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  
  getSourceIcon(type: string): string {
    const icons: Record<string, string> = {
      'AUDIO': 'pi pi-volume-up text-purple-600',
      'VIDEO': 'pi pi-video text-red-600',
      'TEXT': 'pi pi-file-text text-blue-600',
      'URL': 'pi pi-link text-green-600'
    };
    return icons[type] || 'pi pi-file text-gray-600';
  }
  
  getActivityColor(type: string): string {
    const colors: Record<string, string> = {
      'created': 'bg-blue-600',
      'processing': 'bg-yellow-600',
      'completed': 'bg-green-600',
      'failed': 'bg-red-600',
      'updated': 'bg-purple-600'
    };
    return colors[type] || 'bg-gray-600';
  }
  
  getJobIcon(job: ProcessingJob): string {
    const statusIcons: Record<string, string> = {
      'PENDING': 'pi-hourglass text-gray-500',
      'PROCESSING': 'pi-spin pi-spinner text-blue-600',
      'COMPLETED': 'pi-check-circle text-green-600',
      'FAILED': 'pi-times-circle text-red-600'
    };
    return statusIcons[job.status] || 'pi-circle text-gray-500';
  }
  
  setActiveView(view: 'summary' | 'transcript' | 'insights' | 'posts' | 'scheduling'): void {
    this.activeView = view;
  }
  
  onNodeSelected(event: any): void {
    if (event.type === 'transcript') {
      this.setActiveView('transcript');
    } else if (event.type === 'insight') {
      this.setActiveView('insights');
    } else if (event.type === 'post') {
      this.setActiveView('posts');
    }
  }
  
  onActionTriggered(action: string): void {
    switch (action) {
      case 'process-content':
        this.processContent();
        break;
      case 'extract-insights':
        this.extractInsights();
        break;
      case 'generate-posts':
        this.generatePosts();
        break;
      case 'schedule-posts':
        this.setActiveView('scheduling');
        break;
      case 'publish-now':
        this.publishAllPosts();
        break;
      case 'archive':
        this.archiveProject();
        break;
      case 'unarchive':
        this.unarchiveProject();
        break;
      case 'reprocess':
        this.reprocessContent();
        break;
      case 'export':
        this.exportProjectData();
        break;
      case 'view-results':
        this.viewPublishingResults();
        break;
    }
  }
  
  onStageClicked(stage: string): void {
    // Navigate to appropriate view based on stage
    if (stage.includes('INSIGHT')) {
      this.setActiveView('insights');
    } else if (stage.includes('POST')) {
      this.setActiveView('posts');
    } else if (stage.includes('SCHEDULED') || stage.includes('PUBLISHING')) {
      this.setActiveView('scheduling');
    } else if (stage.includes('CONTENT')) {
      this.setActiveView('transcript');
    }
  }
  
  onSchedulePost(event: { postId: string; platform: any; scheduledTime: Date }): void {
    // TODO: Implement scheduling via API
    console.log('Schedule post:', event);
  }
  
  onCancelSchedule(slotId: string): void {
    // TODO: Implement cancellation via API
    console.log('Cancel schedule:', slotId);
  }
  
  onPublishNow(postId: string): void {
    // TODO: Implement immediate publishing via API
    console.log('Publish now:', postId);
  }
  
  publishAllPosts(): void {
    // TODO: Implement
    console.log('Publishing all approved posts');
  }
  
  unarchiveProject(): void {
    // TODO: Implement
    console.log('Unarchiving project');
  }
  
  reprocessContent(): void {
    // TODO: Implement
    console.log('Reprocessing content');
  }
  
  exportProjectData(): void {
    // TODO: Implement
    console.log('Exporting project data');
  }
  
  viewPublishingResults(): void {
    // TODO: Implement
    console.log('Viewing publishing results');
  }
  
  onTranscriptUpdated(transcript: any): void {
    if (this.project) {
      this.project.transcript = transcript;
    }
  }
  
  onInsightsUpdated(insights: Insight[]): void {
    this.insights = insights;
    if (this.project) {
      this.loadProject(this.project.id);
    }
  }
  
  onPostsUpdated(posts: Post[]): void {
    this.posts = posts;
    if (this.project) {
      this.loadProject(this.project.id);
    }
  }
  
  editProject(): void {
    // TODO: Implement project editing
    console.log('Edit project');
  }
  
  archiveProject(): void {
    if (this.project && confirm('Are you sure you want to archive this project?')) {
      this.projectService.updateProject(this.project.id, {
        currentStage: 'ARCHIVED'
      }).subscribe({
        next: () => {
          // Navigate back to projects list
          window.location.href = '/projects';
        }
      });
    }
  }
}