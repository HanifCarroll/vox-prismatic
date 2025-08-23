import { createNotionClient, insights } from "@content-creation/notion";
import {
	type AppConfig,
	type InsightPage,
	type Result,
} from "@content-creation/shared";

/**
 * Insight Management Workflow - Pure Business Logic
 * Handles insight review, approval, and status management
 */

export interface InsightManagementOptions {
	enableAnalytics?: boolean;
}

/**
 * Get insights ready for review
 */
export const getInsightsForReview = async (
	config: AppConfig
): Promise<Result<InsightPage[]>> => {
	try {
		const notionClient = createNotionClient(config.notion);
		return await insights.getDrafts(notionClient, config.notion);
	} catch (error) {
		return { success: false, error: error as Error };
	}
};

/**
 * Update insight status workflow
 */
export const updateInsightStatus = async (
	insightId: string,
	status: string,
	config: AppConfig
): Promise<Result<void>> => {
	try {
		const notionClient = createNotionClient(config.notion);
		return await insights.updateStatus(notionClient, insightId, status);
	} catch (error) {
		return { success: false, error: error as Error };
	}
};

/**
 * Batch update insight statuses
 */
export const batchUpdateInsightStatuses = async (
	updates: Array<{ insightId: string; status: string }>,
	config: AppConfig
): Promise<Result<{ successful: number; failed: number }>> => {
	// Implementation to be extracted from insight-reviewer.ts
	// This is a placeholder for now
	return {
		success: true,
		data: {
			successful: updates.length,
			failed: 0
		}
	};
};