import { createNotionClient, posts } from "@content-creation/notion";
import { schedulePostToPlatform, getIntegrations, getScheduledPosts } from "@content-creation/postiz";
import { suggestTimeSlots, parseCustomDateTime } from "@content-creation/shared";
import {
	type AppConfig,
	type PostPage,
	type Result,
} from "@content-creation/shared";

/**
 * Scheduling Workflow - Pure Business Logic
 * Handles post scheduling across platforms
 */

export interface SchedulingOptions {
	platform?: string;
	customDateTime?: Date;
	useAutoSuggestion?: boolean;
}

export interface SchedulingResults {
	scheduled: PostPage[];
	failed: Array<{ post: PostPage; error: string }>;
	summary: {
		totalAttempted: number;
		successful: number;
		failed: number;
	};
}

/**
 * Get posts ready for scheduling
 */
export const getPostsForScheduling = async (
	config: AppConfig,
	platform?: string
): Promise<Result<PostPage[]>> => {
	try {
		const notionClient = createNotionClient(config.notion);
		return await posts.getApproved(notionClient, config.notion, platform);
	} catch (error) {
		return { success: false, error: error as Error };
	}
};

/**
 * Schedule a single post
 */
export const schedulePost = async (
	post: PostPage,
	scheduledDate: Date,
	config: AppConfig
): Promise<Result<void>> => {
	try {
		const result = await schedulePostToPlatform(
			config.postiz,
			post.platform,
			post.content,
			scheduledDate.toISOString()
		);
		if (!result.success) {
			return result;
		}

		// Update post status in Notion
		const notionClient = createNotionClient(config.notion);
		return await posts.updateScheduledDate(notionClient, post.id, scheduledDate.toISOString());
	} catch (error) {
		return { success: false, error: error as Error };
	}
};

/**
 * Batch schedule posts workflow
 */
export const schedulePostsWorkflow = async (
	postsToSchedule: PostPage[],
	config: AppConfig,
	options: SchedulingOptions = {}
): Promise<Result<SchedulingResults>> => {
	// Implementation to be extracted from post-scheduler.ts
	// This is a placeholder for now
	const results: SchedulingResults = {
		scheduled: [],
		failed: [],
		summary: {
			totalAttempted: postsToSchedule.length,
			successful: 0,
			failed: 0,
		}
	};

	return { success: true, data: results };
};

/**
 * Get scheduling suggestions
 */
export const getSchedulingSuggestions = async (
	platform: string,
	config: AppConfig,
	daysAhead: number = 7
): Promise<Result<string[]>> => {
	try {
		const scheduledPostsResult = await getScheduledPosts(config.postiz);
		if (!scheduledPostsResult.success) {
			return scheduledPostsResult;
		}

		const suggestions = suggestTimeSlots(platform, scheduledPostsResult.data, daysAhead);
		return { success: true, data: suggestions };
	} catch (error) {
		return { success: false, error: error as Error };
	}
};