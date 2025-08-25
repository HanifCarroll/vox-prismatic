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
import type { Platform } from "@/types";
import type { CalendarEvent, DragItem } from "@/types/scheduler";
import dayjs from "dayjs";
import { Edit, Trash2, XCircle } from "lucide-react";
import React, { useState } from "react";
import { useDrag } from "react-dnd";
import { useCalendar } from "./CalendarContext";
import { PlatformIcon } from "./PlatformIcon";

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
	const { actions, setModal, state } = useCalendar();
	const [showActions, setShowActions] = useState(false);
	const [showDeleteAlert, setShowDeleteAlert] = useState(false);

	// Drag configuration
	const [{ isDragging }, drag] = useDrag({
		type: "post",
		item: (): DragItem => ({
			type: "post",
			id: event.id,
			postId: event.postId,
			scheduledTime: event.scheduledTime,
			platform: event.platform,
			content: event.content,
			status: event.status,
		}),
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	});

	// No longer needed - using PlatformIcon component

	// Handle edit action - open PostModal with the post pre-selected
	const handleEdit = (e: React.MouseEvent) => {
		e.stopPropagation();
		console.log({ event });

		// Check if we have a postId
		if (!event.postId) {
			console.error("No postId found for calendar event:", event);
			return;
		}

		// Open the PostModal with the post data directly
		setModal({
			isOpen: true,
			mode: "edit",
			postId: event.postId,
			postData: {
				id: event.postId,
				title: event.title,
				content: event.content,
				platform: event.platform,
			},
			initialDateTime: new Date(event.scheduledTime),
			initialPlatform: event.platform,
			onSave: async (data) => {
				// Update the scheduled event
				const response = await fetch(`/api/scheduler/events/${event.id}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						scheduledTime: data.scheduledTime,
						platform: data.platform,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || "Failed to update event");
				}

				await actions.refreshEvents();
				setModal({ isOpen: false, mode: "create" });
			},
			onClose: () => setModal({ isOpen: false, mode: "create" }),
		});
	};

	// Handle delete action - show AlertDialog instead of browser confirm
	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowDeleteAlert(true);
	};

	// Confirm delete action
	const confirmDelete = async () => {
		try {
			await actions.deleteEvent(event.id);
			setShowDeleteAlert(false);
		} catch (error) {
			console.error("Failed to delete event:", error);
			// TODO: Show error notification
			setShowDeleteAlert(false);
		}
	};

	// Truncate content for 2-line display
	const displayContent =
		event.content.length > 80
			? `${event.content.substring(0, 80)}...`
			: event.content;

	return (
		<div
			ref={drag}
			className={`
        group relative bg-white rounded-md shadow-sm
        hover:shadow-md transition-all duration-200 cursor-move
        mx-1
        ${isDragging ? "opacity-50" : "opacity-100"}
        ${isCompact ? "text-xs" : "text-sm"}
        ${showActions ? "z-20" : "z-10"}
      `}
			onMouseEnter={() => setShowActions(true)}
			onMouseLeave={() => setShowActions(false)}
			style={{
				transform: isDragging ? "rotate(2deg)" : "none",
				zIndex: isDragging ? 1000 : "auto",
			}}
		>
			{/* Header */}
			<div
				className={`flex items-center justify-between ${isCompact ? "px-1 pt-1 pb-0" : "px-2 pt-2 pb-0"}`}
			>
				<div className="flex items-center gap-1">
					{/* Platform indicator */}
					<PlatformIcon 
						platform={event.platform} 
						size={isCompact ? "sm" : "md"} 
						showLabel={false} 
					/>
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
					{dayjs(event.scheduledTime).format("h:mm A")}
				</div>
			</div>

			{/* Action buttons (shown on hover) */}
			{showActions && !isCompact && (
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

			{/* Compact actions menu */}
			{showActions && isCompact && (
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
			{event.status === "failed" && event.errorMessage && (
				<div className="absolute inset-0 bg-red-50 bg-opacity-90 flex items-center justify-center rounded-md">
					<div className="text-center">
						<XCircle className="w-4 h-4 text-red-600 mx-auto mb-1" />
						<div className="text-xs text-red-700 font-medium">Failed</div>
						{!isCompact && (
							<div
								className="text-xs text-red-600 mt-1 px-1"
								title={event.errorMessage}
							>
								{event.errorMessage.length > 20
									? `${event.errorMessage.substring(0, 20)}...`
									: event.errorMessage}
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
