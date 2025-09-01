import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../../core/services/calendar.service';
import { CalendarView } from '../../../core/models/calendar.model';
import { format } from 'date-fns';

@Component({
  selector: 'app-calendar-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
      <!-- Date Navigation -->
      <div class="flex items-center gap-2">
        <button
          (click)="calendarService.navigateToday()"
          class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Today
        </button>
        
        <div class="flex items-center">
          <button
            (click)="calendarService.navigatePrevious()"
            class="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            (click)="calendarService.navigateNext()"
            class="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <h2 class="text-lg font-semibold text-gray-900">
          {{ formatCurrentDate() }}
        </h2>
      </div>

      <!-- View Selector -->
      <div class="flex items-center gap-2">
        <div class="flex bg-gray-100 rounded-md p-0.5">
          <button
            *ngFor="let view of views"
            (click)="calendarService.setView(view)"
            [class]="getViewButtonClass(view)"
          >
            {{ view | titlecase }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class CalendarHeaderComponent {
  calendarService = inject(CalendarService);
  
  views: CalendarView[] = ['day', 'week', 'month'];
  
  formatCurrentDate(): string {
    const date = this.calendarService.currentDate();
    const view = this.calendarService.currentView();
    
    switch (view) {
      case 'day':
        return format(date, 'EEEE, MMMM d, yyyy');
      case 'week':
        return format(date, 'MMMM yyyy');
      case 'month':
        return format(date, 'MMMM yyyy');
      default:
        return '';
    }
  }
  
  getViewButtonClass(view: CalendarView): string {
    const isActive = this.calendarService.currentView() === view;
    return `px-3 py-1 text-sm font-medium rounded-md transition-colors ${
      isActive 
        ? 'bg-white text-gray-900 shadow-sm' 
        : 'text-gray-600 hover:text-gray-900'
    }`;
  }
}