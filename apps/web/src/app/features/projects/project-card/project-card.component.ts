import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ContentProject } from '../../../core/models/project.model';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
      [routerLink]="['/projects', project.id]"
    >
      <div class="p-6">
        <div class="flex items-start justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 flex-1">{{ project.title }}</h3>
          <span 
            class="px-2 py-1 text-xs rounded-full ml-2"
            [ngClass]="getStageClass(project.currentStage)"
          >
            {{ formatStage(project.currentStage) }}
          </span>
        </div>
        
        <p class="text-gray-600 text-sm mb-4 line-clamp-2">
          {{ project.description || 'No description provided' }}
        </p>
        
        <!-- Progress Bar -->
        <div class="mb-4">
          <div class="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{{ project.overallProgress }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="h-2 rounded-full transition-all duration-300"
              [class]="getProgressBarClass(project.overallProgress)"
              [style.width.%]="project.overallProgress"
            ></div>
          </div>
        </div>
        
        <!-- Metrics -->
        @if (project.summary) {
          <div class="grid grid-cols-3 gap-2 mb-4">
            <div class="text-center">
              <div class="text-lg font-semibold text-gray-700">
                {{ project.summary.insightsTotal }}
              </div>
              <div class="text-xs text-gray-500">Insights</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-semibold text-gray-700">
                {{ project.summary.postsTotal }}
              </div>
              <div class="text-xs text-gray-500">Posts</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-semibold text-green-600">
                {{ project.summary.postsPublished }}
              </div>
              <div class="text-xs text-gray-500">Published</div>
            </div>
          </div>
        }
        
        <!-- Tags -->
        @if (project.tags && project.tags.length > 0) {
          <div class="flex flex-wrap gap-1 mb-4">
            @for (tag of project.tags.slice(0, 3); track tag) {
              <span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                {{ tag }}
              </span>
            }
            @if (project.tags.length > 3) {
              <span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                +{{ project.tags.length - 3 }}
              </span>
            }
          </div>
        }
        
        <!-- Footer -->
        <div class="flex items-center justify-between text-xs text-gray-500">
          <div class="flex items-center">
            <i class="pi pi-clock mr-1"></i>
            {{ formatDate(project.updatedAt) }}
          </div>
          <div class="flex items-center space-x-2">
            @for (platform of project.targetPlatforms?.slice(0, 3) || []; track platform) {
              <i 
                [class]="getPlatformIcon(platform)"
                [title]="platform"
              ></i>
            }
          </div>
        </div>
      </div>
      
      <!-- Quick Actions -->
      <div class="border-t border-gray-100 px-6 py-3 flex justify-between">
        <button 
          (click)="$event.stopPropagation(); $event.preventDefault()"
          class="text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          <i class="pi pi-eye mr-1"></i>
          View
        </button>
        <button 
          (click)="$event.stopPropagation(); $event.preventDefault()"
          class="text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          <i class="pi pi-pencil mr-1"></i>
          Edit
        </button>
        <button 
          (click)="$event.stopPropagation(); $event.preventDefault()"
          class="text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          <i class="pi pi-play mr-1"></i>
          Continue
        </button>
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class ProjectCardComponent {
  @Input() project!: ContentProject;
  
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
  
  getProgressBarClass(progress: number): string {
    if (progress < 25) return 'bg-red-500';
    if (progress < 50) return 'bg-orange-500';
    if (progress < 75) return 'bg-yellow-500';
    if (progress < 100) return 'bg-blue-500';
    return 'bg-green-500';
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
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }
}