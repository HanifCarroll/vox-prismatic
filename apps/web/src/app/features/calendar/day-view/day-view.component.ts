import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDropList, CdkDrag, CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CalendarService } from '../../../core/services/calendar.service';
import { CalendarEvent, DragItem } from '../../../core/models/calendar.model';
import { format, addHours, isBefore, isSameDay } from 'date-fns';
import { CalendarItemComponent } from '../calendar-item/calendar-item.component';

@Component({
  selector: 'app-day-view',
  standalone: true,
  imports: [CommonModule, DragDropModule, CalendarItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex-1 flex flex-col bg-white h-full">
      <!-- Day Header -->
      <div class="bg-gray-50 border-b border-gray-200 p-4">
        <h2 class="text-lg font-semibold text-gray-900">
          {{ formatDate() }}
        </h2>
      </div>
      
      <!-- Time Slots -->
      <div class="flex-1 overflow-y-auto">
        <div class="min-w-full">
          <div *ngFor="let hour of hours" class="flex border-b border-gray-200">
            <!-- Hour Label -->
            <div class="w-24 py-4 px-4 text-right text-sm text-gray-500 font-medium border-r border-gray-200">
              {{ formatHour(hour) }}
            </div>
            
            <!-- Event Slot -->
            <div
              cdkDropList
              [id]="'day-slot-' + hour"
              [cdkDropListData]="getEventsForHour(hour)"
              [cdkDropListConnectedTo]="getAllDropListIds()"
              (cdkDropListDropped)="onDrop($event, hour)"
              [class]="getSlotClass(hour)"
              class="flex-1 p-2 min-h-[80px] relative"
            >
              <!-- Events -->
              <div
                *ngFor="let event of getEventsForHour(hour)"
                cdkDrag
                [cdkDragData]="createDragItemFromEvent(event)"
                class="mb-2 max-w-md"
              >
                <app-calendar-item
                  [event]="event"
                  [isDragging]="false"
                />
                
                <!-- Drag Preview -->
                <div *cdkDragPreview class="bg-blue-50 border-2 border-blue-300 rounded p-2 shadow-lg max-w-sm">
                  <div class="text-xs font-medium text-blue-900">{{ event.title }}</div>
                  <div class="text-xs text-blue-700">Move to reschedule</div>
                </div>
              </div>
              
              <!-- Current Time Indicator -->
              <div
                *ngIf="isCurrentHour(hour)"
                class="absolute left-0 right-0 border-t-2 border-red-500 pointer-events-none"
                [style.top.px]="getCurrentTimePosition(hour)"
              >
                <div class="absolute -left-2 -top-2 w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
            </div>
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
export class DayViewComponent {
  private calendarService = inject(CalendarService);
  
  hours = Array.from({ length: 24 }, (_, i) => i);
  
  currentDate = computed(() => this.calendarService.currentDate());
  filteredEvents = computed(() => {
    const date = this.currentDate();
    return this.calendarService.filteredEvents().filter(event => 
      isSameDay(new Date(event.scheduledTime), date)
    );
  });
  
  formatDate(): string {
    return format(this.currentDate(), 'EEEE, MMMM d, yyyy');
  }
  
  formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }
  
  getEventsForHour(hour: number): CalendarEvent[] {
    const date = this.currentDate();
    const slotStart = addHours(date, hour);
    const slotEnd = addHours(date, hour + 1);
    
    return this.filteredEvents().filter(event => {
      const eventTime = new Date(event.scheduledTime);
      return eventTime >= slotStart && eventTime < slotEnd;
    });
  }
  
  getAllDropListIds(): string[] {
    const ids: string[] = ['approved-posts-list'];
    this.hours.forEach(hour => {
      ids.push(`day-slot-${hour}`);
    });
    return ids;
  }
  
  onDrop(event: CdkDragDrop<CalendarEvent[]>, hour: number) {
    const scheduledTime = addHours(this.currentDate(), hour);
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
  
  getSlotClass(hour: number): string {
    const isPast = isBefore(addHours(this.currentDate(), hour), new Date());
    const isCurrentHour = this.isCurrentHour(hour);
    
    let classes = '';
    if (isPast) {
      classes += 'bg-gray-50 ';
    }
    if (isCurrentHour) {
      classes += 'bg-yellow-50 bg-opacity-30 ';
    }
    
    return classes;
  }
  
  isCurrentHour(hour: number): boolean {
    if (!isSameDay(this.currentDate(), new Date())) {
      return false;
    }
    const now = new Date();
    return now.getHours() === hour;
  }
  
  getCurrentTimePosition(hour: number): number {
    const now = new Date();
    const minutes = now.getMinutes();
    return (minutes / 60) * 80; // 80px is the min-height of the slot
  }
}