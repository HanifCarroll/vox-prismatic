import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, CdkDropList, CdkDrag, DragDropModule } from '@angular/cdk/drag-drop';
import { CalendarService } from '../../../core/services/calendar.service';
import { ApprovedPost, DragItem } from '../../../core/models/calendar.model';
import { Platform } from '../../../core/models/project.model';

@Component({
  selector: 'app-approved-posts-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full"
      [class.w-16]="!isExpanded()"
      cdkDropList
      id="approved-posts-list"
      [cdkDropListData]="filteredPosts()"
      (cdkDropListDropped)="onDrop($event)"
    >
      <!-- Header -->
      <div class="p-4 border-b border-gray-200 bg-white">
        <div class="flex items-center justify-between mb-3">
          <h3 *ngIf="isExpanded()" class="font-semibold text-gray-900">
            Approved Posts ({{ filteredPosts().length }})
          </h3>
          <button
            (click)="isExpanded.set(!isExpanded())"
            class="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg *ngIf="isExpanded()" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7" />
            </svg>
            <svg *ngIf="!isExpanded()" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <!-- Filters (only when expanded) -->
        <div *ngIf="isExpanded()" class="space-y-2">
          <!-- Search -->
          <div class="relative">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search posts..."
              class="w-full px-3 py-2 pl-9 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
            <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <!-- Platform Filter -->
          <select
            [(ngModel)]="platformFilter"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Platforms</option>
            <option *ngFor="let platform of platforms" [value]="platform">
              {{ platform }}
            </option>
          </select>
        </div>
      </div>
      
      <!-- Posts List -->
      <div *ngIf="isExpanded()" class="flex-1 overflow-y-auto p-4 space-y-2">
        <!-- Empty State -->
        <div *ngIf="filteredPosts().length === 0" class="text-center py-8 text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-sm">No approved posts found</p>
        </div>
        
        <!-- Post Cards -->
        <div
          *ngFor="let post of filteredPosts()"
          cdkDrag
          [cdkDragData]="createDragItem(post)"
          class="bg-white border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow"
          (cdkDragStarted)="onDragStarted()"
          (cdkDragEnded)="onDragEnded()"
        >
          <!-- Platform Icon -->
          <div class="flex items-center justify-between mb-2">
            <span [class]="getPlatformClass(post.platform)" class="text-xs font-medium px-2 py-1 rounded">
              {{ post.platform }}
            </span>
          </div>
          
          <!-- Post Title -->
          <h4 class="font-medium text-sm text-gray-900 mb-1 line-clamp-1">
            {{ post.title }}
          </h4>
          
          <!-- Post Content Preview -->
          <p class="text-xs text-gray-600 line-clamp-2 mb-2">
            {{ post.content }}
          </p>
          
          <!-- Metadata -->
          <div class="text-xs text-gray-500">
            <span>{{ post.projectTitle }}</span>
          </div>
          
          <!-- Drag Preview -->
          <div *cdkDragPreview class="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 shadow-lg">
            <div class="text-sm font-medium text-blue-900">{{ post.title }}</div>
            <div class="text-xs text-blue-700 mt-1">Drag to calendar to schedule</div>
          </div>
        </div>
      </div>
      
      <!-- Collapsed State -->
      <div *ngIf="!isExpanded()" class="flex-1 flex items-center justify-center">
        <div class="transform -rotate-90 whitespace-nowrap text-sm font-medium text-gray-600">
          Approved Posts
        </div>
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-1 {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .cdk-drag-preview {
      z-index: 1000;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class ApprovedPostsSidebarComponent implements OnInit {
  private calendarService = inject(CalendarService);
  
  isExpanded = signal(true);
  searchQuery = signal('');
  platformFilter = signal<Platform | ''>('');
  isDragging = signal(false);
  
  approvedPosts = signal<ApprovedPost[]>([]);
  platforms = Object.values(Platform);
  
  filteredPosts = computed(() => {
    const posts = this.approvedPosts();
    const search = this.searchQuery().toLowerCase();
    const platform = this.platformFilter();
    
    return posts.filter(post => {
      const matchesSearch = !search || 
        post.title.toLowerCase().includes(search) ||
        post.content.toLowerCase().includes(search);
      
      const matchesPlatform = !platform || post.platform === platform;
      
      return matchesSearch && matchesPlatform;
    });
  });
  
  ngOnInit() {
    this.loadApprovedPosts();
  }
  
  loadApprovedPosts() {
    this.calendarService.getApprovedPosts().subscribe(posts => {
      this.approvedPosts.set(posts);
    });
  }
  
  createDragItem(post: ApprovedPost): DragItem {
    return {
      type: 'approved-post',
      id: post.id,
      title: post.title,
      content: post.content,
      platform: post.platform,
      insightId: post.insightId,
      insightTitle: post.insightTitle,
      projectId: post.projectId
    };
  }
  
  onDragStarted() {
    this.isDragging.set(true);
  }
  
  onDragEnded() {
    this.isDragging.set(false);
  }
  
  onDrop(event: CdkDragDrop<any>) {
    // Handle dropping scheduled posts back to approved list
    if (event.previousContainer !== event.container && event.item.data.type === 'post') {
      // Unschedule the post
      this.calendarService.deleteEvent(event.item.data.id).subscribe(() => {
        this.loadApprovedPosts();
      });
    }
  }
  
  getPlatformClass(platform: Platform): string {
    const baseClass = 'text-xs font-medium px-2 py-1 rounded';
    switch (platform) {
      case Platform.LINKEDIN:
        return `${baseClass} bg-blue-100 text-blue-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  }
}