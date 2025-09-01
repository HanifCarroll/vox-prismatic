import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Post, Platform, Insight } from '../../../core/models/project.model';
import { ProjectService } from '../../../core/services/project.service';

interface PostFilter {
  platform: Platform | '';
  showApproved: boolean;
  showPending: boolean;
  insightId: string;
}

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header and Controls -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-800">Post Editor</h2>
            <p class="text-sm text-gray-600 mt-1">
              Review, edit, and approve posts for social media platforms
            </p>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-sm text-gray-600">
              <span class="font-medium">{{ getApprovedCount() }}</span> of 
              <span class="font-medium">{{ posts.length }}</span> approved
            </div>
            <button
              (click)="toggleFilters()"
              class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <i class="pi pi-filter mr-1"></i>
              Filters
            </button>
            <button
              (click)="generateMorePosts()"
              class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <i class="pi pi-plus mr-1"></i>
              Generate More
            </button>
          </div>
        </div>
        
        <!-- Filters Panel -->
        <div *ngIf="showFilters" class="border-t pt-4 mt-4">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Platform</label>
              <select
                [(ngModel)]="filters.platform"
                (ngModelChange)="applyFilters()"
                class="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Platforms</option>
                <option *ngFor="let platform of platforms" [value]="platform">
                  {{ getPlatformLabel(platform) }}
                </option>
              </select>
            </div>
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
              <label class="block text-xs font-medium text-gray-700 mb-1">Source Insight</label>
              <select
                [(ngModel)]="filters.insightId"
                (ngModelChange)="applyFilters()"
                class="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Insights</option>
                <option *ngFor="let insight of insights" [value]="insight.id">
                  {{ truncateText(insight.content, 30) }}
                </option>
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
              {{ selectedPosts.size }} selected
            </span>
          </div>
          <div class="flex items-center space-x-2" *ngIf="selectedPosts.size > 0">
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
          </div>
        </div>
      </div>
      
      <!-- Posts Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          *ngFor="let post of filteredPosts"
          class="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          [class.border-l-4]="post.isApproved"
          [class.border-green-500]="post.isApproved"
        >
          <!-- Post Header -->
          <div class="p-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <input
                  type="checkbox"
                  [checked]="selectedPosts.has(post.id)"
                  (change)="toggleSelection(post.id)"
                  class="rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                >
                <i [class]="getPlatformIcon(post.platform) + ' text-xl'"></i>
                <span class="font-medium text-sm">{{ getPlatformLabel(post.platform) }}</span>
              </div>
              <span 
                *ngIf="post.isApproved"
                class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
              >
                <i class="pi pi-check-circle mr-1"></i>
                Approved
              </span>
            </div>
          </div>
          
          <!-- Post Content -->
          <div class="p-4">
            <div class="mb-3">
              <textarea
                [(ngModel)]="post.content"
                (ngModelChange)="onPostContentChange(post)"
                [disabled]="!editingPost || editingPost.id !== post.id"
                class="w-full p-2 text-sm border border-gray-200 rounded resize-none"
                [class.bg-gray-50]="!editingPost || editingPost.id !== post.id"
                [class.bg-white]="editingPost?.id === post.id"
                rows="5"
              ></textarea>
            </div>
            
            <!-- Character Count -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center space-x-2 text-xs">
                <span [class]="getCharacterCountClass(post)">
                  {{ post.content.length }} / {{ getCharacterLimit(post.platform) }}
                </span>
                <span *ngIf="isOverLimit(post)" class="text-red-600">
                  <i class="pi pi-exclamation-triangle"></i>
                  Over limit
                </span>
              </div>
              <div class="text-xs text-gray-500">
                {{ formatRelativeDate(post.updatedAt) }}
              </div>
            </div>
            
            <!-- Hashtags -->
            <div *ngIf="post.hashtags?.length" class="mb-3">
              <div class="flex flex-wrap gap-1">
                <span 
                  *ngFor="let tag of post.hashtags"
                  class="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>
            
            <!-- Media Attachments -->
            <div *ngIf="post.mediaUrls?.length" class="mb-3">
              <div class="flex items-center space-x-2 text-xs text-gray-600">
                <i class="pi pi-image"></i>
                <span>{{ post.mediaUrls.length }} media attachment(s)</span>
              </div>
            </div>
            
            <!-- Source Insight -->
            <div *ngIf="getInsightForPost(post)" class="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
              <span class="font-medium">Source:</span>
              {{ truncateText(getInsightForPost(post)!.content, 50) }}
            </div>
            
            <!-- Actions -->
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <button
                  *ngIf="!editingPost || editingPost.id !== post.id"
                  (click)="startEditing(post)"
                  class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  <i class="pi pi-pencil mr-1"></i>
                  Edit
                </button>
                <button
                  *ngIf="editingPost?.id === post.id"
                  (click)="savePost(post)"
                  class="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  <i class="pi pi-check mr-1"></i>
                  Save
                </button>
                <button
                  *ngIf="editingPost?.id === post.id"
                  (click)="cancelEditing()"
                  class="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  <i class="pi pi-times mr-1"></i>
                  Cancel
                </button>
              </div>
              <div class="flex items-center space-x-2">
                <button
                  *ngIf="!post.isApproved"
                  (click)="approvePost(post)"
                  class="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  <i class="pi pi-check"></i>
                </button>
                <button
                  *ngIf="post.isApproved"
                  (click)="revokeApproval(post)"
                  class="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  <i class="pi pi-undo"></i>
                </button>
                <button
                  (click)="duplicatePost(post)"
                  class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <i class="pi pi-copy"></i>
                </button>
                <button
                  (click)="deletePost(post)"
                  class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div *ngIf="filteredPosts.length === 0" class="bg-white rounded-lg shadow p-12 text-center">
        <i class="pi pi-file-edit text-5xl text-gray-300 mb-4"></i>
        <p class="text-lg text-gray-600 mb-2">No posts found</p>
        <p class="text-sm text-gray-500">
          {{ posts.length === 0 ? 'Generate posts from approved insights' : 'Try adjusting your filters' }}
        </p>
        <button
          *ngIf="posts.length === 0 && hasApprovedInsights()"
          (click)="generateMorePosts()"
          class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Generate Posts
        </button>
      </div>
    </div>
  `,
  styles: [`
    textarea:disabled {
      cursor: default;
    }
  `]
})
export class PostEditorComponent {
  @Input() posts: Post[] = [];
  @Input() insights: Insight[] = [];
  @Input() projectId!: string;
  @Input() targetPlatforms: Platform[] = [];
  @Output() postsUpdated = new EventEmitter<Post[]>();
  
  private projectService = inject(ProjectService);
  
  filteredPosts: Post[] = [];
  selectedPosts = new Set<string>();
  selectAll = false;
  showFilters = false;
  filterStatus = 'all';
  editingPost: Post | null = null;
  originalContent: Map<string, string> = new Map();
  
  filters: PostFilter = {
    platform: '',
    showApproved: true,
    showPending: true,
    insightId: ''
  };
  
  platforms = Object.values(Platform);
  
  characterLimits: Record<Platform, number> = {
    [Platform.TWITTER]: 280,
    [Platform.LINKEDIN]: 3000,
    [Platform.THREADS]: 500,
    [Platform.BLUESKY]: 300,
    [Platform.FACEBOOK]: 63206,
    [Platform.INSTAGRAM]: 2200
  };
  
  ngOnInit(): void {
    this.applyFilters();
  }
  
  ngOnChanges(): void {
    this.applyFilters();
  }
  
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }
  
  applyFilters(): void {
    let filtered = [...this.posts];
    
    if (this.filters.platform) {
      filtered = filtered.filter(p => p.platform === this.filters.platform);
    }
    
    if (this.filterStatus === 'approved') {
      filtered = filtered.filter(p => p.isApproved);
    } else if (this.filterStatus === 'pending') {
      filtered = filtered.filter(p => !p.isApproved);
    }
    
    if (this.filters.insightId) {
      filtered = filtered.filter(p => p.insightId === this.filters.insightId);
    }
    
    this.filteredPosts = filtered;
  }
  
  resetFilters(): void {
    this.filters = {
      platform: '',
      showApproved: true,
      showPending: true,
      insightId: ''
    };
    this.filterStatus = 'all';
    this.applyFilters();
  }
  
  toggleSelectAll(): void {
    if (this.selectAll) {
      this.filteredPosts.forEach(post => {
        this.selectedPosts.add(post.id);
      });
    } else {
      this.selectedPosts.clear();
    }
  }
  
  toggleSelection(postId: string): void {
    if (this.selectedPosts.has(postId)) {
      this.selectedPosts.delete(postId);
    } else {
      this.selectedPosts.add(postId);
    }
    this.selectAll = this.selectedPosts.size === this.filteredPosts.length;
  }
  
  startEditing(post: Post): void {
    this.editingPost = post;
    this.originalContent.set(post.id, post.content);
  }
  
  cancelEditing(): void {
    if (this.editingPost && this.originalContent.has(this.editingPost.id)) {
      this.editingPost.content = this.originalContent.get(this.editingPost.id)!;
    }
    this.editingPost = null;
    this.originalContent.clear();
  }
  
  savePost(post: Post): void {
    this.projectService.updatePost(this.projectId, post.id, {
      content: post.content,
      characterCount: post.content.length
    }).subscribe({
      next: () => {
        this.editingPost = null;
        this.originalContent.delete(post.id);
        post.characterCount = post.content.length;
        this.postsUpdated.emit(this.posts);
      }
    });
  }
  
  onPostContentChange(post: Post): void {
    post.characterCount = post.content.length;
  }
  
  approvePost(post: Post): void {
    this.projectService.updatePost(this.projectId, post.id, {
      isApproved: true
    }).subscribe({
      next: () => {
        post.isApproved = true;
        this.postsUpdated.emit(this.posts);
      }
    });
  }
  
  revokeApproval(post: Post): void {
    this.projectService.updatePost(this.projectId, post.id, {
      isApproved: false
    }).subscribe({
      next: () => {
        post.isApproved = false;
        this.postsUpdated.emit(this.posts);
      }
    });
  }
  
  duplicatePost(post: Post): void {
    // TODO: Implement post duplication
    console.log('Duplicate post:', post);
  }
  
  deletePost(post: Post): void {
    if (confirm('Are you sure you want to delete this post?')) {
      this.projectService.deletePost(this.projectId, post.id).subscribe({
        next: () => {
          const index = this.posts.findIndex(p => p.id === post.id);
          if (index !== -1) {
            this.posts.splice(index, 1);
            this.applyFilters();
            this.postsUpdated.emit(this.posts);
          }
        }
      });
    }
  }
  
  bulkApprove(): void {
    const selectedIds = Array.from(this.selectedPosts);
    const updates = selectedIds.map(id => 
      this.projectService.updatePost(this.projectId, id, { isApproved: true })
    );
    
    Promise.all(updates.map(obs => obs.toPromise())).then(() => {
      this.posts.forEach(post => {
        if (this.selectedPosts.has(post.id)) {
          post.isApproved = true;
        }
      });
      this.selectedPosts.clear();
      this.selectAll = false;
      this.postsUpdated.emit(this.posts);
    });
  }
  
  bulkReject(): void {
    const selectedIds = Array.from(this.selectedPosts);
    const updates = selectedIds.map(id => 
      this.projectService.updatePost(this.projectId, id, { isApproved: false })
    );
    
    Promise.all(updates.map(obs => obs.toPromise())).then(() => {
      this.posts.forEach(post => {
        if (this.selectedPosts.has(post.id)) {
          post.isApproved = false;
        }
      });
      this.selectedPosts.clear();
      this.selectAll = false;
      this.postsUpdated.emit(this.posts);
    });
  }
  
  generateMorePosts(): void {
    const approvedInsightIds = this.insights
      .filter(i => i.isApproved)
      .map(i => i.id);
    
    if (approvedInsightIds.length > 0) {
      this.projectService.generatePosts(this.projectId, approvedInsightIds).subscribe({
        next: (newPosts) => {
          // Reload posts
          console.log('Posts generated:', newPosts);
        }
      });
    }
  }
  
  hasApprovedInsights(): boolean {
    return this.insights.some(i => i.isApproved);
  }
  
  getApprovedCount(): number {
    return this.posts.filter(p => p.isApproved).length;
  }
  
  getInsightForPost(post: Post): Insight | undefined {
    return this.insights.find(i => i.id === post.insightId);
  }
  
  getPlatformLabel(platform: Platform): string {
    const labels: Record<Platform, string> = {
      [Platform.LINKEDIN]: 'LinkedIn',
      [Platform.TWITTER]: 'X (Twitter)',
      [Platform.THREADS]: 'Threads',
      [Platform.BLUESKY]: 'Bluesky',
      [Platform.FACEBOOK]: 'Facebook',
      [Platform.INSTAGRAM]: 'Instagram'
    };
    return labels[platform] || platform;
  }
  
  getPlatformIcon(platform: Platform): string {
    const icons: Record<Platform, string> = {
      [Platform.LINKEDIN]: 'pi pi-linkedin text-blue-700',
      [Platform.TWITTER]: 'pi pi-twitter text-blue-400',
      [Platform.THREADS]: 'pi pi-at text-gray-700',
      [Platform.BLUESKY]: 'pi pi-cloud text-sky-500',
      [Platform.FACEBOOK]: 'pi pi-facebook text-blue-600',
      [Platform.INSTAGRAM]: 'pi pi-instagram text-pink-600'
    };
    return icons[platform] || 'pi pi-globe text-gray-500';
  }
  
  getCharacterLimit(platform: Platform): number {
    return this.characterLimits[platform] || 1000;
  }
  
  isOverLimit(post: Post): boolean {
    return post.content.length > this.getCharacterLimit(post.platform);
  }
  
  getCharacterCountClass(post: Post): string {
    const limit = this.getCharacterLimit(post.platform);
    const ratio = post.content.length / limit;
    
    if (ratio > 1) return 'text-red-600 font-medium';
    if (ratio > 0.9) return 'text-orange-600';
    if (ratio > 0.8) return 'text-yellow-600';
    return 'text-gray-600';
  }
  
  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
  
  formatRelativeDate(date: Date | string): string {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return then.toLocaleDateString();
  }
}