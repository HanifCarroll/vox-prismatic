import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TabViewModule } from 'primeng/tabview';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DataViewModule } from 'primeng/dataview';

import { Post, Platform } from '../../../core/models/project.model';

export interface ScheduleSlot {
  id: string;
  postId: string;
  platform: Platform;
  scheduledTime: Date;
  timezone: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  publishedUrl?: string;
  error?: string;
  analytics?: {
    views?: number;
    likes?: number;
    shares?: number;
    comments?: number;
  };
}

export interface OptimalTime {
  platform: Platform;
  dayOfWeek: string;
  time: string;
  engagementScore: number;
  reason: string;
}

@Component({
  selector: 'app-scheduling-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CalendarModule,
    DropdownModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    InputTextareaModule,
    TabViewModule,
    ChipModule,
    TooltipModule,
    CardModule,
    TagModule,
    DataViewModule
  ],
  templateUrl: './scheduling-panel.component.html',
  styleUrl: './scheduling-panel.component.css'
})
export class SchedulingPanelComponent {
  @Input() set posts(value: Post[]) {
    this.postsSignal.set(value);
  }
  @Input() set scheduleSlots(value: ScheduleSlot[]) {
    this.scheduleSlotsSignal.set(value);
  }
  @Input() set optimalTimes(value: OptimalTime[]) {
    this.optimalTimesSignal.set(value);
  }
  @Output() schedulePost = new EventEmitter<{
    postId: string;
    platform: Platform;
    scheduledTime: Date;
  }>();
  @Output() cancelSchedule = new EventEmitter<string>();
  @Output() publishNow = new EventEmitter<string>();

  postsSignal = signal<Post[]>([]);
  scheduleSlotsSignal = signal<ScheduleSlot[]>([]);
  optimalTimesSignal = signal<OptimalTime[]>([]);
  selectedPost = signal<Post | null>(null);
  selectedPlatform = signal<Platform | null>(null);
  selectedDate = signal<Date>(new Date());
  selectedTime = signal<string>('09:00');
  useOptimalTime = signal(true);
  bulkSchedule = signal(false);
  selectedTimezone = signal('America/New_York');

