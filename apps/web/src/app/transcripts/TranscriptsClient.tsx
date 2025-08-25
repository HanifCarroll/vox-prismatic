"use client";

import type { TranscriptView } from "@content-creation/database";
import { useMemo, useState } from "react";
import TranscriptInputModal from "./components/TranscriptInputModal";
import TranscriptModal from "./components/TranscriptModal";
import TranscriptCard from "./components/TranscriptCard";
import TranscriptPageHeader from "./components/TranscriptPageHeader";
import TranscriptActionBar from "./components/TranscriptActionBar";
import TranscriptFilterTabs, { type FilterTab } from "./components/TranscriptFilterTabs";

const filterTabs: FilterTab[] = [
	{
		key: "all",
		label: "All Transcripts",
		count: (transcripts: TranscriptView[]) => transcripts.length,
	},
	{
		key: "raw",
		label: "Need Cleaning",
		count: (transcripts: TranscriptView[]) =>
			transcripts.filter((t) => t.status === "raw").length,
	},
	{
		key: "cleaned",
		label: "Ready to Process",
		count: (transcripts: TranscriptView[]) =>
			transcripts.filter((t) => t.status === "cleaned").length,
	},
	{
		key: "processing",
		label: "Processing",
		count: (transcripts: TranscriptView[]) =>
			transcripts.filter((t) => t.status === "processing").length,
	},
	{
		key: "completed",
		label: "Completed",
		count: (transcripts: TranscriptView[]) =>
			transcripts.filter((t) =>
				["insights_generated", "posts_created"].includes(t.status),
			).length,
	},
];


interface TranscriptsClientProps {
	initialTranscripts: TranscriptView[];
}

