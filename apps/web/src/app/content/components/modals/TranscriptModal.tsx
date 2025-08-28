"use client";

import { useEffect, useState } from "react";
import type { TranscriptView } from "@/types/database";
import { DateTimeDisplay } from '@/components/date';
import { Mic, Folder, PencilLine, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TranscriptModalProps {
	transcript: TranscriptView | null;
	isOpen: boolean;
	onClose: () => void;
	onSave: (transcript: TranscriptView) => void;
	initialMode?: "view" | "edit";
}

export default function TranscriptModal({
	transcript,
	isOpen,
	onClose,
	onSave,
	initialMode = "view",
}: TranscriptModalProps) {
	const [mode, setMode] = useState<"view" | "edit">(initialMode);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	useEffect(() => {
		setMode(initialMode);
	}, [initialMode]);

	useEffect(() => {
		if (transcript) {
			setTitle(transcript.title);
			// Use cleanedContent if available, otherwise rawContent
			setContent(transcript.cleanedContent || transcript.rawContent);
			setHasUnsavedChanges(false);
		}
	}, [transcript]);

	useEffect(() => {
		if (transcript && mode === "edit") {
			const hasChanges =
				title !== transcript.title ||
				content !== (transcript.cleanedContent || transcript.rawContent);
			setHasUnsavedChanges(hasChanges);
		}
	}, [title, content, transcript, mode]);

	// Handle keyboard shortcuts for save
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "s" && (e.metaKey || e.ctrlKey) && mode === "edit") {
				e.preventDefault();
				handleSave();
			}
		};

		if (isOpen && mode === "edit") {
			document.addEventListener("keydown", handleKeyDown);
		}

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, mode]);

	const handleClose = () => {
		if (mode === "edit" && hasUnsavedChanges) {
			if (
				!window.confirm(
					"You have unsaved changes. Are you sure you want to close?",
				)
			) {
				return;
			}
		}
		setMode("view");
		onClose();
	};

	const handleSave = async () => {
		if (!transcript) return;

		setIsSaving(true);

		try {
			const updatedTranscript: TranscriptView = {
				...transcript,
				title: title.trim(),
				// Update the appropriate content field
				...(transcript.cleanedContent
					? { cleanedContent: content }
					: { rawContent: content }),
			};

			onSave(updatedTranscript);
			setMode("view");
		} finally {
			setIsSaving(false);
		}
	};

	const handleEdit = () => {
		setMode("edit");
	};

	if (!isOpen || !transcript) return null;

	const statusConfig = {
		raw: { label: "Raw", color: "bg-gray-100 text-gray-800" },
		cleaned: { label: "Cleaned", color: "bg-blue-100 text-blue-800" },
	};

	const status = statusConfig[transcript.status];

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


	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
				{/* Custom Header */}
				<div className="p-6 border-b border-gray-200 flex-shrink-0">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							{getSourceIcon()}
							<div className="flex-1 min-w-0">
								{mode === "edit" ? (
									<input
										type="text"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 w-full"
										placeholder="Enter transcript title..."
									/>
								) : (
									<h2 className="text-xl font-semibold text-gray-900 truncate">
										{transcript.title}
									</h2>
								)}
								<div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
									<span>{transcript.wordCount.toLocaleString()} words</span>
									{formatDuration(transcript.duration) && (
										<span>{formatDuration(transcript.duration)}</span>
									)}
									<DateTimeDisplay date={transcript.createdAt} />
								</div>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<span
								className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
							>
								{status.label}
							</span>
							{mode === "edit" && hasUnsavedChanges && (
								<span className="text-xs text-amber-600 font-medium">
									Unsaved changes
								</span>
							)}
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto">
					<div className="p-6">
						{mode === "view" ? (
							<div className="bg-gray-50 rounded-lg p-4">
								<pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
									{transcript.cleanedContent || transcript.rawContent}
								</pre>
							</div>
						) : (
							<div>
								<label
									htmlFor="content"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Content
								</label>
								<textarea
									id="content"
									value={content}
									onChange={(e) => setContent(e.target.value)}
									rows={20}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
									placeholder="Enter transcript content..."
								/>
								<p className="text-xs text-gray-500 mt-1">
									Use Cmd/Ctrl + S to save
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="p-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
					<Button
						onClick={handleClose}
						variant="outline"
						disabled={isSaving}
					>
						Close
					</Button>
					{mode === "view" ? (
						<Button
							onClick={handleEdit}
						>
							Edit
						</Button>
					) : (
						<Button
							onClick={handleSave}
							disabled={isSaving || !hasUnsavedChanges}
						>
							{isSaving ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									Saving...
								</>
							) : (
								"Save Changes"
							)}
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}