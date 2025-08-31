
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format, addHours } from "date-fns";
import { Platform } from "@/types";
import type { ApprovedPost, PostModalData } from "@/types/scheduler";
import {
	Calendar as CalendarIcon,
	Clock,
	Loader2,
	Save,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useSchedulerPosts, useSchedulerEvents } from "@/hooks/useSchedulerData";
import { PlatformIcon } from "./PlatformIcon";
// Scheduler hooks
import { useToast } from "@/lib/toast";
import { useSchedulePost, useUnschedulePost, useUpdatePost } from "@/hooks/use-api-actions";
import { BaseModalProps, ensureModalData } from "@/components/modals/BaseModal";

interface SchedulerPostModalData {
	mode: 'create' | 'edit';
	postId?: string;  // Required for create mode
	eventId?: string; // Required for edit mode
}

/**
 * PostModal component - Modal for viewing and scheduling posts
 * Handles displaying and scheduling approved posts
 */
export default function PostModal({ isOpen, onClose, data }: BaseModalProps) {
	// Extract only the essential values from data
	const { mode = 'create', postId, eventId } = (data as SchedulerPostModalData) || {};
	
	// Get data from React Query cache
	const { posts } = useSchedulerPosts();
	const { events } = useSchedulerEvents();
	
	// Look up the post and event from cache
	const event = eventId ? events.find(e => e.id === eventId) : null;
	// In edit mode, get post from event; in create mode, use provided postId
	const post = mode === 'edit' && event 
		? posts.find(p => p.id === event.postId)
		: postId 
		? posts.find(p => p.id === postId) 
		: null;
	
	const unschedulePostMutation = useUnschedulePost();
	const schedulePostMutation = useSchedulePost();
	const updatePost = useUpdatePost();
	const toast = useToast();

	// Form state
	const [formData, setFormData] = useState<PostModalData>({
		postId: "",
		title: "",
		content: "",
		platform: Platform.LINKEDIN,
		scheduledTime: "",
		metadata: {},
	});

	const [selectedPost, setSelectedPost] = useState<ApprovedPost | null>(null);
	const [editedContent, setEditedContent] = useState("");

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSavingContent, setIsSavingContent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [characterCount, setCharacterCount] = useState(0);

	// Platform character limits
	const characterLimits = {
		linkedin: 3000,
		x: 280,
	};

	// Initialize form data when modal opens
	useEffect(() => {
		if (isOpen) {
			// Determine initial date/time
			let initialDateTimeStr: string;
			if (event) {
				// Use event's scheduled time if editing
				initialDateTimeStr = format(new Date(event.scheduledTime), "yyyy-MM-dd'T'HH:mm");
			} else {
				// Default to 1 hour from now for new scheduling
				initialDateTimeStr = format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm");
			}

			// Determine platform - derive from event or post
			const platform = event?.platform || post?.platform || Platform.LINKEDIN;

			// Reset form state
			setFormData({
				postId: post?.id || "",
				title: post?.title || "",
				content: post?.content || "",
				platform: platform as Platform,
				scheduledTime: initialDateTimeStr,
				metadata: {},
			});

			// Set selected post and content
			if (post) {
				setSelectedPost(post);
				setEditedContent(post.content);
				setCharacterCount(post.content.length);
			} else {
				setSelectedPost(null);
				setEditedContent("");
				setCharacterCount(0);
			}

			setError(null);
		}
	}, [isOpen, mode, postId, eventId, post, event]);

	// Update character count when content changes
	useEffect(() => {
		setCharacterCount(editedContent.length);
	}, [editedContent]);

	// Handle post selection
	const handlePostSelect = useCallback((post: ApprovedPost) => {
		setSelectedPost(post);
		setEditedContent(post.content);
		setFormData((prev) => ({
			...prev,
			postId: post.id,
			title: post.title,
			content: post.content,
			platform: post.platform,
		}));
	}, []);

	// Handle form field changes
	const handleChange = useCallback((field: keyof PostModalData, value: string | Platform | Record<string, unknown>) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	}, []);

	// Handle platform change
	const handlePlatformChange = useCallback(
		(platform: Platform) => {
			handleChange("platform", platform);
		},
		[handleChange],
	);

	// Handle content reset
	const handleResetContent = useCallback(() => {
		setEditedContent(selectedPost?.content || "");
	}, [selectedPost]);

	// Handle saving content changes
	const handleSaveContent = useCallback(async () => {
		if (!selectedPost || !editedContent.trim()) return;

		setIsSavingContent(true);
		setError(null);

		try {
			// Update the post content using server action
			const formData = new FormData();
			formData.append('content', editedContent.trim());
			await updatePost.update(selectedPost.id, formData);

			// Update local state
			const updatedPost = { ...selectedPost, content: editedContent.trim() };
			setSelectedPost(updatedPost);
			setFormData((prev) => ({ ...prev, content: editedContent.trim() }));
			
			// Show success toast
			toast.saved("Post content");
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to save changes";
			setError(errorMessage);
			toast.error("Failed to save content", {
				description: errorMessage
			});
		} finally {
			setIsSavingContent(false);
		}
	}, [selectedPost, editedContent]);

	// Validate form
	const validateForm = (): string | null => {
		// Allow empty scheduled time for unscheduling
		if (formData.scheduledTime) {
			const scheduledDate = new Date(formData.scheduledTime);
			const now = new Date();

			if (scheduledDate <= now) {
				return "Scheduled time must be in the future";
			}
		}

		return null;
	};

	// Handle form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const validationError = validateForm();
		if (validationError) {
			setError(validationError);
			toast.warning("Validation Error", {
				description: validationError
			});
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			// First, save content changes if any
			if (selectedPost && editedContent !== selectedPost.content) {
				const updateFormData = new FormData();
				updateFormData.append('content', editedContent.trim());
				await updatePost.update(selectedPost.id, updateFormData);
			}

			// Then handle scheduling/unscheduling
			if (formData.scheduledTime) {
				// Schedule the post using TanStack Query mutation
				await schedulePostMutation.schedule(
					formData.postId,
					formData.scheduledTime
				);

				// Show success toast with specific scheduling details
				const scheduledDate = new Date(formData.scheduledTime);
				const formattedDate = format(scheduledDate, "MMM d, yyyy 'at' h:mm a");
				toast.scheduled(formattedDate, formData.platform);

				// Close modal after successful scheduling
				onClose();
			} else {
				// Unschedule the post using TanStack Query mutation
				if (!selectedPost?.id) {
					throw new Error("No post selected for unscheduling");
				}

				await unschedulePostMutation.unschedule(selectedPost.id);

				// Show success toast for unscheduling
				toast.success("Post unscheduled", {
					description: "Post has been removed from the schedule"
				});

				// Close modal after successful unscheduling
				onClose();
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to save post";
			setError(errorMessage);
			
			// Show error toast with specific context
			const operation = formData.scheduledTime ? "schedule" : "unschedule";
			toast.apiError(`${operation} post`, errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle modal close
	const handleClose = useCallback(() => {
		onClose();
	}, [onClose]);

	// In create mode, we don't need a selected post initially
	// In edit mode, we need either a post or posts to choose from
	if (!isOpen) return null;
	if (mode === 'edit' && !post && posts.length === 0) return null;

	return (
		<Dialog open={isOpen} onOpenChange={() => handleClose()}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CalendarIcon className="w-5 h-5" />
						Schedule Post
					</DialogTitle>
					<DialogDescription className="sr-only">
						Schedule or edit a social media post for publishing at a specific time
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Post Display or Selector */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="text-sm font-medium text-gray-700">Post</div>
						</div>

						{selectedPost ? (
							<div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
								<div className="flex items-center justify-between mb-3">
									<PlatformIcon platform={selectedPost.platform} size="md" showLabel={false} />
									<span className={`text-sm font-medium ${
										characterCount > characterLimits[formData.platform] 
											? 'text-red-600' 
											: 'text-gray-600'
									}`}>
										{characterCount} / {characterLimits[formData.platform]} chars
									</span>
								</div>

								<Textarea
									value={editedContent}
									onChange={(e) => setEditedContent(e.target.value)}
									className="min-h-48 max-h-80 resize-none text-sm whitespace-pre-wrap"
									placeholder="Enter post content..."
								/>

								{selectedPost.insightTitle && (
									<div className="text-xs text-gray-500 mt-2">
										From: {selectedPost.insightTitle}
									</div>
								)}
							</div>
						) : (
							<div className="border border-gray-200 rounded-lg p-4">
								<p className="text-sm text-gray-500 text-center">
									{posts.length > 0 
										? "Select a post from the approved posts sidebar to schedule"
										: "No approved posts available to schedule"}
								</p>
							</div>
						)}
					</div>

					{/* Scheduled Time */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label className="text-sm font-medium text-gray-700 flex items-center gap-2">
								<Clock className="w-4 h-4" />
								Scheduled Time
							</label>
							{formData.scheduledTime && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => handleChange("scheduledTime", "")}
									className="flex items-center gap-1 text-xs"
								>
									<X className="w-3 h-3" />
									Clear
								</Button>
							)}
						</div>
						<Input
							type="datetime-local"
							value={formData.scheduledTime}
							onChange={(e) => handleChange("scheduledTime", e.target.value)}
							min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
							className="w-full"
							placeholder="Leave empty to unschedule"
						/>
						{!formData.scheduledTime && (
							<p className="text-xs text-gray-500">
								Leave empty to unschedule this post
							</p>
						)}
					</div>

					{/* Error Message */}
					{error && (
						<div className="p-3 bg-red-50 border border-red-200 rounded-md">
							<p className="text-sm text-red-700">{error}</p>
						</div>
					)}

					{/* Actions */}
					<div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isSubmitting}
						>
							Cancel
						</Button>

						<Button
							type="submit"
							disabled={isSubmitting || !selectedPost}
							className="min-w-[120px]"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin mr-2" />
									Saving...
								</>
							) : (
								<>
									<Save className="w-4 h-4 mr-2" />
									Save
								</>
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
