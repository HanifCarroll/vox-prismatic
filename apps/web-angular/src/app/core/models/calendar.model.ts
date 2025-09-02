import { Platform } from './project.model';

export interface CalendarEvent {
  id: string;
  postId: string;
  title: string;
  content: string;
  platform: Platform;
  scheduledTime: Date;
  status: 'scheduled' | 'publishing' | 'published' | 'failed';
  insightId?: string;
  insightTitle?: string;
  projectId: string;
  projectTitle: string;
}

export interface ApprovedPost {
  id: string;
  title: string;
  content: string;
  platform: Platform;
  insightId: string;
  insightTitle: string;
  projectId: string;
  projectTitle: string;
  approvedAt: Date;
}

export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarFilters {
  platforms?: Platform[];
  status?: string;
}

export interface DragItem {
  type: 'post' | 'approved-post';
  id: string;
  title: string;
  content: string;
  platform: Platform;
  insightId?: string;
  insightTitle?: string;
  projectId?: string;
}

export interface TimeSlot {
  date: Date;
  hour: number;
  events: CalendarEvent[];
  isPast: boolean;
  isToday: boolean;
}

export interface DayInfo {
  date: Date;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
  isCurrentMonth: boolean;
}