export default function TranscriptsClient({
	initialTranscripts,
}: TranscriptsClientProps) {
	const [activeFilter, setActiveFilter] = useState("all");
	const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [transcripts, setTranscripts] =
		useState<TranscriptView[]>(initialTranscripts);
	const [showInputModal, setShowInputModal] = useState(false);
	const [showTranscriptModal, setShowTranscriptModal] = useState(false);
	const [selectedTranscript, setSelectedTranscript] = useState<TranscriptView | null>(null);
	const [modalMode, setModalMode] = useState<"view" | "edit">("view");

	const filteredTranscripts = useMemo(() => {
		let filtered = transcripts;

		// Apply search filter
		if (searchQuery) {
			filtered = filtered.filter(
				(transcript) =>
					transcript.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					transcript.rawContent.toLowerCase().includes(searchQuery.toLowerCase()),
			);
		}

		// Apply status filter
		switch (activeFilter) {
			case "raw":
				return filtered.filter((t) => t.status === "raw");
			case "cleaned":
				return filtered.filter((t) => t.status === "cleaned");
			case "processing":
				return filtered.filter((t) => t.status === "processing");
			case "completed":
				return filtered.filter((t) =>
					["insights_generated", "posts_created"].includes(t.status),
				);
			default:
				return filtered;
		}
	}, [transcripts, activeFilter, searchQuery]);

	const handleAction = (action: string, transcript: TranscriptView) => {
		console.log(`Action: ${action} on transcript: ${transcript.title}`);

		// Handle view action
		if (action === "view") {
			setSelectedTranscript(transcript);
			setModalMode("view");
			setShowTranscriptModal(true);
			return;
		}

		// Handle edit action
		if (action === "edit") {
			setSelectedTranscript(transcript);
			setModalMode("edit");
			setShowTranscriptModal(true);
			return;
		}

		// Handle title update
		if (action === "updateTitle") {
			setTranscripts((prev) =>
				prev.map((t) => (t.id === transcript.id ? transcript : t)),
			);
			return;
		}

		// TODO: Implement other actions
	};

	const handleBulkAction = (action: string) => {
		console.log(
			`Bulk action: ${action} on ${selectedTranscripts.length} transcripts`,
		);
		// TODO: Implement bulk actions
	};

	const handleSaveTranscript = async (updatedTranscript: TranscriptView) => {
		try {
			const response = await fetch(`/api/transcripts/${updatedTranscript.id}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					title: updatedTranscript.title,
					rawContent: updatedTranscript.rawContent,
					cleanedContent: updatedTranscript.cleanedContent,
				}),
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					// Update the transcript in the list
					setTranscripts((prev) =>
						prev.map((t) => (t.id === updatedTranscript.id ? updatedTranscript : t)),
					);
					setShowTranscriptModal(false);
					setSelectedTranscript(null);
				} else {
					console.error("Failed to update transcript:", result.error);
				}
			} else {
				console.error("Failed to update transcript");
			}
		} catch (error) {
			console.error("Error updating transcript:", error);
		}
	};

	const handleInputTranscript = async (formData: {
		title: string;
		content: string;
		fileName?: string;
	}) => {
		try {
			const response = await fetch("/api/transcripts", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					title: formData.title,
					rawContent: formData.content,
					sourceType: formData.fileName ? "upload" : "manual",
					fileName: formData.fileName,
					metadata: formData.fileName
						? {
								originalFileName: formData.fileName,
							}
						: undefined,
				}),
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					// Add the new transcript to the list
					const newTranscript: TranscriptView = {
						...result.data,
						createdAt: new Date(result.data.createdAt),
						updatedAt: new Date(result.data.updatedAt),
					};
					setTranscripts((prev) => [newTranscript, ...prev]);
					setShowInputModal(false);
				} else {
					console.error("Failed to save transcript:", result.error);
				}
			} else {
				console.error("Failed to save transcript");
			}
		} catch (error) {
			console.error("Error saving transcript:", error);
		}
	};

	return (
		<div className="h-screen flex flex-col max-w-7xl mx-auto">
			{/* Header - Fixed */}
			<div className="p-6 pb-0 flex-shrink-0">
				<TranscriptPageHeader
					title="Transcripts"
					description="Manage your content pipeline from raw transcripts to published posts"
				/>

				<TranscriptActionBar
					onAddTranscript={() => setShowInputModal(true)}
					selectedCount={selectedTranscripts.length}
					onBulkAction={handleBulkAction}
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
				/>

				<TranscriptFilterTabs
					tabs={filterTabs}
					activeFilter={activeFilter}
					onFilterChange={setActiveFilter}
					transcripts={transcripts}
				/>
			</div>

			{/* Transcripts Grid - Scrollable */}
			<div className="flex-1 overflow-y-auto px-6 pb-6">
				<div className="space-y-4">
					{filteredTranscripts.length === 0 ? (
						<div className="text-center py-12">
							<div className="text-gray-400 text-6xl mb-4">📄</div>
							<h3 className="text-lg font-medium text-gray-900 mb-2">
								{searchQuery
									? "No matching transcripts"
									: "No transcripts found"}
							</h3>
							<p className="text-gray-600 mb-4">
								{searchQuery
									? "Try adjusting your search terms or filters"
									: "Get started by adding your first transcript"}
							</p>
							{!searchQuery && (
								<button
									onClick={() => setShowInputModal(true)}
									className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
								>
									+ Add Transcript
								</button>
							)}
						</div>
					) : (
						filteredTranscripts.map((transcript) => (
							<TranscriptCard
								key={transcript.id}
								transcript={transcript}
								onAction={handleAction}
							/>
						))
					)}
				</div>
			</div>

			<TranscriptInputModal
				isOpen={showInputModal}
				onClose={() => setShowInputModal(false)}
				onSubmit={handleInputTranscript}
			/>

			<TranscriptModal
				transcript={selectedTranscript}
				isOpen={showTranscriptModal}
				onClose={() => {
					setShowTranscriptModal(false);
					setSelectedTranscript(null);
				}}
				onSave={handleSaveTranscript}
				initialMode={modalMode}
			/>
		</div>
	);
}
