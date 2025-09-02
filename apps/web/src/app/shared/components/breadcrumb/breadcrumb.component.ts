import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { ProjectService } from '../../../core/services/project.service';
import { ContentProject } from '../../../core/models/project.model';

export interface BreadcrumbItem {
  label: string;
  url?: string;
  icon?: string;
  isActive: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav 
      class="flex items-center space-x-2 text-sm"
      aria-label="Breadcrumb"
    >
      <!-- Home -->
      <a 
        [routerLink]="['/']"
        class="text-gray-500 hover:text-gray-700 transition-colors flex items-center"
      >
        <i class="pi pi-home"></i>
      </a>
      
      <!-- Breadcrumb Items -->
      <ng-container *ngFor="let item of breadcrumbs(); let last = last">
        <!-- Separator -->
        <i class="pi pi-angle-right text-gray-400"></i>
        
        <!-- Breadcrumb Item -->
        <div class="flex items-center">
          <!-- Icon if present -->
          <i 
            *ngIf="item.icon"
            [class]="'pi ' + item.icon + ' mr-1 text-gray-500'"
          ></i>
          
          <!-- Link or Text -->
          <a 
            *ngIf="item.url && !last"
            [routerLink]="item.url"
            class="text-gray-500 hover:text-gray-700 transition-colors"
          >
            {{ item.label }}
          </a>
          <span 
            *ngIf="!item.url || last"
            class="text-gray-700 font-medium"
            [class.text-gray-500]="!last"
          >
            {{ item.label }}
          </span>
        </div>
      </ng-container>
      
      <!-- Project Context Badge -->
      <div 
        *ngIf="currentProject()"
        class="ml-4 flex items-center"
      >
        <span class="text-gray-400 mr-2">|</span>
        <div class="flex items-center bg-blue-50 px-2 py-1 rounded-lg">
          <i class="pi pi-folder text-blue-600 mr-1 text-xs"></i>
          <span class="text-xs text-blue-700 font-medium">
            {{ currentProject()?.title }}
          </span>
          <span 
            class="ml-2 px-1.5 py-0.5 text-xs rounded-full"
            [ngClass]="getStageClass(currentProject()!.currentStage)"
          >
            {{ formatStage(currentProject()!.currentStage) }}
          </span>
        </div>
      </div>
    </nav>
  `,
  styles: []
})
export class BreadcrumbComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  
  // State signals
  breadcrumbs = signal<BreadcrumbItem[]>([]);
  currentProject = computed(() => this.projectService.currentProject());
  
  // Route to breadcrumb mapping
  private readonly routeMap: Record<string, { label: string; icon?: string }> = {
    'dashboard': { label: 'Dashboard', icon: 'pi-chart-line' },
    'projects': { label: 'Projects', icon: 'pi-folder' },
    'calendar': { label: 'Publishing Calendar', icon: 'pi-calendar' },
    'settings': { label: 'Settings', icon: 'pi-cog' },
    'insights': { label: 'Insights', icon: 'pi-lightbulb' },
    'posts': { label: 'Posts', icon: 'pi-file-edit' },
    'transcripts': { label: 'Transcripts', icon: 'pi-file' },
    'analytics': { label: 'Analytics', icon: 'pi-chart-bar' },
    'prompts': { label: 'Prompts', icon: 'pi-sparkles' }
  };
  
  ngOnInit(): void {
    // Initial breadcrumb build
    this.buildBreadcrumbs(this.router.url);
    
    // Listen to navigation changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(event => (event as NavigationEnd).url)
    ).subscribe(url => {
      this.buildBreadcrumbs(url);
    });
  }
  
  private buildBreadcrumbs(url: string): void {
    const segments = url.split('/').filter(segment => segment);
    const breadcrumbs: BreadcrumbItem[] = [];
    let currentPath = '';
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += `/${segment}`;
      
      // Skip ID segments (UUIDs or numeric IDs)
      if (this.isIdSegment(segment)) {
        continue;
      }
      
      // Handle special segments
      if (segment === 'new') {
        breadcrumbs.push({
          label: 'New',
          isActive: i === segments.length - 1
        });
        continue;
      }
      
      if (segment === 'edit') {
        breadcrumbs.push({
          label: 'Edit',
          isActive: i === segments.length - 1
        });
        continue;
      }
      
      // Get label and icon from route map
      const routeInfo = this.routeMap[segment];
      if (routeInfo) {
        breadcrumbs.push({
          label: routeInfo.label,
          icon: routeInfo.icon,
          url: currentPath,
          isActive: i === segments.length - 1
        });
      } else {
        // Fallback: capitalize segment
        breadcrumbs.push({
          label: this.capitalizeSegment(segment),
          url: currentPath,
          isActive: i === segments.length - 1
        });
      }
      
      // Handle project details
      if (segment === 'projects' && i < segments.length - 1) {
        const nextSegment = segments[i + 1];
        if (this.isIdSegment(nextSegment)) {
          // Load project details if needed
          this.loadProjectIfNeeded(nextSegment);
          
          // Add project-specific breadcrumb
          const project = this.currentProject();
          if (project) {
            breadcrumbs.push({
              label: project.title,
              url: `/projects/${nextSegment}`,
              isActive: i + 1 === segments.length - 1
            });
          }
          i++; // Skip the ID segment
          
          // Check for sub-routes
          if (i < segments.length - 1) {
            const subRoute = segments[i + 1];
            if (subRoute === 'insights') {
              breadcrumbs.push({
                label: 'Insights',
                icon: 'pi-lightbulb',
                url: `/projects/${nextSegment}/insights`,
                isActive: i + 1 === segments.length - 1
              });
            } else if (subRoute === 'posts') {
              breadcrumbs.push({
                label: 'Posts',
                icon: 'pi-file-edit',
                url: `/projects/${nextSegment}/posts`,
                isActive: i + 1 === segments.length - 1
              });
            }
          }
        }
      }
    }
    
    this.breadcrumbs.set(breadcrumbs);
  }
  
  private isIdSegment(segment: string): boolean {
    // Check if segment is a UUID or numeric ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const numericRegex = /^\d+$/;
    return uuidRegex.test(segment) || numericRegex.test(segment);
  }
  
  private capitalizeSegment(segment: string): string {
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  private loadProjectIfNeeded(projectId: string): void {
    const currentProject = this.currentProject();
    if (!currentProject || currentProject.id !== projectId) {
      // Load project details
      this.projectService.getProject(projectId).subscribe();
    }
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
}