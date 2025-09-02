import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarService } from '../../core/services/calendar.service';
import { CalendarView } from '../../core/models/calendar.model';
import { CalendarHeaderComponent } from './calendar-header/calendar-header.component';
import { ApprovedPostsSidebarComponent } from './approved-posts-sidebar/approved-posts-sidebar.component';
import { WeekViewComponent } from './week-view/week-view.component';
import { DayViewComponent } from './day-view/day-view.component';
import { MonthViewComponent } from './month-view/month-view.component';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    CalendarHeaderComponent,
    ApprovedPostsSidebarComponent,
    WeekViewComponent,
    DayViewComponent,
    MonthViewComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-full bg-white">
      <!-- Approved Posts Sidebar -->
      <app-approved-posts-sidebar />
      
      <!-- Main Calendar Area -->
      <div class="flex flex-col flex-1 overflow-hidden">
        <!-- Calendar Header -->
        <app-calendar-header />
        
        <!-- Calendar Content -->
        <div class="flex-1 overflow-auto">
          <div class="h-full overflow-auto transition-all duration-300 ease-in-out">
            <!-- Week View -->
            <app-week-view *ngIf="currentView() === 'week'" />
            
            <!-- Day View -->
            <app-day-view *ngIf="currentView() === 'day'" />
            
            <!-- Month View -->
            <app-month-view *ngIf="currentView() === 'month'" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class CalendarComponent implements OnInit {
  private calendarService = inject(CalendarService);
  
  currentView = computed(() => this.calendarService.currentView());
  
  ngOnInit() {
    // Load initial data
    this.calendarService.getEvents().subscribe();
    this.calendarService.getApprovedPosts().subscribe();
  }
}