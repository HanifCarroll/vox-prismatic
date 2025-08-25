"use client";

import { useState } from "react";
import type { TranscriptView } from "@content-creation/database";
import ActionMenu, { type MenuAction } from "./ActionMenu";

const statusConfig = {
	raw: { label: "Raw", color: "bg-gray-100 text-gray-800", icon: "📄" },
	processing: {
		label: "Processing",
		color: "bg-purple-100 text-purple-800",
		icon: "⚡",
	},
	cleaned: { label: "Cleaned", color: "bg-blue-100 text-blue-800", icon: "✨" },
	insights_generated: {
		label: "Ready",
		color: "bg-green-100 text-green-800",
		icon: "🎯",
	},
	posts_created: {
		label: "Posted",
		color: "bg-emerald-100 text-emerald-800",
		icon: "📱",
	},
	error: { label: "Error", color: "bg-red-100 text-red-800", icon: "❌" },
};

interface TranscriptCardProps {
	transcript: TranscriptView;
	onAction: (action: string, transcript: TranscriptView) => void;
}

export default function TranscriptCard({
	transcript,
	onAction,
}: TranscriptCardProps) {
	const status = statusConfig[transcript.status];
	const [showActionMenu, setShowActionMenu] = useState(false);

	const getMenuActions = (): MenuAction[] => {
		const baseActions: MenuAction[] = [
			{
				id: "view",
				label: "View",
				onClick: () => onAction("view", transcript),
			},
			{
				id: "edit",
				label: "Edit",
				onClick: () => onAction("edit", transcript),
			},
		];

		const statusActions: MenuAction[] = [];
		switch (transcript.status) {
			case "raw":
				statusActions.push({
					id: "clean",
					label: "Clean Transcript",
					onClick: () => onAction("clean", transcript),
					primary: true,
				});
				break;
			case "cleaned":
				statusActions.push({
					id: "process",
					label: "Extract Insights",
					onClick: () => onAction("process", transcript),
					primary: true,
				});
				break;
			case "insights_generated":
				statusActions.push({
					id: "generate_posts",
					label: "Generate Posts",
					onClick: () => onAction("generate_posts", transcript),
					primary: true,
				});
				break;
			case "processing":
				statusActions.push({
					id: "processing",
					label: "Processing...",
					disabled: true,
				});
				break;
		}

		const deleteAction: MenuAction = {
			id: "delete",
			label: "Delete",
			onClick: () => onAction("delete", transcript),
			danger: true,
		};

		return [...baseActions, ...statusActions, deleteAction];
	};

	const formatDuration = (seconds?: number) => {
		if (!seconds) return null;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		if (minutes > 0) {
			return `${minutes}m ${remainingSeconds}s`;
		}
		return `${remainingSeconds}s`;
	};

	const getSourceIcon = () => {
		switch (transcript.sourceType) {
			case "recording":
				return "🎙️";
			case "upload":
				return "📁";
			case "manual":
				return "✏️";
			default:
				return "📄";
		}
	};

	const formatDate = (date: Date) => {
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "numeric",
			day: "numeric",
		});
	};

	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
			<div className="p-6">
				<div className="flex items-start justify-between">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-3">
							<span className="text-lg">{getSourceIcon()}</span>
							<h3 className="text-lg font-medium text-gray-900 truncate flex-1">
								{transcript.title}
							</h3>
						</div>

						<div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
							<span>{transcript.wordCount.toLocaleString()} words</span>
							{formatDuration(transcript.duration) && (
								<span>{formatDuration(transcript.duration)}</span>
							)}
							<span>{formatDate(transcript.createdAt)}</span>
						</div>

						<div className="flex items-center mb-3">
							<span
								className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
							>
								<span className="mr-1">{status.icon}</span>
								{status.label}
							</span>
						</div>

						{transcript.metadata?.description && (
							<p className="text-gray-600 text-sm mb-3 line-clamp-2">
								{transcript.metadata.description}
							</p>
						)}

						{transcript.metadata?.tags && (
							<div className="flex flex-wrap gap-1 mb-3">
								{transcript.metadata.tags.slice(0, 3).map((tag) => (
									<span
										key={tag}
										className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs"
									>
										{tag}
									</span>
								))}
								{transcript.metadata.tags.length > 3 && (
									<span className="text-xs text-gray-500">
										+{transcript.metadata.tags.length - 3} more
									</span>
								)}
							</div>
						)}
					</div>

					<div className="flex items-center gap-2 ml-4">
						{/* Action Menu */}
						<div className="relative">
							<button
								onClick={() => setShowActionMenu(!showActionMenu)}
								className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
								title="Actions"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
									/>
								</svg>
							</button>

							<ActionMenu
								isOpen={showActionMenu}
								onClose={() => setShowActionMenu(false)}
								actions={getMenuActions()}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}