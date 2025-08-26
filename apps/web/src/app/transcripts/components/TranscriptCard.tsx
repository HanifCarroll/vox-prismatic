"use client";

import { useState } from "react";
import type { TranscriptView } from "@/types/database";
import { ContentCard, type UnifiedStatus } from '@/components/ContentCard';
import { getNextAction, STATUS_ICONS } from '@/constants/statuses';
import { 
  FileText, 
  Mic, 
  Folder, 
  PencilLine,
  Eye,
  Edit3,
  Trash2,
  Sparkles,
  Target,
  ChevronRight
} from 'lucide-react';

interface TranscriptCardProps {
	transcript: TranscriptView;
	onAction: (action: string, transcript: TranscriptView) => void;
	isSelected?: boolean;
	onSelect?: (id: string, selected: boolean) => void;
}

export default function TranscriptCard({
	transcript,
	onAction,
	isSelected = false,
	onSelect
}: TranscriptCardProps) {
	const [showActionMenu, setShowActionMenu] = useState(false);
	
	// Get source icon
	const getSourceIcon = () => {
		switch (transcript.sourceType) {
			case "recording": return Mic;
			case "upload": return Folder;
			case "manual": return PencilLine;
			default: return FileText;
		}
	};

	// Format duration
	const formatDuration = (seconds?: number) => {
		if (!seconds) return null;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		if (minutes > 0) {
			return `${minutes}m ${remainingSeconds}s`;
		}
		return `${remainingSeconds}s`;
	};

	// Get next workflow action
	const nextAction = getNextAction(transcript.status);
	
	// Determine primary action based on status
	const getPrimaryAction = () => {
		switch (transcript.status) {
			case "raw":
				return {
					label: "Clean Transcript",
					onClick: () => onAction("clean", transcript),
					icon: Sparkles,
					variant: "default" as const,
					className: "bg-blue-600 hover:bg-blue-700"
				};
			case "cleaned":
				return {
					label: "Extract Insights",
					onClick: () => onAction("process", transcript),
					icon: Target,
					variant: "default" as const,
					className: "bg-green-600 hover:bg-green-700"
				};
			case "insights_generated":
				return {
					label: "Generate Posts",
					onClick: () => onAction("generate_posts", transcript),
					icon: Edit3,
					variant: "default" as const,
					className: "bg-purple-600 hover:bg-purple-700"
				};
			case "processing":
				return {
					label: "Processing...",
					onClick: () => {},
					loading: true,
					variant: "secondary" as const
				};
			default:
				return undefined;
		}
	};

	// Build menu actions
	const menuActions = [
		{
			label: "View",
			onClick: () => {
				onAction("view", transcript);
				setShowActionMenu(false);
			},
			icon: Eye
		},
		{
			label: "Edit",
			onClick: () => {
				onAction("edit", transcript);
				setShowActionMenu(false);
			},
			icon: Edit3
		},
		{
			label: "Delete",
			onClick: () => {
				onAction("delete", transcript);
				setShowActionMenu(false);
			},
			icon: Trash2,
			danger: true
		}
	];

	// Count related content
	const insightCount = transcript.insightCount || 0;
	const postCount = transcript.postCount || 0;

	return (
		<ContentCard isSelected={isSelected}>
			<ContentCard.Header>
				<ContentCard.Title
					title={transcript.title}
					icon={getSourceIcon()}
					isSelected={isSelected}
					onSelect={onSelect ? (selected) => onSelect(transcript.id, selected) : undefined}
				/>
				
				<ContentCard.Meta>
					<span>{transcript.wordCount.toLocaleString()} words</span>
					{formatDuration(transcript.duration) && (
						<span>{formatDuration(transcript.duration)}</span>
					)}
					<ContentCard.DateDisplay date={transcript.createdAt} />
				</ContentCard.Meta>
				
				<ContentCard.Badges
					status={transcript.status as UnifiedStatus}
					badges={[
						{
							label: transcript.sourceType,
							variant: "secondary",
							icon: getSourceIcon()
						}
					]}
				/>
			</ContentCard.Header>
			
			{/* Show related content links if available */}
			{(insightCount > 0 || postCount > 0) && (
				<ContentCard.Body>
					<div className="flex flex-wrap gap-3">
						{insightCount > 0 && (
							<ContentCard.Link
								href={`/insights?transcriptId=${transcript.id}`}
								label="View insights"
								count={insightCount}
								icon={Sparkles}
							/>
						)}
						{postCount > 0 && (
							<ContentCard.Link
								href={`/posts?transcriptId=${transcript.id}`}
								label="View posts"
								count={postCount}
								icon={Edit3}
							/>
						)}
					</div>
				</ContentCard.Body>
			)}
			
			<ContentCard.Actions
				primaryAction={getPrimaryAction()}
				menuActions={menuActions}
				showMenu={showActionMenu}
				onToggleMenu={() => setShowActionMenu(!showActionMenu)}
			/>
		</ContentCard>
	);
}