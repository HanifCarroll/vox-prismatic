/**
 * Type definitions for the post scheduling calendar
 * Based on database schema and calendar requirements
 */

import type { Platform, PostStatus, CalendarEvent, ScheduledPostStatus } from "@/types";

// Calendar view types
export type CalendarView = "day" | "week" | "month";

// Calendar event interface is now imported from shared types

// ScheduledPostStatus is exported from shared types

// Draggable item interface for react-dnd - scheduled posts
export interface DragItem {
	type: "post";
	id: string;
	postId?: string | null;
	scheduledTime: string;
	platform: Platform;
	content: string;
	status: ScheduledPostStatus;
}

// Draggable item interface for approved posts
export interface ApprovedPostDragItem {
	type: "approved-post";
	id: string;
	title: string;
	content: string;
	platform: Platform;
	insightId: string;
	insightTitle?: string;
}

// Union type for all draggable items
export type AnyDragItem = DragItem | ApprovedPostDragItem;

// Calendar state interface
export interface CalendarState {
	view: CalendarView;
	currentDate: Date;
	today: Date;
	events: CalendarEvent[];
	approvedPosts: ApprovedPost[];
	selectedPlatforms: Platform[];
	isLoading: boolean;
	error?: string;
}

// Calendar filters
export interface CalendarFilters {
	platforms?: Platform[];
	status?: ScheduledPostStatus | "all";
	search?: string;
}

// Time slot interface for calendar grid
export interface TimeSlot {
	date: Date;
	hour: number;
	isDisabled: boolean; // true if in the past
	events: CalendarEvent[];
}

// Date range for calendar views
export interface DateRange {
	start: Date;
	end: Date;
}

// Calendar navigation actions
export interface CalendarActions {
	setView: (view: CalendarView) => void;
	navigateToDate: (date: Date) => void;
	navigatePrevious: () => void;
	navigateNext: () => void;
	navigateToday: () => void;
	refreshEvents: () => Promise<void>;
	updateEventDateTime: (eventId: string, newDateTime: Date) => Promise<void>;
	deleteEvent: (eventId: string) => Promise<void>;
	createEvent: (timeSlot: Date, platform?: Platform) => void;
	scheduleApprovedPost: (postId: string, scheduledTime: Date, platform: Platform) => Promise<void>;
	unschedulePost: (eventId: string) => Promise<void>;
}

// Modal state for post creation/editing
export interface PostModalState {
	isOpen: boolean;
	mode: "create" | "edit";
	postId?: string;
	postData?: {
		id: string;
		title: string;
		content: string;
		platform: Platform;
	};
	initialDateTime?: Date;
	initialPlatform?: Platform;
	onSave?: (data: PostModalData) => Promise<void>;
	onClose?: () => void;
}

// Post modal form data
export interface PostModalData {
	postId: string;
	title: string;
	content: string;
	platform: Platform;
	scheduledTime: string;
	metadata?: Record<string, any>;
}

// CalendarContextValue interface removed - replaced with Zustand store

// Approved post interface (for posts available to schedule)
export interface ApprovedPost {
	id: string;
	insightId: string;
	title: string;
	content: string;
	platform: Platform;
	status: PostStatus;
	characterCount?: number;
	createdAt: Date;
	updatedAt: Date;
	// Related data
	insightTitle?: string;
	transcriptTitle?: string;
}

// Schedule request interface for API
export interface ScheduleRequest {
	postId?: string; // Optional if creating from scratch
	platform: Platform;
	content: string;
	datetime: string; // ISO string
	metadata?: Record<string, any>;
}

// Schedule response interface for API
export interface ScheduleResponse {
	success: boolean;
	data?: {
		scheduledPostId: string;
		scheduledTime: string;
		platform: Platform;
		status: ScheduledPostStatus;
	};
	error?: string;
}

// Calendar API response for events
export interface CalendarEventsResponse {
	success: boolean;
	data?: CalendarEvent[];
	error?: string;
}

// Reschedule request for drag-drop operations
export interface RescheduleRequest {
	eventId: string;
	newDateTime: string; // ISO string
}

// Reschedule response
export interface RescheduleResponse {
	success: boolean;
	data?: CalendarEvent;
	error?: string;
}
