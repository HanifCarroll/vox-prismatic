"use client";

import { useState, useEffect, useTransition } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, Calendar, Hash, Edit, Save, X } from "lucide-react";
import { DateTimeDisplay } from "@/components/date";
import { getTranscript, updateTranscript } from "@/app/actions/transcripts";
import { useToast } from "@/lib/toast";
import type { TranscriptView } from "@/types";

interface TranscriptModalProps {
	transcriptId?: string;
	transcript?: TranscriptView | null; // Optional: can still pass data directly
	isOpen: boolean;
	onClose: () => void;
	onUpdate: () => void;
	initialMode?: "view" | "edit";
}

export default function TranscriptModal({
	transcriptId,
	transcript: externalTranscript,
	isOpen,
	onClose,
	onUpdate,
	initialMode = "view",
}: TranscriptModalProps) {
	const [transcript, setTranscript] = useState<TranscriptView | null>(externalTranscript || null);
	const [isLoading, setIsLoading] = useState(!externalTranscript);
	const [isEditing, setIsEditing] = useState(initialMode === "edit");
	const [editedData, setEditedData] = useState({
		title: "",
		rawContent: "",
	});
	const [isSaving, startTransition] = useTransition();
	const toast = useToast();

	// Fetch transcript if ID is provided and no external data
	useEffect(() => {
		if (isOpen && transcriptId && !externalTranscript) {
			setIsLoading(true);
			getTranscript(transcriptId).then(result => {
				if (result.success && result.data) {
					setTranscript(result.data);
					setEditedData({
						title: result.data.title,
						rawContent: result.data.rawContent,
					});
				} else {
					toast.error('Failed to load transcript');
					onClose();
				}
				setIsLoading(false);
			});
		} else if (externalTranscript) {
			setTranscript(externalTranscript);
			setEditedData({
				title: externalTranscript.title,
				rawContent: externalTranscript.rawContent,
			});
		}
	}, [transcriptId, externalTranscript, isOpen, onClose, toast]);

	const handleSave = async () => {
		if (!transcript) return;
		
		startTransition(async () => {
			try {
				const formData = new FormData();
				formData.append('title', editedData.title);
				formData.append('rawContent', editedData.rawContent);
				
				const result = await updateTranscript(transcript.id, formData);
				
				if (result.success) {
					toast.success('Transcript updated successfully');
					setIsEditing(false);
					onUpdate();
					// Update local state with new data
					if (result.data) {
						setTranscript(result.data);
					}
				} else {
					toast.error('Failed to update transcript');
				}
			} catch (error) {
				toast.error('Failed to save transcript');
			}
		});
	};

	const handleCancel = () => {
		if (transcript) {
			setEditedData({
				title: transcript.title,
				rawContent: transcript.rawContent,
			});
		}
		setIsEditing(false);
	};

	const getStatusBadge = (status: string) => {
		const styles = {
			raw: "bg-gray-100 text-gray-700",
			cleaned: "bg-blue-100 text-blue-700",
			processed: "bg-green-100 text-green-700",
		};
		return (
			<Badge className={styles[status as keyof typeof styles] || styles.raw}>
				{status}
			</Badge>
		);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
				{isLoading ? (
					<div className="flex items-center justify-center h-96">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
					</div>
				) : transcript ? (
					<>
						<DialogHeader>
							<div className="flex items-center justify-between">
								<DialogTitle className="text-xl">
									{isEditing ? "Edit Transcript" : transcript.title}
								</DialogTitle>
								{getStatusBadge(transcript.status)}
							</div>
							<div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
								<div className="flex items-center gap-1">
									<Calendar className="h-4 w-4" />
									<DateTimeDisplay date={transcript.createdAt} />
								</div>
								<div className="flex items-center gap-1">
									<Hash className="h-4 w-4" />
									{transcript.wordCount || 0} words
								</div>
							</div>
						</DialogHeader>

						<div className="flex-1 overflow-y-auto space-y-4 py-4">
							{isEditing ? (
								<>
									<div className="space-y-2">
										<Label htmlFor="title">Title</Label>
										<Input
											id="title"
											value={editedData.title}
											onChange={(e) =>
												setEditedData((prev) => ({
													...prev,
													title: e.target.value,
												}))
											}
											placeholder="Enter transcript title"
											disabled={isSaving}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="content">Content</Label>
										<Textarea
											id="content"
											value={editedData.rawContent}
											onChange={(e) =>
												setEditedData((prev) => ({
													...prev,
													rawContent: e.target.value,
												}))
											}
											placeholder="Enter transcript content"
											className="min-h-[400px] font-mono text-sm"
											disabled={isSaving}
										/>
									</div>
								</>
							) : (
								<>
									{transcript.cleanedContent && (
										<div className="space-y-2">
											<h3 className="font-semibold text-sm">Cleaned Content</h3>
											<div className="p-4 bg-gray-50 rounded-lg">
												<pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
													{transcript.cleanedContent}
												</pre>
											</div>
										</div>
									)}
									<div className="space-y-2">
										<h3 className="font-semibold text-sm">Raw Content</h3>
										<div className="p-4 bg-gray-50 rounded-lg">
											<pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
												{transcript.rawContent}
											</pre>
										</div>
									</div>
								</>
							)}
						</div>

						<DialogFooter>
							{isEditing ? (
								<>
									<Button
										variant="outline"
										onClick={handleCancel}
										disabled={isSaving}
									>
										<X className="h-4 w-4 mr-2" />
										Cancel
									</Button>
									<Button onClick={handleSave} disabled={isSaving}>
										{isSaving ? (
											<>
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
												Saving...
											</>
										) : (
											<>
												<Save className="h-4 w-4 mr-2" />
												Save Changes
											</>
										)}
									</Button>
								</>
							) : (
								<Button
									onClick={() => setIsEditing(true)}
									disabled={false}
								>
									<Edit className="h-4 w-4 mr-2" />
									Edit Transcript
								</Button>
							)}
						</DialogFooter>
					</>
				) : (
					<div className="flex items-center justify-center h-96">
						<div className="text-center">
							<FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
							<p className="text-gray-500">No transcript data available</p>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}