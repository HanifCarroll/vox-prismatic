import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of, delay, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { CalendarEvent, ApprovedPost, CalendarView, CalendarFilters } from '../models/calendar.model';
import { Platform } from '../models/project.model';
import { addDays, addHours, startOfWeek, startOfMonth, format } from 'date-fns';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private apiService = inject(ApiService);

  // Signals for reactive state management
  currentDate = signal(new Date());
  currentView = signal<CalendarView>('week');
  filters = signal<CalendarFilters>({});
  
  private eventsSubject = new BehaviorSubject<CalendarEvent[]>([]);
  private approvedPostsSubject = new BehaviorSubject<ApprovedPost[]>([]);
  
  events$ = this.eventsSubject.asObservable();
  approvedPosts$ = this.approvedPostsSubject.asObservable();

  // Computed signal for filtered events
  filteredEvents = computed(() => {
    const events = this.eventsSubject.value;
    const currentFilters = this.filters();
    
    return events.filter(event => {
      if (currentFilters.platforms?.length && 
          !currentFilters.platforms.includes(event.platform)) {
        return false;
      }
      if (currentFilters.status && event.status !== currentFilters.status) {
        return false;
      }
      return true;
    });
  });

  constructor() {
    if (environment.useMockData) {
      this.loadMockData();
    }
  }

  private loadMockData(): void {
    // Generate mock calendar events
    const mockEvents: CalendarEvent[] = [];
    const today = new Date();
    const platforms = Object.values(Platform);
    
    // Generate events for the next 2 weeks
    for (let i = 0; i < 14; i++) {
      const date = addDays(today, i);
      const numEvents = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < numEvents; j++) {
        const hour = Math.floor(Math.random() * 12) + 9; // 9 AM to 9 PM
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        
        mockEvents.push({
          id: `event-${i}-${j}`,
          postId: `post-${i}-${j}`,
          title: `${platform} Post ${i + 1}-${j + 1}`,
          content: `This is sample content for a ${platform} post scheduled for ${format(date, 'MMM dd')} at ${hour}:00.`,
          platform,
          scheduledTime: addHours(date, hour),
          status: i < 0 ? 'published' : 'scheduled',
          insightId: `insight-${Math.floor(Math.random() * 5)}`,
          insightTitle: `Insight ${Math.floor(Math.random() * 5) + 1}`,
          projectId: `project-${Math.floor(Math.random() * 3)}`,
          projectTitle: `Project ${Math.floor(Math.random() * 3) + 1}`
        });
      }
    }
    
    // Generate mock approved posts
    const mockApprovedPosts: ApprovedPost[] = [];
    for (let i = 0; i < 10; i++) {
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      mockApprovedPosts.push({
        id: `approved-${i}`,
        title: `Ready to Schedule: ${platform} Post ${i + 1}`,
        content: `This is an approved ${platform} post ready to be scheduled. It contains engaging content that has been reviewed and approved for publication.`,
        platform,
        insightId: `insight-${Math.floor(Math.random() * 5)}`,
        insightTitle: `Insight ${Math.floor(Math.random() * 5) + 1}`,
        projectId: `project-${Math.floor(Math.random() * 3)}`,
        projectTitle: `Project ${Math.floor(Math.random() * 3) + 1}`,
        approvedAt: addDays(today, -Math.floor(Math.random() * 7))
      });
    }
    
    this.eventsSubject.next(mockEvents);
    this.approvedPostsSubject.next(mockApprovedPosts);
  }

  getEvents(): Observable<CalendarEvent[]> {
    if (environment.useMockData) {
      return this.events$;
    }
    return this.apiService.get<CalendarEvent[]>('/scheduler/events');
  }

  getApprovedPosts(): Observable<ApprovedPost[]> {
    if (environment.useMockData) {
      return this.approvedPosts$;
    }
    return this.apiService.get<ApprovedPost[]>('/posts?status=approved&limit=100');
  }

  schedulePost(postId: string, scheduledTime: Date, platform: Platform): Observable<CalendarEvent> {
    if (environment.useMockData) {
      // Find the approved post
      const approvedPost = this.approvedPostsSubject.value.find(p => p.id === postId);
      if (!approvedPost) {
        throw new Error('Post not found');
      }
      
      // Create new event
      const newEvent: CalendarEvent = {
        id: `event-${Date.now()}`,
        postId: approvedPost.id,
        title: approvedPost.title,
        content: approvedPost.content,
        platform: approvedPost.platform,
        scheduledTime,
        status: 'scheduled',
        insightId: approvedPost.insightId,
        insightTitle: approvedPost.insightTitle,
        projectId: approvedPost.projectId,
        projectTitle: approvedPost.projectTitle
      };
      
      // Add to events
      const currentEvents = this.eventsSubject.value;
      this.eventsSubject.next([...currentEvents, newEvent]);
      
      // Remove from approved posts
      const updatedApprovedPosts = this.approvedPostsSubject.value.filter(p => p.id !== postId);
      this.approvedPostsSubject.next(updatedApprovedPosts);
      
      return of(newEvent).pipe(delay(300));
    }
    
    return this.apiService.post<CalendarEvent>('/scheduler/events', {
      postId,
      scheduledTime: scheduledTime.toISOString(),
      platform
    });
  }

  updateEventTime(eventId: string, newDateTime: Date): Observable<CalendarEvent> {
    if (environment.useMockData) {
      const currentEvents = this.eventsSubject.value;
      const eventIndex = currentEvents.findIndex(e => e.id === eventId);
      
      if (eventIndex === -1) {
        throw new Error('Event not found');
      }
      
      const updatedEvent = {
        ...currentEvents[eventIndex],
        scheduledTime: newDateTime
      };
      
      const updatedEvents = [...currentEvents];
      updatedEvents[eventIndex] = updatedEvent;
      this.eventsSubject.next(updatedEvents);
      
      return of(updatedEvent).pipe(delay(300));
    }
    
    return this.apiService.patch<CalendarEvent>(`/scheduler/events/${eventId}`, {
      scheduledTime: newDateTime.toISOString()
    });
  }

  deleteEvent(eventId: string): Observable<void> {
    if (environment.useMockData) {
      const currentEvents = this.eventsSubject.value;
      const event = currentEvents.find(e => e.id === eventId);
      
      if (event) {
        // Remove from events
        this.eventsSubject.next(currentEvents.filter(e => e.id !== eventId));
        
        // Add back to approved posts
        const approvedPost: ApprovedPost = {
          id: event.postId,
          title: event.title,
          content: event.content,
          platform: event.platform,
          insightId: event.insightId || '',
          insightTitle: event.insightTitle || '',
          projectId: event.projectId,
          projectTitle: event.projectTitle,
          approvedAt: new Date()
        };
        
        const currentApprovedPosts = this.approvedPostsSubject.value;
        this.approvedPostsSubject.next([...currentApprovedPosts, approvedPost]);
      }
      
      return of(void 0).pipe(delay(300));
    }
    
    return this.apiService.delete<void>(`/scheduler/events/${eventId}`);
  }

  setView(view: CalendarView): void {
    this.currentView.set(view);
  }

  setDate(date: Date): void {
    this.currentDate.set(date);
  }

  setFilters(filters: CalendarFilters): void {
    this.filters.set(filters);
  }

  navigateToDate(date: Date): void {
    this.currentDate.set(date);
  }

  navigatePrevious(): void {
    const current = this.currentDate();
    const view = this.currentView();
    
    switch (view) {
      case 'day':
        this.currentDate.set(addDays(current, -1));
        break;
      case 'week':
        this.currentDate.set(addDays(current, -7));
        break;
      case 'month':
        this.currentDate.set(addDays(current, -30));
        break;
    }
  }

  navigateNext(): void {
    const current = this.currentDate();
    const view = this.currentView();
    
    switch (view) {
      case 'day':
        this.currentDate.set(addDays(current, 1));
        break;
      case 'week':
        this.currentDate.set(addDays(current, 7));
        break;
      case 'month':
        this.currentDate.set(addDays(current, 30));
        break;
    }
  }

  navigateToday(): void {
    this.currentDate.set(new Date());
  }
}