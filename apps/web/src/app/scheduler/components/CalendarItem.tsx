"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { DragItem } from "@/types/scheduler";
import type { CalendarEvent, Platform, ScheduledPostStatus } from "@/types";
import { format } from "date-fns";
import { Edit, Trash2, XCircle, Loader2 } from "lucide-react";
import React, { useState, useRef } from "react";
import { useDrag } from "react-dnd";
import { useSchedulerMutations, useSchedulerModalActions } from "../store/scheduler-store";
import { PlatformIcon } from "./PlatformIcon";
import { useToast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { useIsOptimistic, useOptimisticUpdate } from "@/hooks/useOptimisticUpdate";
import { cn } from "@/lib/utils";
import { EntityType } from "@content-creation/types";

interface CalendarItemProps {
	event: CalendarEvent;
	index: number;
	isCompact?: boolean;
	showExpanded?: boolean;
}

/**
 * CalendarItem component - represents a single scheduled post in the calendar
 * Draggable component with hover actions
 */
export function CalendarItem({ event, isCompact = false }: CalendarItemProps) {
	const { deleteEvent } = useSchedulerMutations();
	const { openScheduleModal } = useSchedulerModalActions();
	const toast = useToast();
	const [showActions, setShowActions] = useState(false);
	const [showDeleteAlert, setShowDeleteAlert] = useState(false);
	const { executeWithOptimism } = useOptimisticUpdate();
	const isPending = useIsOptimistic(EntityType.SCHEDULED_POST, event.id);

	// Determine if the event is editable based on status
	const isEditable = event.status === 'pending' || event.status === 'failed';
	const isQueued = event.status === 'queued' || event.status === 'publishing';
	const isPublished = event.status === 'published';

	// Ref for the drag target
	const dragRef = useRef<HTMLDivElement>(null);

	// Drag configuration - only enable for editable events
	const [{ isDragging }, drag] = useDrag({
		type: "post",
		item: (): DragItem => ({
			type: "post",
			id: event.id,
			postId: event.postId,
			scheduledTime: event.scheduledTime instanceof Date ? event.scheduledTime.toISOString() : event.scheduledTime,
			platform: event.platform as Platform,
			content: event.content,
			status: event.status as ScheduledPostStatus,
		}),
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
		canDrag: isEditable, // Only allow dragging for editable events
	});

	// Connect the drag connector to the ref only if editable
	if (isEditable) {
		drag(dragRef);
	}

	// Handle edit action - open PostModal with the post pre-selected
	const handleEdit = (e: React.MouseEvent) => {
		e.stopPropagation();

		// Check if we have a postId
		if (!event.postId) {
			console.error("No postId found for calendar event:", event);
			return;
		}

		// Open the PostModal for editing
		openScheduleModal({
			postId: event.postId,
			eventId: event.id,
			dateTime: new Date(event.scheduledTime),
			platform: event.platform as Platform,
			mode: "edit"
		});
	};

	// Handle delete action - show AlertDialog instead of browser confirm
	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowDeleteAlert(true);
	};

	// Confirm delete action with optimistic update
	const confirmDelete = async () => {
		setShowDeleteAlert(false);
		
		await executeWithOptimism({
			entityType: EntityType.SCHEDULED_POST,
			entityId: event.id,
			action: 'delete',
			optimisticData: { ...event, _deleted: true }, // Mark as deleted
			originalData: event,
			serverAction: async () => {
				try {
					await deleteEvent(event.id);
					return { success: true };
				} catch (error) {
					return { 
						success: false, 
						error: error instanceof Error ? error : new Error('Failed to delete event')
					};
				}
			},
			successMessage: "Scheduled post deleted",
			errorMessage: "Failed to delete scheduled post",
		});
	};

	// Truncate content for 2-line display
	const displayContent =
		event.content.length > 80
			? `${event.content.substring(0, 80)}...`
			: event.content;

	return (
		<div
			ref={dragRef}
			className={cn(
				"group relative rounded-md shadow-sm mx-1",
				isCompact ? "text-xs" : "text-sm",
				showActions ? "z-20" : "z-10",
				// Visual styling based on status
				isPublished ? "bg-green-50 border border-green-200" :
				isQueued ? "bg-yellow-50 border border-yellow-200" :
				event.status === 'failed' ? "bg-red-50 border border-red-200" :
				"bg-white",
				// Only show hover effects and cursor for editable events
				isEditable ? "hover:shadow-md transition-all duration-200 cursor-move" : "cursor-default opacity-75",
				isDragging && "opacity-50",
				isPending && "opacity-70 animate-pulse"
			)}
			onMouseEnter={() => setShowActions(true)}
			onMouseLeave={() => setShowActions(false)}
			style={{
				transform: isDragging ? "rotate(2deg)" : isPending ? "scale(0.98)" : "none",
				zIndex: isDragging ? 1000 : "auto",
			}}
		>
			{/* Pending indicator overlay */}
			{isPending && (
				<div className="absolute inset-0 bg-blue-500 bg-opacity-5 rounded-md pointer-events-none flex items-center justify-center">
					<Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
				</div>
			)}
			
			{/* Header */}
			<div
				className={`flex items-center justify-between ${isCompact ? "px-1 pt-1 pb-0" : "px-2 pt-2 pb-0"}`}
			>
				<div className="flex items-center gap-1">
					{/* Platform indicator */}
					<PlatformIcon
						platform={event.platform as Platform}
						size={isCompact ? "sm" : "md"}
						showLabel={false}
					/>
					{/* Status indicator */}
					{isPublished && (
						<span className="text-[10px] text-green-600 font-medium">Published</span>
					)}
					{isQueued && (
						<span className="text-[10px] text-yellow-600 font-medium">Queued</span>
					)}
					{event.status === 'failed' && (
						<span className="text-[10px] text-red-600 font-medium">Failed</span>
					)}
					{isPending && (
						<span className="text-[10px] text-blue-500 font-medium">Updating...</span>
					)}
				</div>
			</div>

			{/* Content */}
			<div className={`${isCompact ? "px-1 pb-1 pt-1" : "px-2 pb-2 pt-1"}`}>
				<div className="text-gray-700 whitespace-pre-wrap line-clamp-2">
					{displayContent}
				</div>

				{/* Time */}
				<div
					className={`text-gray-500 mt-1 ${isCompact ? "text-xs" : "text-xs"}`}
				>
					{format(new Date(event.scheduledTime), "h:mm a")}
				</div>
			</div>

			{/* Action buttons (shown on hover, only for editable events) */}
			{showActions && !isCompact && isEditable && (
				<div className="absolute top-1 right-1 flex items-center gap-1 bg-white rounded shadow-lg border border-gray-200 p-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600"
						onClick={handleEdit}
						title="Edit"
					>
						<Edit className="h-3 w-3" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
						onClick={handleDelete}
						title="Delete"
					>
						<Trash2 className="h-3 w-3" />
					</Button>
				</div>
			)}

			{/* Compact actions menu (only for editable events) */}
			{showActions && isCompact && isEditable && (
				<div className="absolute top-0 right-0 -mr-8 bg-white rounded shadow-lg border border-gray-200 flex flex-col">
					<Button
						variant="ghost"
						size="sm"
						className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600 rounded-none"
						onClick={handleEdit}
						title="Edit"
					>
						<Edit className="h-3 w-3" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600 rounded-none"
						onClick={handleDelete}
						title="Delete"
					>
						<Trash2 className="h-3 w-3" />
					</Button>
				</div>
			)}

			{/* Error state overlay */}
			{event.status === "failed" && event.error && (
				<div className="absolute inset-0 bg-red-50 bg-opacity-90 flex items-center justify-center rounded-md">
					<div className="text-center">
						<XCircle className="w-4 h-4 text-red-600 mx-auto mb-1" />
						<div className="text-xs text-red-700 font-medium">Failed</div>
						{!isCompact && (
							<div
								className="text-xs text-red-600 mt-1 px-1"
								title={event.error}
							>
								{event.error && event.error.length > 20
									? `${event.error.substring(0, 20)}...`
									: event.error}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
				<AlertDialogContent onClick={(e) => e.stopPropagation()}>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Scheduled Post</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this scheduled post? This will
							unschedule the post but won't delete the original post content.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={(e) => {
								e.stopPropagation();
								setShowDeleteAlert(false);
							}}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.stopPropagation();
								confirmDelete();
							}}
							className="bg-red-600 hover:bg-red-700"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
