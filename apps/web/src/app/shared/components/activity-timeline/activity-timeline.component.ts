import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date | string;
  icon?: string;
  color?: string;
  link?: string;
}

@Component({
  selector: 'app-activity-timeline',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-gray-800">Recent Activity</h2>
        <span class="text-sm text-gray-500">
          <i class="pi pi-history mr-1"></i>
          Last 24 hours
        </span>
      </div>
      
      <div class="space-y-4" *ngIf="activities.length > 0">
        <div *ngFor="let activity of activities; let i = index" class="relative">
          <!-- Timeline line -->
          <div 
            *ngIf="i < activities.length - 1"
            class="absolute left-5 top-10 w-0.5 h-full bg-gray-200"
          ></div>
          
          <!-- Activity item -->
          <div class="flex items-start space-x-3">
            <!-- Icon -->
            <div 
              class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10"
              [style.backgroundColor]="activity.color + '20'"
            >
              <i 
                [class]="'pi ' + (activity.icon || 'pi-circle')"
                [style.color]="activity.color || '#6b7280'"
              ></i>
            </div>
            
            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-gray-900">
                    {{ activity.title }}
                  </h4>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ activity.description }}
                  </p>
                </div>
                <time class="text-xs text-gray-400 ml-2">
                  {{ formatTime(activity.timestamp) }}
                </time>
              </div>
              
              <!-- Link if available -->
              <a 
                *ngIf="activity.link"
                [routerLink]="activity.link"
                class="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 mt-2"
              >
                View details
                <i class="pi pi-arrow-right ml-1"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Empty state -->
      <div *ngIf="activities.length === 0" class="text-center py-8">
        <i class="pi pi-history text-4xl text-gray-300"></i>
        <p class="mt-2 text-gray-500">No recent activity</p>
      </div>
    </div>
  `,
  styles: []
})
export class ActivityTimelineComponent {
  @Input() activities: ActivityItem[] = [];
  
  formatTime(timestamp: Date | string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }
}