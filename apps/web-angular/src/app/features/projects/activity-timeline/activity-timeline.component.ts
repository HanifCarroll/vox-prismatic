import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineModule } from 'primeng/timeline';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  type: 'stage_change' | 'insight_added' | 'post_created' | 'review_completed' | 
        'scheduled' | 'published' | 'comment' | 'edit' | 'error' | 'milestone';
  title: string;
  description?: string;
  actor?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: {
    previousStage?: string;
    newStage?: string;
    insightCount?: number;
    postCount?: number;
    platform?: string;
    error?: string;
    duration?: number;
  };
  severity?: 'success' | 'info' | 'warning' | 'danger';
}

@Component({
  selector: 'app-activity-timeline',
  standalone: true,
  imports: [
    CommonModule,
    TimelineModule,
    CardModule,
    TagModule,
    AvatarModule,
    ButtonModule,
    TooltipModule
  ],
  templateUrl: './activity-timeline.component.html',
  styleUrl: './activity-timeline.component.css'
})
export class ActivityTimelineComponent {
  @Input() set events(value: ActivityEvent[]) {
    this.eventsSignal.set(value);
  }

  eventsSignal = signal<ActivityEvent[]>([]);
  showAll = signal(false);
  filterType = signal<string | null>(null);

  visibleEvents = computed(() => {
    let events = this.eventsSignal();
    
    // Apply filter
    if (this.filterType()) {
      events = events.filter(e => e.type === this.filterType());
    }
    
    // Apply limit if not showing all
    if (!this.showAll() && events.length > 5) {
      events = events.slice(0, 5);
    }
    
    return events;
  });

  remainingCount = computed(() => {
    const total = this.eventsSignal().length;
    const visible = this.visibleEvents().length;
    return Math.max(0, total - visible);
  });

  eventTypes = [
    { label: 'All', value: null },
    { label: 'Stage Changes', value: 'stage_change' },
    { label: 'Insights', value: 'insight_added' },
    { label: 'Posts', value: 'post_created' },
    { label: 'Reviews', value: 'review_completed' },
    { label: 'Publishing', value: 'published' }
  ];

  toggleShowAll() {
    this.showAll.update(show => !show);
  }

  setFilter(type: string | null) {
    this.filterType.set(type);
  }

  getEventIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'stage_change': 'pi-forward',
      'insight_added': 'pi-lightbulb',
      'post_created': 'pi-pencil',
      'review_completed': 'pi-check-circle',
      'scheduled': 'pi-calendar',
      'published': 'pi-send',
      'comment': 'pi-comment',
      'edit': 'pi-file-edit',
      'error': 'pi-exclamation-triangle',
      'milestone': 'pi-star'
    };
    return `pi ${iconMap[type] || 'pi-circle'}`;
  }

  getEventSeverity(event: ActivityEvent): string {
    if (event.severity) return event.severity;
    
    const severityMap: Record<string, string> = {
      'stage_change': 'info',
      'insight_added': 'success',
      'post_created': 'success',
      'review_completed': 'success',
      'scheduled': 'info',
      'published': 'success',
      'comment': 'info',
      'edit': 'warning',
      'error': 'danger',
      'milestone': 'success'
    };
    return severityMap[event.type] || 'info';
  }

  formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: now.getFullYear() !== new Date(date).getFullYear() ? 'numeric' : undefined
      });
    } else if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  getFullTimestamp(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}