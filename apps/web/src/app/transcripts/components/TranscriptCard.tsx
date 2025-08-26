"use client";

import { useState } from "react";
import type { TranscriptView } from "@/types/database";
import ActionMenu, { type MenuAction } from "./ActionMenu";
import { FileText, Zap, Sparkles, Target, Smartphone, XCircle, Mic, Folder, PencilLine, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const statusConfig = {
	raw: { label: "Raw", color: "bg-gray-100 text-gray-800", icon: FileText },
	processing: {
		label: "Processing",
		color: "bg-purple-100 text-purple-800",
		icon: Zap,
	},
	cleaned: { label: "Cleaned", color: "bg-blue-100 text-blue-800", icon: Sparkles },
	insights_generated: {
		label: "Ready",
		color: "bg-green-100 text-green-800",
		icon: Target,
	},
	posts_created: {
		label: "Posted",
		color: "bg-emerald-100 text-emerald-800",
		icon: Smartphone,
	},
	error: { label: "Error", color: "bg-red-100 text-red-800", icon: XCircle },
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
				return <Mic className="h-4 w-4" />;
			case "upload":
				return <Folder className="h-4 w-4" />;
			case "manual":
				return <PencilLine className="h-4 w-4" />;
			default:
				return <FileText className="h-4 w-4" />;
		}
	};

	const formatDate = (date: Date) => {
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "numeric",
			day: "numeric",
		});
	};

	const getStatusVariant = (status: typeof statusConfig[keyof typeof statusConfig]) => {
		switch (transcript.status) {
			case "processing":
				return "default" as const;
			case "cleaned":
			case "insights_generated":
			case "posts_created":
				return "default" as const;
			case "error":
				return "destructive" as const;
			default:
				return "secondary" as const;
		}
	};

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardContent className="p-6">
				<div className="flex items-start justify-between">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-3">
							{getSourceIcon()}
							<h3 className="text-lg font-medium text-gray-900 truncate flex-1">
								{transcript.title}
							</h3>
						</div>

						<div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
							<span>{transcript.wordCount.toLocaleString()} words</span>
							{formatDuration(transcript.duration) && (
								<span>{formatDuration(transcript.duration)}</span>
							)}
							<span>{formatDate(transcript.createdAt)}</span>
						</div>

						<div className="flex items-center mb-3">
							<Badge variant={getStatusVariant(status)} className="gap-1">
								<status.icon className="h-3 w-3" />
								{status.label}
							</Badge>
						</div>

						{transcript.metadata?.description && (
							<p className="text-muted-foreground text-sm mb-3 line-clamp-2">
								{transcript.metadata.description}
							</p>
						)}

						{transcript.metadata?.tags && (
							<div className="flex flex-wrap gap-1 mb-3">
								{transcript.metadata.tags.slice(0, 3).map((tag) => (
									<Badge key={tag} variant="secondary" className="text-xs">
										{tag}
									</Badge>
								))}
								{transcript.metadata.tags.length > 3 && (
									<span className="text-xs text-muted-foreground">
										+{transcript.metadata.tags.length - 3} more
									</span>
								)}
							</div>
						)}
					</div>

					<div className="flex items-center gap-2 ml-4">
						{/* Action Menu */}
						<div className="relative">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowActionMenu(!showActionMenu)}
								title="Actions"
							>
								<MoreVertical className="h-4 w-4" />
							</Button>

							<ActionMenu
								isOpen={showActionMenu}
								onClose={() => setShowActionMenu(false)}
								actions={getMenuActions()}
							/>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}