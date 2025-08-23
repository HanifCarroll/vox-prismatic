import {
	getAnalyticsSummary,
	getAnalysisIds,
	displayAnalytics,
	displayTypeAnalytics,
} from "@content-creation/shared";

/**
 * Analytics Processing Workflow - Pure Business Logic
 * Handles analytics computation and reporting
 */

export interface AnalyticsResults {
	insights: {
		approved: number;
		rejected: number;
		skipped: number;
		total: number;
	};
	posts: {
		approved: number;
		rejected: number;
		edited: number;
		skipped: number;
		regenerated: number;
		total: number;
	};
	sessions: number;
}

/**
 * Get analytics summary workflow
 */
export const getAnalyticsWorkflow = (): AnalyticsResults => {
	return getAnalyticsSummary();
};

/**
 * Get detailed analytics for specific type
 */
export const getTypeAnalyticsWorkflow = (type: 'insights' | 'posts'): AnalyticsResults => {
	const summary = getAnalyticsSummary();
	
	// Return full summary but can be filtered by consumer
	return summary;
};

/**
 * Get IDs for detailed analysis
 */
export const getAnalysisIdsWorkflow = () => {
	return getAnalysisIds();
};