import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDropList, CdkDrag, CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CalendarService } from '../../../core/services/calendar.service';
import { CalendarEvent, DragItem, DayInfo } from '../../../core/models/calendar.model';
import { startOfWeek, addDays, format, isSameDay, isSameMonth, addHours, isBefore } from 'date-fns';
import { CalendarItemComponent } from '../calendar-item/calendar-item.component';

@Component({
  selector: 'app-week-view',
  standalone: true,
  imports: [CommonModule, DragDropModule, CalendarItemComponent],
  template: `
    <div class="flex-1 flex flex-col bg-white h-full">
      <div class="flex-1 overflow-auto">
        <!-- Calendar Grid -->
        <div class="grid grid-cols-[60px_repeat(7,_1fr)] gap-0 relative min-h-full">
          <!-- Header Row -->
          <div class="sticky top-0 bg-gray-50 border-b border-gray-200 z-20">
            <div class="h-16 border-r border-gray-200"></div>
          </div>
          
          <!-- Day Headers -->
          <div
            *ngFor="let day of weekDays()"
            [class]="getDayHeaderClass(day)"
            class="sticky top-0 h-16 border-b border-r border-gray-200 z-20 flex flex-col items-center justify-center text-center"
          >
            <div [class]="getDayNameClass(day)" class="text-xs font-medium uppercase tracking-wide mb-1">
              {{ day.dayName }}
            </div>
            <div [class]="getDayNumberClass(day)">
              {{ day.dayNumber }}
            </div>
          </div>
          
          <!-- Time Slots -->
          <ng-container *ngFor="let hour of hours">
            <!-- Hour Label -->
            <div class="min-h-20 border-r border-gray-200 flex items-start justify-end pr-2 pt-2">
              <span class="text-xs text-gray-500 font-medium">
                {{ formatHour(hour) }}
              </span>
            </div>
            
            <!-- Day Columns for this hour -->
            <div
              *ngFor="let day of weekDays()"
              cdkDropList
              [id]="'slot-' + day.date.toISOString() + '-' + hour"
              [cdkDropListData]="getEventsForSlot(day.date, hour)"
              [cdkDropListConnectedTo]="getAllDropListIds()"
              (cdkDropListDropped)="onDrop($event, day.date, hour)"
              [class]="getTimeSlotClass(day, hour)"
              class="min-h-20 border-r border-b border-gray-200 p-1 relative"
            >
              <!-- Events in this slot -->
              <div
                *ngFor="let event of getEventsForSlot(day.date, hour)"
                cdkDrag
                [cdkDragData]="createDragItemFromEvent(event)"
                class="mb-1"
              >
                <app-calendar-item
                  [event]="event"
                  [isDragging]="false"
                />
                
                <!-- Drag Preview -->
                <div *cdkDragPreview class="bg-blue-50 border-2 border-blue-300 rounded p-2 shadow-lg">
                  <div class="text-xs font-medium text-blue-900">{{ event.title }}</div>
                  <div class="text-xs text-blue-700">Move to reschedule</div>
                </div>
              </div>
              
              <!-- Drop zone indicator -->
              <div 
                *ngIf="isDragOver === 'slot-' + day.date.toISOString() + '-' + hour"
                class="absolute inset-0 bg-blue-50 bg-opacity-50 border-2 border-blue-400 border-dashed rounded pointer-events-none"
              ></div>
            </div>
          </ng-container>
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
    .cdk-drop-list-dragging {
      cursor: move;
    }
  `]
})
export class WeekViewComponent {
  private calendarService = inject(CalendarService);
  
  hours = Array.from({ length: 24 }, (_, i) => i);
  isDragOver: string | null = null;
  
  weekDays = computed(() => {
    const currentDate = this.calendarService.currentDate();
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days: DayInfo[] = [];
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      days.push({
        date: day,
        dayName: format(day, 'eee'),
        dayNumber: format(day, 'd'),
        isToday: isSameDay(day, new Date()),
        isCurrentMonth: isSameMonth(day, currentDate)
      });
    }
    
    return days;
  });
  
  filteredEvents = computed(() => this.calendarService.filteredEvents());
  
  formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }
  
  getEventsForSlot(date: Date, hour: number): CalendarEvent[] {
    const slotStart = addHours(date, hour);
    const slotEnd = addHours(date, hour + 1);
    
    return this.filteredEvents().filter(event => {
      const eventTime = new Date(event.scheduledTime);
      return eventTime >= slotStart && eventTime < slotEnd;
    });
  }
  
  getAllDropListIds(): string[] {
    const ids: string[] = ['approved-posts-list'];
    this.weekDays().forEach(day => {
      this.hours.forEach(hour => {
        ids.push(`slot-${day.date.toISOString()}-${hour}`);
      });
    });
    return ids;
  }
  
  onDrop(event: CdkDragDrop<CalendarEvent[]>, date: Date, hour: number) {
    const scheduledTime = addHours(date, hour);
    const dragItem = event.item.data as DragItem;
    
    // Check if dropping in the past
    if (isBefore(scheduledTime, new Date())) {
      return;
    }
    
    if (dragItem.type === 'approved-post') {
      // Schedule new post
      this.calendarService.schedulePost(dragItem.id, scheduledTime, dragItem.platform).subscribe(() => {
        // Reload data
        this.calendarService.getEvents().subscribe();
        this.calendarService.getApprovedPosts().subscribe();
      });
    } else if (dragItem.type === 'post') {
      // Reschedule existing post
      this.calendarService.updateEventTime(dragItem.id, scheduledTime).subscribe(() => {
        // Reload data
        this.calendarService.getEvents().subscribe();
      });
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
  
  getDayHeaderClass(day: DayInfo): string {
    return day.isToday ? 'bg-blue-50' : 'bg-gray-50';
  }
  
  getDayNameClass(day: DayInfo): string {
    return day.isToday ? 'text-blue-600' : 'text-gray-600';
  }
  
  getDayNumberClass(day: DayInfo): string {
    if (day.isToday) {
      return 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg font-semibold';
    }
    return day.isCurrentMonth ? 'text-gray-900 text-lg font-semibold' : 'text-gray-400 text-lg font-semibold';
  }
  
  getTimeSlotClass(day: DayInfo, hour: number): string {
    const isPast = isBefore(addHours(day.date, hour), new Date());
    let classes = '';
    
    if (isPast) {
      classes += 'bg-gray-50 ';
    }
    if (day.isToday) {
      classes += 'bg-blue-50 bg-opacity-20 ';
    }
    
    return classes;
  }
}