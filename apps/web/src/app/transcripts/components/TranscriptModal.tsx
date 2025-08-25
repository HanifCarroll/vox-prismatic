"use client";

import { useEffect, useRef, useState } from "react";
import type { TranscriptView } from "@content-creation/shared";

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
	const modalRef = useRef<HTMLDivElement>(null);
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

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				handleClose();
			} else if (e.key === "s" && (e.metaKey || e.ctrlKey) && mode === "edit") {
				e.preventDefault();
				handleSave();
			}
		};

		const handleClickOutside = (e: MouseEvent) => {
			if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
				handleClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
			document.addEventListener("mousedown", handleClickOutside);
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handleClickOutside);
			document.body.style.overflow = "unset";
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
		processing: { label: "Processing", color: "bg-purple-100 text-purple-800" },
		cleaned: { label: "Cleaned", color: "bg-blue-100 text-blue-800" },
		insights_generated: {
			label: "Ready",
			color: "bg-green-100 text-green-800",
		},
		posts_created: {
			label: "Posted",
			color: "bg-emerald-100 text-emerald-800",
		},
		error: { label: "Error", color: "bg-red-100 text-red-800" },
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
		return date.toLocaleString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div
				ref={modalRef}
				className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
			>
				{/* Header */}
				<div className="p-6 border-b border-gray-200 flex-shrink-0">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<span className="text-2xl">{getSourceIcon()}</span>
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
									<span>{formatDate(transcript.createdAt)}</span>
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
							<button
								onClick={handleClose}
								className="text-gray-400 hover:text-gray-600 transition-colors"
							>
								<svg
									className="w-6 h-6"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
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
					<button
						onClick={handleClose}
						className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
						disabled={isSaving}
					>
						Close
					</button>
					{mode === "view" ? (
						<button
							onClick={handleEdit}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							Edit
						</button>
					) : (
						<button
							onClick={handleSave}
							disabled={isSaving || !hasUnsavedChanges}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{isSaving ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									Saving...
								</>
							) : (
								"Save Changes"
							)}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}