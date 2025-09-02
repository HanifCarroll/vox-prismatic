import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDropList, CdkDrag, CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CalendarService } from '../../../core/services/calendar.service';
import { CalendarEvent, DragItem } from '../../../core/models/calendar.model';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  format, 
  isSameMonth, 
  isSameDay,
  isBefore,
  startOfDay
} from 'date-fns';

interface MonthDay {
  date: Date;
  dayNumber: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-month-view',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex-1 flex flex-col bg-white h-full">
      <!-- Month Grid -->
      <div class="flex-1 overflow-auto p-4">
        <!-- Day Headers -->
        <div class="grid grid-cols-7 gap-px bg-gray-200 mb-px">
          <div *ngFor="let day of weekDays" class="bg-gray-50 p-2 text-center">
            <span class="text-xs font-medium text-gray-700 uppercase">{{ day }}</span>
          </div>
        </div>
        
        <!-- Calendar Grid -->
        <div class="grid grid-cols-7 gap-px bg-gray-200 flex-1">
          <div
            *ngFor="let day of monthDays()"
            cdkDropList
            [id]="'month-day-' + day.date.toISOString()"
            [cdkDropListData]="day.events"
            [cdkDropListConnectedTo]="getAllDropListIds()"
            (cdkDropListDropped)="onDrop($event, day.date)"
            [class]="getDayClass(day)"
            class="bg-white p-2 min-h-[120px] relative"
          >
            <!-- Day Number -->
            <div class="flex items-center justify-between mb-1">
              <span [class]="getDayNumberClass(day)" class="text-sm font-medium">
                {{ day.dayNumber }}
              </span>
              <span *ngIf="day.events.length > 0" class="text-xs text-gray-500">
                {{ day.events.length }} {{ day.events.length === 1 ? 'post' : 'posts' }}
              </span>
            </div>
            
            <!-- Events (show max 3) -->
            <div class="space-y-1">
              <div
                *ngFor="let event of day.events.slice(0, 3); let i = index"
                cdkDrag
                [cdkDragData]="createDragItemFromEvent(event)"
                class="cursor-move"
              >
                <div [class]="getEventChipClass(event.platform)" 
                     class="text-xs px-1.5 py-0.5 rounded truncate">
                  {{ formatEventTime(event) }} - {{ event.title }}
                </div>
                
                <!-- Drag Preview -->
                <div *cdkDragPreview class="bg-blue-50 border-2 border-blue-300 rounded p-2 shadow-lg max-w-xs">
                  <div class="text-xs font-medium text-blue-900">{{ event.title }}</div>
                  <div class="text-xs text-blue-700">Move to reschedule</div>
                </div>
              </div>
              
              <!-- More indicator -->
              <div *ngIf="day.events.length > 3" class="text-xs text-gray-500 font-medium">
                +{{ day.events.length - 3 }} more
              </div>
            </div>
            
            <!-- Drop indicator -->
            <div 
              *ngIf="isDragOver === 'month-day-' + day.date.toISOString()"
              class="absolute inset-0 bg-blue-50 bg-opacity-50 border-2 border-blue-400 border-dashed rounded pointer-events-none"
            ></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cdk-drag-preview {
      z-index: 1000;
    }
    .cdk-drag-placeholder {
      opacity: 0.5;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class MonthViewComponent {
  private calendarService = inject(CalendarService);
  
  weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  isDragOver: string | null = null;
  
  currentDate = computed(() => this.calendarService.currentDate());
  filteredEvents = computed(() => this.calendarService.filteredEvents());
  
  monthDays = computed(() => {
    const date = this.currentDate();
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const days: MonthDay[] = [];
    let currentDay = start;
    
    while (currentDay <= end) {
      const dayEvents = this.filteredEvents().filter(event =>
        isSameDay(new Date(event.scheduledTime), currentDay)
      );
      
      days.push({
        date: currentDay,
        dayNumber: format(currentDay, 'd'),
        isCurrentMonth: isSameMonth(currentDay, date),
        isToday: isSameDay(currentDay, new Date()),
        events: dayEvents.sort((a, b) => 
          new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
        )
      });
      
      currentDay = addDays(currentDay, 1);
    }
    
    return days;
  });
  
  getAllDropListIds(): string[] {
    const ids: string[] = ['approved-posts-list'];
    this.monthDays().forEach(day => {
      ids.push(`month-day-${day.date.toISOString()}`);
    });
    return ids;
  }
  
  onDrop(event: CdkDragDrop<CalendarEvent[]>, date: Date) {
    const scheduledTime = startOfDay(date);
    const dragItem = event.item.data as DragItem;
    
    // Check if dropping in the past
    if (isBefore(scheduledTime, startOfDay(new Date()))) {
      return;
    }
    
    if (dragItem.type === 'approved-post') {
      // Schedule new post at 9 AM of the selected day
      const scheduledTimeWithHour = addDays(scheduledTime, 0);
      scheduledTimeWithHour.setHours(9, 0, 0, 0);
      
      this.calendarService.schedulePost(dragItem.id, scheduledTimeWithHour, dragItem.platform).subscribe(() => {
        // Reload data
        this.calendarService.getEvents().subscribe();
        this.calendarService.getApprovedPosts().subscribe();
      });
    } else if (dragItem.type === 'post') {
      // Reschedule existing post - keep the time, just change the date
      const originalEvent = this.filteredEvents().find(e => e.id === dragItem.id);
      if (originalEvent) {
        const originalTime = new Date(originalEvent.scheduledTime);
        const newScheduledTime = new Date(date);
        newScheduledTime.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
        
        this.calendarService.updateEventTime(dragItem.id, newScheduledTime).subscribe(() => {
          // Reload data
          this.calendarService.getEvents().subscribe();
        });
      }
    }
  }
  
  createDragItemFromEvent(event: CalendarEvent): DragItem {
    return {
      type: 'post',
      id: event.id,
      title: event.title,
      content: event.content,
      platform: event.platform,
      insightId: event.insightId,
      insightTitle: event.insightTitle,
      projectId: event.projectId
    };
  }
  
  getDayClass(day: MonthDay): string {
    let classes = '';
    
    if (!day.isCurrentMonth) {
      classes += 'bg-gray-50 ';
    }
    if (day.isToday) {
      classes += 'bg-blue-50 ';
    }
    if (isBefore(day.date, startOfDay(new Date())) && !day.isToday) {
      classes += 'bg-gray-100 ';
    }
    
    return classes;
  }
  
  getDayNumberClass(day: MonthDay): string {
    if (day.isToday) {
      return 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center';
    }
    if (!day.isCurrentMonth) {
      return 'text-gray-400';
    }
    return 'text-gray-900';
  }
  
  getEventChipClass(platform: string): string {
    const baseClass = 'text-xs px-1.5 py-0.5 rounded truncate';
    
    switch (platform) {
      case 'LINKEDIN':
        return `${baseClass} bg-blue-100 text-blue-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  }
  
  formatEventTime(event: CalendarEvent): string {
    return format(new Date(event.scheduledTime), 'h:mma');
  }
}