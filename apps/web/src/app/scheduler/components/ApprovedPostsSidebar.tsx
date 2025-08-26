"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Platform } from "@/types";
import type { ApprovedPost } from "@/types/scheduler";
import {
	ChevronLeft,
	ChevronRight,
	FileText,
	Search,
} from "lucide-react";
import { useState, useRef } from "react";
import { useDrop } from "react-dnd";
import { useCalendar } from "./CalendarContext";
import { DraggablePostCard } from "./DraggablePostCard";
import type { DragItem } from "@/types/scheduler";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/lib/toast";

/**
 * ApprovedPostsSidebar - Shows approved posts available for scheduling
 */
export function ApprovedPostsSidebar() {
	const { state, actions, setModal } = useCalendar();
	const toast = useToast();
	const [isExpanded, setIsExpanded] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");

	// Ref for the drop target
	const dropRef = useRef<HTMLDivElement>(null);

	// Drop target for unscheduling posts
	const [{ isOver, canDrop }, drop] = useDrop({
		accept: "post", // Accept scheduled posts being dragged from calendar
		drop: async (item: DragItem) => {
			try {
				await actions.unschedulePost(item.id);
				toast.success("Post unscheduled successfully", {
					description: "Post has been returned to the approved posts list",
				});
			} catch (error) {
				console.error("Failed to unschedule post:", error);
				toast.apiError("unschedule post", error instanceof Error ? error.message : "Unknown error occurred");
			}
		},
		collect: (monitor) => ({
			isOver: monitor.isOver(),
			canDrop: monitor.canDrop(),
		}),
	});

	// Connect the drop connector to the ref
	drop(dropRef);

	// Filter approved posts based on search and platform
	const filteredPosts = state.approvedPosts.filter((post: ApprovedPost) => {
		const matchesSearch =
			searchQuery === "" ||
			post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			post.content.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesPlatform =
			platformFilter === "all" || post.platform === platformFilter;

		return matchesSearch && matchesPlatform;
	});

	// Handle post selection - directly open modal with post selected
	const handlePostSelect = (post: ApprovedPost) => {
		// Open modal with the post data directly
		setModal({
			isOpen: true,
			mode: "create",
			postId: post.id,
			postData: {
				id: post.id,
				title: post.title,
				content: post.content,
				platform: post.platform,
			},
			initialPlatform: post.platform,
			onSave: async (data: any) => {
				// Schedule the post
				const response = await apiClient.post("/api/scheduler/events", {
					postId: post.id,
					platform: data.platform,
					content: data.content,
					datetime: data.scheduledTime,
				});

				if (!response.success) {
					throw new Error(response.error || "Failed to schedule post");
				}

				await actions.refreshEvents();
				setModal({ isOpen: false, mode: "create" });
			},
			onClose: () => setModal({ isOpen: false, mode: "create" }),
		});
	};

	return (
		<div
			ref={dropRef}
			className={`
      bg-white border-r border-gray-200 flex flex-col transition-all duration-300 relative
      ${isExpanded ? "w-64" : "w-12"}
      ${isOver && canDrop ? "bg-red-50 border-red-200" : ""}
    `}
		>
			{/* Header */}
			<div className="p-4 border-b border-gray-200">
				<div className="flex items-center justify-between">
					{isExpanded && (
						<div className="flex items-center gap-2">
							<FileText className="w-5 h-5 text-blue-600" />
							<h2 className="font-semibold text-gray-900">Approved Posts</h2>
						</div>
					)}

					<Button
						variant="ghost"
						size="sm"
						onClick={() => setIsExpanded(!isExpanded)}
						className="h-8 w-8 p-0"
					>
						{isExpanded ? (
							<ChevronLeft className="h-4 w-4" />
						) : (
							<ChevronRight className="h-4 w-4" />
						)}
					</Button>
				</div>

				{/* Search and Filters */}
				{isExpanded && (
					<div className="mt-4 space-y-3">
						{/* Search */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								placeholder="Search posts..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9 h-8 text-sm"
							/>
						</div>

						{/* Platform Filter */}
						<Select
							value={platformFilter}
							onValueChange={(value) =>
								setPlatformFilter(value as Platform | "all")
							}
						>
							<SelectTrigger className="h-8 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="z-[9999]">
								<SelectItem value="all">All Platforms</SelectItem>
								<SelectItem value="linkedin">LinkedIn</SelectItem>
								<SelectItem value="x">X (Twitter)</SelectItem>
							</SelectContent>
						</Select>
					</div>
				)}
			</div>

			{/* Posts List */}
			{isExpanded && (
				<div className="flex-1 overflow-auto">
					{state.isLoading ? (
						<div className="p-4 text-center text-sm text-gray-500">
							Loading posts...
						</div>
					) : filteredPosts.length === 0 ? (
						<div className="p-4 text-center text-sm text-gray-500">
							{searchQuery || platformFilter !== "all"
								? "No posts match your filters"
								: "No approved posts available"}
						</div>
					) : (
						<div className="p-2 space-y-2">
							{filteredPosts.map((post) => (
								<DraggablePostCard
									key={post.id}
									post={post}
									onClick={handlePostSelect}
								/>
							))}
						</div>
					)}
				</div>
			)}

			{/* Footer */}
			{isExpanded && (
				<div className="p-4 border-t border-gray-200 bg-gray-50">
					<div className="text-xs text-gray-500 text-center">
						{filteredPosts.length} of {state.approvedPosts.length} posts
					</div>
				</div>
			)}

			{/* Drop indicator for unscheduling */}
			{isOver && canDrop && isExpanded && (
				<div className="absolute inset-0 bg-red-50 bg-opacity-95 border-2 border-red-300 border-dashed flex items-center justify-center z-50">
					<div className="text-center">
						<div className="text-red-600 text-lg font-medium mb-2">
							Drop to Unschedule
						</div>
						<div className="text-red-500 text-sm">
							Post will be removed from calendar
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