  timezones = [
    { label: 'Eastern Time (ET)', value: 'America/New_York' },
    { label: 'Central Time (CT)', value: 'America/Chicago' },
    { label: 'Mountain Time (MT)', value: 'America/Denver' },
    { label: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
    { label: 'UTC', value: 'UTC' },
    { label: 'London', value: 'Europe/London' },
    { label: 'Paris', value: 'Europe/Paris' },
    { label: 'Tokyo', value: 'Asia/Tokyo' }
  ];

  availablePosts = computed(() => {
    const posts = this.postsSignal();
    const scheduled = this.scheduleSlotsSignal();
    return posts.filter(post => 
      post.isApproved && 
      !scheduled.some(s => s.postId === post.id && s.status === 'scheduled')
    );
  });

  scheduledPosts = computed(() => {
    const slots = this.scheduleSlotsSignal();
    const posts = this.postsSignal();
    return slots
      .filter(s => s.status === 'scheduled')
      .map(slot => ({
        ...slot,
        post: posts.find(p => p.id === slot.postId)
      }))
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  });

  publishedPosts = computed(() => {
    const slots = this.scheduleSlotsSignal();
    const posts = this.postsSignal();
    return slots
      .filter(s => s.status === 'published')
      .map(slot => ({
        ...slot,
        post: posts.find(p => p.id === slot.postId)
      }));
  });

  calendarEvents = computed(() => {
    return this.scheduleSlotsSignal()
      .filter(s => s.status === 'scheduled' || s.status === 'published')
      .map(slot => {
        const post = this.postsSignal().find(p => p.id === slot.postId);
        return {
          id: slot.id,
          title: post?.content.substring(0, 50) || 'Scheduled Post',
          start: new Date(slot.scheduledTime),
          platform: slot.platform,
          status: slot.status
        };
      });
  });

  selectPost(post: Post) {
    this.selectedPost.set(post);
    if (post.platforms && post.platforms.length === 1) {
      this.selectedPlatform.set(post.platforms[0]);
    }
  }

  selectPlatform(platform: Platform) {
    this.selectedPlatform.set(platform);
    
    // Auto-select optimal time if available
    if (this.useOptimalTime()) {
      const optimal = this.optimalTimesSignal().find(
        o => o.platform === platform
      );
      if (optimal) {
        this.applyOptimalTime(optimal);
      }
    }
  }

  applyOptimalTime(optimal: OptimalTime) {
    // Parse day of week and time to set selected date
    const daysMap: Record<string, number> = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    
    const today = new Date();
    const targetDay = daysMap[optimal.dayOfWeek];
    let daysUntilTarget = targetDay - today.getDay();
    if (daysUntilTarget < 0) daysUntilTarget += 7;
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    
    this.selectedDate.set(targetDate);
    this.selectedTime.set(optimal.time);
  }

  scheduleSelectedPost() {
    const post = this.selectedPost();
    const platform = this.selectedPlatform();
    const date = this.selectedDate();
    const time = this.selectedTime();
    
    if (!post || !platform || !date || !time) return;
    
    // Combine date and time
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledTime = new Date(date);
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    this.schedulePost.emit({
      postId: post.id,
      platform,
      scheduledTime
    });
    
    // Reset selection
    this.selectedPost.set(null);
    this.selectedPlatform.set(null);
  }

  scheduleBulkPosts() {
    const posts = this.availablePosts();
    const optimalTimes = this.optimalTimesSignal();
    
    posts.forEach((post, index) => {
      post.platforms?.forEach(platform => {
        const optimal = optimalTimes.find(o => o.platform === platform);
        if (optimal) {
          // Schedule posts with 1-hour intervals
          const scheduledTime = this.calculateBulkScheduleTime(optimal, index);
          this.schedulePost.emit({
            postId: post.id,
            platform,
            scheduledTime
          });
        }
      });
    });
  }

  private calculateBulkScheduleTime(optimal: OptimalTime, index: number): Date {
    const daysMap: Record<string, number> = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    
    const today = new Date();
    const targetDay = daysMap[optimal.dayOfWeek];
    let daysUntilTarget = targetDay - today.getDay();
    if (daysUntilTarget < 0) daysUntilTarget += 7;
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget + Math.floor(index / 3)); // Spread across days
    
    const [hours, minutes] = optimal.time.split(':').map(Number);
    targetDate.setHours(hours + (index % 3), minutes, 0, 0); // Spread across hours
    
    return targetDate;
  }

  cancelScheduleSlot(slotId: string) {
    this.cancelSchedule.emit(slotId);
  }

  publishPostNow(postId: string) {
    this.publishNow.emit(postId);
  }

  getPlatformIcon(platform: Platform): string {
    const iconMap: Record<Platform, string> = {
      [Platform.TWITTER]: 'pi-twitter',
      [Platform.LINKEDIN]: 'pi-linkedin',
      [Platform.FACEBOOK]: 'pi-facebook',
      [Platform.INSTAGRAM]: 'pi-instagram',
      [Platform.TIKTOK]: 'pi-video',
      [Platform.YOUTUBE]: 'pi-youtube',
      [Platform.MEDIUM]: 'pi-book',
      [Platform.REDDIT]: 'pi-reddit'
    };
    return `pi ${iconMap[platform] || 'pi-globe'}`;
  }

  formatScheduledTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  getStatusSeverity(status: string): string {
    const severityMap: Record<string, string> = {
      'draft': 'secondary',
      'scheduled': 'info',
      'published': 'success',
      'failed': 'danger'
    };
    return severityMap[status] || 'secondary';
  }
}