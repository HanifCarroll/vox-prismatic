"use client";

import { Badge } from "@/components/ui/badge";
import type { ApprovedPost } from "@/types/scheduler";
import { Calendar } from "lucide-react";
import React from "react";
import { useDrag } from "react-dnd";
import { PlatformIcon } from "./PlatformIcon";

interface DraggablePostCardProps {
	post: ApprovedPost;
	onClick?: (post: ApprovedPost) => void;
}

/**
 * DraggablePostCard - Draggable post card component for approved posts
 * Can be dragged onto calendar time slots to schedule posts
 */
export function DraggablePostCard({ post, onClick }: DraggablePostCardProps) {
	// Drag configuration
	const [{ isDragging }, drag] = useDrag({
		type: "approved-post",
		item: () => ({
			type: "approved-post",
			id: post.id,
			title: post.title,
			content: post.content,
			platform: post.platform,
			insightId: post.insightId,
			insightTitle: post.insightTitle,
		}),
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	});

	// Truncate content for preview
	const truncateContent = (content: string, maxLength: number = 100) => {
		if (content.length <= maxLength) return content;
		return content.substring(0, maxLength) + "...";
	};

	// Handle click - fallback to modal if not dragging
	const handleClick = (e: React.MouseEvent) => {
		if (isDragging) return;
		onClick?.(post);
	};

	return (
		<div
			ref={drag}
			className={`
				bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 
				rounded-lg p-3 cursor-grab transition-all duration-200
				${isDragging ? "opacity-50 scale-95 rotate-2" : "opacity-100"}
			`}
			onClick={handleClick}
			style={{
				transform: isDragging ? "rotate(2deg)" : "none",
				zIndex: isDragging ? 1000 : "auto",
			}}
		>
			{/* Post Header */}
			<div className="flex items-center justify-between mb-2">
				<PlatformIcon platform={post.platform} size="sm" />
				<Badge variant="secondary" className="text-xs">
					{post.characterCount || 0} chars
				</Badge>
			</div>

			{/* Post Title */}
			<h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-1">
				{post.title}
			</h3>

			{/* Post Content Preview */}
			<p className="text-xs text-gray-600 line-clamp-3 mb-2">
				{truncateContent(post.content)}
			</p>

			{/* Post Metadata */}
			<div className="flex items-center justify-between text-xs text-gray-500">
				<span>
					{post.insightTitle &&
						`From: ${post.insightTitle.substring(0, 20)}...`}
				</span>
				<div className="flex items-center gap-1">
					<Calendar className="w-3 h-3" />
					<span>{isDragging ? "Dragging..." : "Schedule"}</span>
				</div>
			</div>

			{/* Drag hint overlay */}
			{isDragging && (
				<div className="absolute inset-0 bg-blue-50 bg-opacity-90 flex items-center justify-center rounded-lg">
					<div className="text-center">
						<div className="text-sm text-blue-700 font-medium">
							Drop on calendar to schedule
						</div>
					</div>
				</div>
			)}
		</div>
	);
}