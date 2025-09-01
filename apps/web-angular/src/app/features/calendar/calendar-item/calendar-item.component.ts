import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent } from '../../../core/models/calendar.model';
import { Platform } from '../../../core/models/project.model';
import { format } from 'date-fns';

@Component({
  selector: 'app-calendar-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      [class]="getEventClass()"
      class="rounded p-2 text-xs cursor-move hover:shadow-md transition-all"
    >
      <!-- Platform Badge -->
      <div class="flex items-center justify-between mb-1">
        <span [class]="getPlatformBadgeClass()" class="text-xs px-1.5 py-0.5 rounded">
          {{ event.platform }}
        </span>
        <span class="text-gray-500">
          {{ formatTime(event.scheduledTime) }}
        </span>
      </div>
      
      <!-- Title -->
      <div class="font-medium text-gray-900 line-clamp-2">
        {{ event.title }}
      </div>
      
      <!-- Project -->
      <div class="text-gray-600 mt-1 text-xs">
        {{ event.projectTitle }}
      </div>
      
      <!-- Status Indicator -->
      <div *ngIf="event.status !== 'scheduled'" class="mt-1">
        <span [class]="getStatusClass()" class="text-xs px-1.5 py-0.5 rounded">
          {{ event.status }}
        </span>
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
export class CalendarItemComponent {
  @Input() event!: CalendarEvent;
  @Input() isDragging: boolean = false;
  
  formatTime(date: Date | string): string {
    return format(new Date(date), 'h:mm a');
  }
  
  getEventClass(): string {
    let baseClass = 'border ';
    
    if (this.isDragging) {
      baseClass += 'opacity-50 ';
    }
    
    switch (this.event.platform) {
      case Platform.LINKEDIN:
        baseClass += 'bg-blue-50 border-blue-200 hover:bg-blue-100';
        break;
      case Platform.TWITTER:
        baseClass += 'bg-sky-50 border-sky-200 hover:bg-sky-100';
        break;
      case Platform.FACEBOOK:
        baseClass += 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100';
        break;
      case Platform.INSTAGRAM:
        baseClass += 'bg-pink-50 border-pink-200 hover:bg-pink-100';
        break;
      default:
        baseClass += 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
    
    return baseClass;
  }
  
  getPlatformBadgeClass(): string {
    switch (this.event.platform) {
      case Platform.LINKEDIN:
        return 'bg-blue-600 text-white';
      case Platform.TWITTER:
        return 'bg-sky-600 text-white';
      case Platform.FACEBOOK:
        return 'bg-indigo-600 text-white';
      case Platform.INSTAGRAM:
        return 'bg-pink-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  }
  
  getStatusClass(): string {
    switch (this.event.status) {
      case 'publishing':
        return 'bg-yellow-100 text-yellow-800';
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}