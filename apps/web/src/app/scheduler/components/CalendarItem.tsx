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
import {
	AlertCircle,
	CheckCircle,
	Clock,
	Edit,
	Trash2,
	XCircle,
} from "lucide-react";
import React, { useState } from "react";
import { useDrag } from "react-dnd";
import { useCalendar } from "./CalendarContext";

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
export function CalendarItem({
	event,
	index,
	isCompact = false,
	showExpanded = false,
}: CalendarItemProps) {
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

	// Platform configuration
	const getPlatformConfig = (platform: Platform) => {
		switch (platform) {
			case "linkedin":
				return {
					color: "bg-blue-600",
					name: "LinkedIn",
					textColor: "text-blue-600",
				};
			case "x":
				return {
					color: "bg-gray-800",
					name: "X",
					textColor: "text-gray-800",
				};
			default:
				return {
					color: "bg-gray-500",
					name: platform,
					textColor: "text-gray-600",
				};
		}
	};

	// Status configuration
	const getStatusConfig = (status: string) => {
		switch (status) {
			case "pending":
				return {
					icon: Clock,
					color: "text-yellow-600 bg-yellow-50 border-yellow-200",
					label: "Pending",
				};
			case "published":
				return {
					icon: CheckCircle,
					color: "text-green-600 bg-green-50 border-green-200",
					label: "Published",
				};
			case "failed":
				return {
					icon: XCircle,
					color: "text-red-600 bg-red-50 border-red-200",
					label: "Failed",
				};
			case "cancelled":
				return {
					icon: AlertCircle,
					color: "text-gray-600 bg-gray-50 border-gray-200",
					label: "Cancelled",
				};
			default:
				return {
					icon: Clock,
					color: "text-gray-600 bg-gray-50 border-gray-200",
					label: status,
				};
		}
	};

	const platformConfig = getPlatformConfig(event.platform);
	const statusConfig = getStatusConfig(event.status);
	const StatusIcon = statusConfig.icon;

	// Handle edit action - open modal with the post pre-selected
	const handleEdit = (e: React.MouseEvent) => {
		e.stopPropagation();

		// Find the approved post that corresponds to this scheduled event
		const approvedPost = state.approvedPosts.find(
			(post) => post.id === event.postId,
		);

		// Always open the modal, even if post is not found in approvedPosts
		setModal({
			isOpen: true,
			mode: "edit",
			postId: event.postId, // Pass the postId to preselect the post
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

	// Truncate content for display based on view mode
	const getDisplayContent = () => {
		if (showExpanded) {
			// Show more content when expanded (up to 200 characters)
			return event.content.length > 200
				? `${event.content.substring(0, 200)}...`
				: event.content;
		}
		
		if (isCompact) {
			return event.content.length > 40
				? `${event.content.substring(0, 40)}...`
				: event.content;
		}
		
		// Regular content (100 characters)
		return event.content.length > 100
			? `${event.content.substring(0, 100)}...`
			: event.content;
	};

	const displayContent = getDisplayContent();

	return (
		<div
			ref={drag}
			className={`
        group relative bg-white rounded-md shadow-sm
        hover:shadow-md transition-all duration-200 cursor-move
        ${isDragging ? "opacity-50" : "opacity-100"}
        ${isCompact ? "text-xs" : showExpanded ? "text-sm" : "text-sm"}
        ${showActions ? "z-20" : "z-10"}
        ${showExpanded ? "min-h-24" : ""}
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
				className={`flex items-center justify-between ${isCompact ? "p-1" : "p-2"}`}
			>
				<div className="flex items-center gap-1">
					{/* Platform indicator */}
					<div className={`w-2 h-2 rounded-full ${platformConfig.color}`} />
					<span
						className={`font-medium ${platformConfig.textColor} ${isCompact ? "text-xs" : "text-sm"}`}
					>
						{platformConfig.name}
					</span>
				</div>
			</div>

			{/* Content */}
			<div className={`${isCompact ? "p-1" : "p-2"}`}>
				<div
					className={`text-gray-700 whitespace-pre-wrap ${
						showExpanded 
							? "line-clamp-6" 
							: isCompact 
								? "line-clamp-2" 
								: "line-clamp-3"
					}`}
				>
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
						<AlertDialogCancel onClick={(e) => {
							e.stopPropagation();
							setShowDeleteAlert(false);
						}}>
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
