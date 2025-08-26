"use client";

import type { TranscriptView } from "@/types/database";
import { useMemo, useState, useCallback } from "react";
import TranscriptInputModal from "./components/TranscriptInputModal";
import TranscriptModal from "./components/TranscriptModal";
import TranscriptCard from "./components/TranscriptCard";
import TranscriptPageHeader from "./components/TranscriptPageHeader";
import TranscriptActionBar from "./components/TranscriptActionBar";
import TranscriptFilterTabs, { type FilterTab } from "./components/TranscriptFilterTabs";
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/toast';
import { 
  useTranscripts, 
  useCreateTranscript, 
  useUpdateTranscript, 
  useBulkUpdateTranscripts 
} from './hooks/useTranscriptQueries';
import { apiClient } from '@/lib/api-client';

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
	// No props needed - data comes from TanStack Query
}

export default function TranscriptsClient() {
	const toast = useToast();
	
	// TanStack Query hooks
	const { data: transcripts = [], isLoading, error } = useTranscripts();
	const createTranscriptMutation = useCreateTranscript();
	const updateTranscriptMutation = useUpdateTranscript();
	const bulkUpdateMutation = useBulkUpdateTranscripts();
	
	// Local UI state
	const [activeFilter, setActiveFilter] = useState("all");
	const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [showInputModal, setShowInputModal] = useState(false);
	const [showTranscriptModal, setShowTranscriptModal] = useState(false);
	const [selectedTranscript, setSelectedTranscript] = useState<TranscriptView | null>(null);
	const [modalMode, setModalMode] = useState<"view" | "edit">("view");

	// Memoize tab counts to prevent header re-renders
	const tabCounts = useMemo(() => {
		return {
			all: transcripts.length,
			raw: transcripts.filter(t => t.status === "raw").length,
			cleaned: transcripts.filter(t => t.status === "cleaned").length,
			processing: transcripts.filter(t => t.status === "processing").length,
			completed: transcripts.filter(t => ["insights_generated", "posts_created"].includes(t.status)).length
		};
	}, [transcripts]);

	// Memoize filter tabs with stable counts
	const memoizedFilterTabs = useMemo(() => {
		return filterTabs.map(tab => ({
			...tab,
			count: () => tabCounts[tab.key as keyof typeof tabCounts] || 0
		}));
	}, [tabCounts]);

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

	// Handler functions for transcript actions
	const handleCleanTranscript = useCallback(async (transcript: TranscriptView) => {
		try {
			// Update status to processing first
			updateTranscriptMutation.mutate({
				id: transcript.id,
				status: 'processing',
			});

			const response = await apiClient.post(`/api/transcripts/${transcript.id}/clean`, {});
			
			if (!response.success) {
				throw new Error(response.error || 'Failed to clean transcript');
			}

			toast.success('Transcript cleaning started', {
				description: 'AI is cleaning up the transcript content',
			});
		} catch (error) {
			console.error('Failed to clean transcript:', error);
			toast.apiError('clean transcript', error instanceof Error ? error.message : 'Unknown error occurred');
			
			// Revert status on error
			updateTranscriptMutation.mutate({
				id: transcript.id,
				status: transcript.status,
			});
		}
	}, [updateTranscriptMutation, toast]);

	const handleProcessTranscript = useCallback(async (transcript: TranscriptView) => {
		try {
			// Update status to processing first
			updateTranscriptMutation.mutate({
				id: transcript.id,
				status: 'processing',
			});

			const response = await apiClient.post(`/api/transcripts/${transcript.id}/process`, {});
			
			if (!response.success) {
				throw new Error(response.error || 'Failed to process transcript');
			}

			toast.success('Insight extraction started', {
				description: 'AI is analyzing the transcript to extract insights',
			});
		} catch (error) {
			console.error('Failed to process transcript:', error);
			toast.apiError('process transcript', error instanceof Error ? error.message : 'Unknown error occurred');
			
			// Revert status on error
			updateTranscriptMutation.mutate({
				id: transcript.id,
				status: transcript.status,
			});
		}
	}, [updateTranscriptMutation, toast]);

	const handleGeneratePostsFromTranscript = useCallback(async (transcript: TranscriptView) => {
		try {
			const response = await apiClient.post(`/api/transcripts/${transcript.id}/generate-posts`, {});
			
			if (!response.success) {
				throw new Error(response.error || 'Failed to generate posts');
			}

			toast.success('Post generation started', {
				description: 'AI is generating social media posts from insights',
			});
		} catch (error) {
			console.error('Failed to generate posts:', error);
			toast.apiError('generate posts', error instanceof Error ? error.message : 'Unknown error occurred');
		}
	}, [toast]);

	const handleDeleteTranscript = useCallback(async (transcript: TranscriptView) => {
		if (!confirm(`Are you sure you want to delete "${transcript.title}"? This action cannot be undone.`)) {
			return;
		}

		try {
			const response = await apiClient.delete(`/api/transcripts/${transcript.id}`);
			
			if (!response.success) {
				throw new Error(response.error || 'Failed to delete transcript');
			}

			toast.deleted('transcript');
		} catch (error) {
			console.error('Failed to delete transcript:', error);
			toast.apiError('delete transcript', error instanceof Error ? error.message : 'Unknown error occurred');
		}
	}, [toast]);

	const handleAction = useCallback((action: string, transcript: TranscriptView) => {
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

		// Handle title update - this will be handled by the mutation success callback
		if (action === "updateTitle") {
			updateTranscriptMutation.mutate({
				id: transcript.id,
				title: transcript.title,
			});
			return;
		}

		// Handle clean action
		if (action === "clean") {
			handleCleanTranscript(transcript);
			return;
		}

		// Handle process action (extract insights)
		if (action === "process") {
			handleProcessTranscript(transcript);
			return;
		}

		// Handle generate posts action
		if (action === "generate_posts") {
			handleGeneratePostsFromTranscript(transcript);
			return;
		}

		// Handle delete action
		if (action === "delete") {
			handleDeleteTranscript(transcript);
			return;
		}
	}, [updateTranscriptMutation, handleCleanTranscript, handleProcessTranscript, handleGeneratePostsFromTranscript, handleDeleteTranscript]);

	const handleBulkAction = useCallback((action: string) => {
		if (selectedTranscripts.length === 0) return;
		
		bulkUpdateMutation.mutate({
			action,
			transcriptIds: selectedTranscripts
		}, {
			onSuccess: () => {
				setSelectedTranscripts([]);
			}
		});
	}, [selectedTranscripts, bulkUpdateMutation]);

	const handleSaveTranscript = useCallback((updatedTranscript: TranscriptView) => {
		updateTranscriptMutation.mutate({
			id: updatedTranscript.id,
			title: updatedTranscript.title,
			rawContent: updatedTranscript.rawContent,
			cleanedContent: updatedTranscript.cleanedContent,
		}, {
			onSuccess: () => {
				setShowTranscriptModal(false);
				setSelectedTranscript(null);
			}
		});
	}, [updateTranscriptMutation]);

	const handleInputTranscript = useCallback((formData: {
		title: string;
		content: string;
		fileName?: string;
	}) => {
		createTranscriptMutation.mutate({
			title: formData.title,
			rawContent: formData.content,
			sourceType: formData.fileName ? "upload" : "manual",
			fileName: formData.fileName,
			metadata: formData.fileName
				? {
						originalFileName: formData.fileName,
					}
				: undefined,
		}, {
			onSuccess: () => {
				setShowInputModal(false);
			}
		});
	}, [createTranscriptMutation]);

	// Handle loading state
	if (isLoading) {
		return (
			<div className="h-screen flex flex-col items-center justify-center max-w-7xl mx-auto">
				<div className="text-center">
					<FileText className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">Loading transcripts...</h3>
					<p className="text-gray-600">Please wait while we fetch your transcripts</p>
				</div>
			</div>
		);
	}

	// Handle error state
	if (error) {
		return (
			<div className="h-screen flex flex-col items-center justify-center max-w-7xl mx-auto">
				<div className="text-center">
					<FileText className="h-16 w-16 text-red-400 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load transcripts</h3>
					<p className="text-gray-600 mb-4">{error.message}</p>
					<Button onClick={() => window.location.reload()}>
						Try Again
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8 px-4 max-w-7xl">
			{/* Header */}
			<TranscriptPageHeader
				title="Transcripts"
				description="Manage your content pipeline from raw transcripts to published posts"
			/>

			<div className="space-y-6">
				<TranscriptActionBar
					onAddTranscript={useCallback(() => setShowInputModal(true), [])}
					selectedCount={selectedTranscripts.length}
					onBulkAction={handleBulkAction}
					searchQuery={searchQuery}
					onSearchChange={useCallback((query: string) => setSearchQuery(query), [])}
				/>

				<TranscriptFilterTabs
					tabs={memoizedFilterTabs}
					transcripts={transcripts}
					activeFilter={activeFilter}
					onFilterChange={setActiveFilter}
				/>
			</div>

			{/* Transcripts Grid */}
			<div className="mt-6">
				<div className="space-y-4">
					{filteredTranscripts.length === 0 ? (
						<div className="text-center py-12">
							<FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
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
								<Button onClick={() => setShowInputModal(true)} className="gap-2">
									<Plus className="h-4 w-4" />
									Add Transcript
								</Button>
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
