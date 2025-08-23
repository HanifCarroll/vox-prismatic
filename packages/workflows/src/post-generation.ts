import { createAIClient, generatePosts } from "@content-creation/ai";
import { createNotionClient, insights, posts } from "@content-creation/notion";
import { loadPromptTemplate } from "@content-creation/prompts";
import {
	type AppConfig,
	createMetricsSummary,
	formatCost,
	formatDuration,
	formatNumber,
	type InsightPage,
	type PostGenerationMetrics,
	type Result,
	saveToDebugFile,
} from "@content-creation/shared";

/**
 * Post Generation Workflow - Pure Business Logic
 * Extracted from CLI module for reuse across web/desktop apps
 */

export interface PostGenerationOptions {
	batchSize?: number;
	enableDebugSaving?: boolean;
}

export interface PostGenerationResults {
	metrics: PostGenerationMetrics[];
	summary: {
		successful: number;
		failed: number;
		totalDuration: number;
		totalCost: number;
		totalTokens: number;
	};
}

/**
 * Gets full insight content from Notion page
 */
const getInsightContent = async (
	notionClient: any,
	insightId: string,
): Promise<Result<string>> => {
	try {
		let content = "";
		let hasMore = true;
		let startCursor: string | undefined;

		while (hasMore) {
			const response = await notionClient.blocks.children.list({
				block_id: insightId,
				start_cursor: startCursor,
				page_size: 100,
			});

			for (const block of response.results) {
				const fullBlock = block as any;
				if (fullBlock.type === "paragraph" && fullBlock.paragraph?.rich_text) {
					content +=
						fullBlock.paragraph.rich_text
							.map((text: { plain_text: string }) => text.plain_text)
							.join("") + "\n";
				} else if (fullBlock.type === "quote" && fullBlock.quote?.rich_text) {
					content +=
						"> " +
						fullBlock.quote.rich_text
							.map((text: any) => text.plain_text)
							.join("") +
						"\n";
				} else if (
					fullBlock.type === "numbered_list_item" &&
					fullBlock.numbered_list_item?.rich_text
				) {
					content +=
						"- " +
						fullBlock.numbered_list_item.rich_text
							.map((text: any) => text.plain_text)
							.join("") +
						"\n";
				}
			}

			hasMore = response.has_more;
			startCursor = response.next_cursor || undefined;
		}

		return { success: true, data: content.trim() };
	} catch (error) {
		return { success: false, error: error as Error };
	}
};

/**
 * Gets original transcript content for context
 */
const getTranscriptContent = async (
	notionClient: any,
	transcriptId: string,
): Promise<Result<string>> => {
	if (!transcriptId) {
		return { success: true, data: "" };
	}

	try {
		let content = "";
		let hasMore = true;
		let startCursor: string | undefined;
		let totalBlocks = 0;

		// Handle pagination to get all blocks
		while (hasMore) {
			const response = await notionClient.blocks.children.list({
				block_id: transcriptId,
				start_cursor: startCursor,
				page_size: 100,
			});

			totalBlocks += response.results.length;

			for (const block of response.results) {
				const fullBlock = block as any;
				if (fullBlock.type === "paragraph" && fullBlock.paragraph?.rich_text) {
					content +=
						fullBlock.paragraph.rich_text
							.map((text: any) => text.plain_text)
							.join("") + "\n";
				} else if (
					fullBlock.type === "bulleted_list_item" &&
					fullBlock.bulleted_list_item?.rich_text
				) {
					content +=
						"• " +
						fullBlock.bulleted_list_item.rich_text
							.map((text: any) => text.plain_text)
							.join("") +
						"\n";
				} else if (
					fullBlock.type === "numbered_list_item" &&
					fullBlock.numbered_list_item?.rich_text
				) {
					content +=
						"1. " +
						fullBlock.numbered_list_item.rich_text
							.map((text: any) => text.plain_text)
							.join("") +
						"\n";
				}
			}

			hasMore = response.has_more;
			startCursor = response.next_cursor || undefined;
		}

		return { success: true, data: content };
	} catch (error) {
		return { success: false, error: error as Error };
	}
};

/**
 * Generates posts for a single insight - Pure business logic
 */
const generatePostsForInsight = async (
	insight: InsightPage,
	config: AppConfig,
	options: PostGenerationOptions = {}
): Promise<PostGenerationMetrics> => {
	const startTime = Date.now();
	const notionClient = createNotionClient(config.notion);
	const { proModel } = createAIClient(config.ai);

	const metrics: PostGenerationMetrics = {
		insightId: insight.id,
		insightTitle: insight.title,
		startTime,
		contentLength: 0,
		estimatedTokensUsed: 0,
		estimatedCost: 0,
		success: false,
	};

	try {
		// Get the full insight content
		const insightContentResult = await getInsightContent(
			notionClient,
			insight.id,
		);
		const insightContent = insightContentResult.success
			? insightContentResult.data
			: "";

		// Get the original transcript for context
		const transcriptContentResult = await getTranscriptContent(
			notionClient,
			insight.transcriptId || "",
		);
		const transcriptContent = transcriptContentResult.success
			? transcriptContentResult.data
			: "";

		// Load and prepare prompt with variables
		const prompt = loadPromptTemplate('generate-posts', {
			INSIGHT_TITLE: insight.title,
			POST_TYPE: insight.postType,
			SCORE: insight.score.toString(),
			SUMMARY: insight.summary || "",
			VERBATIM_QUOTE: insight.verbatimQuote || "",
			FULL_CONTENT: insightContent,
			TRANSCRIPT_CONTENT: transcriptContent
		});

		// Generate posts using AI
		const postResult = await generatePosts(proModel, prompt);

		if (!postResult.success) {
			throw postResult.error;
		}

		const { posts: generatedPosts, duration, cost } = postResult.data;

		// Update metrics
		metrics.endTime = Date.now();
		metrics.duration = metrics.endTime - metrics.startTime;
		metrics.contentLength = insightContent.length + transcriptContent.length;
		metrics.estimatedCost = cost;
		metrics.success = true;

		// Save AI response to debug if enabled
		if (options.enableDebugSaving !== false) {
			saveToDebugFile("post-generation-response", {
				insightId: insight.id,
				insightTitle: insight.title,
				generatedPosts,
				metrics,
			});
		}

		// Create LinkedIn post
		const linkedinResult = await posts.create(
			notionClient,
			config.notion,
			insight,
			generatedPosts,
			"LinkedIn",
		);
		if (!linkedinResult.success) {
			throw linkedinResult.error;
		}

		// Create X post
		const xResult = await posts.create(
			notionClient,
			config.notion,
			insight,
			generatedPosts,
			"X",
		);
		if (!xResult.success) {
			throw xResult.error;
		}

		// Update insight status
		const statusResult = await insights.updateStatus(
			notionClient,
			insight.id,
			"Posts Drafted",
		);
		if (!statusResult.success) {
			// Non-fatal error, log but continue
		}

		return metrics;
	} catch (error) {
		metrics.endTime = Date.now();
		metrics.duration = metrics.endTime - metrics.startTime;
		metrics.error = error instanceof Error ? error.message : "Unknown error";
		return metrics;
	}
};

/**
 * Processes a batch of insights with controlled concurrency
 */
const processBatch = async (
	batchInsights: InsightPage[],
	config: AppConfig,
	options: PostGenerationOptions = {}
): Promise<PostGenerationMetrics[]> => {
	// Process with Promise.allSettled for resilient batch processing
	const batchPromises = batchInsights.map((insight) =>
		generatePostsForInsight(insight, config, options),
	);
	const results = await Promise.allSettled(batchPromises);

	// Extract metrics from results
	const allMetrics: PostGenerationMetrics[] = [];

	for (const result of results) {
		if (result.status === "fulfilled") {
			allMetrics.push(result.value);
		} else {
			// Create failed metrics for rejected promises
			allMetrics.push({
				insightId: "unknown",
				insightTitle: "Failed Promise",
				startTime: Date.now(),
				contentLength: 0,
				estimatedTokensUsed: 0,
				estimatedCost: 0,
				success: false,
				error: result.reason?.message || "Promise rejected",
			});
		}
	}

	return allMetrics;
};

/**
 * Main post generation workflow - Pure business logic
 * No UI dependencies, can be used by CLI, web, or desktop apps
 */
export const generatePostsWorkflow = async (
	config: AppConfig,
	options: PostGenerationOptions = {}
): Promise<Result<PostGenerationResults>> => {
	try {
		const { batchSize = 3, enableDebugSaving = true } = options;
		const notionClient = createNotionClient(config.notion);

		// Get insights ready for posts
		const insightsResult = await insights.getReadyForPosts(
			notionClient,
			config.notion,
		);
		if (!insightsResult.success) {
			return { success: false, error: insightsResult.error };
		}

		const readyInsights = insightsResult.data;

		if (readyInsights.length === 0) {
			return {
				success: true,
				data: {
					metrics: [],
					summary: {
						successful: 0,
						failed: 0,
						totalDuration: 0,
						totalCost: 0,
						totalTokens: 0,
					}
				}
			};
		}

		// Process insights in batches
		const allMetrics: PostGenerationMetrics[] = [];

		for (let i = 0; i < readyInsights.length; i += batchSize) {
			const batch = readyInsights.slice(i, i + batchSize);
			const batchMetrics = await processBatch(batch, config, options);
			allMetrics.push(...batchMetrics);

			// Save individual metrics if debug enabled
			if (enableDebugSaving) {
				batchMetrics.forEach((metrics) => {
					saveToDebugFile("post-generation-metrics", metrics);
				});
			}

			// Small delay between batches to avoid rate limits
			if (i + batchSize < readyInsights.length) {
				await new Promise((resolve) => setTimeout(resolve, 2000));
			}
		}

		// Calculate summary
		const successful = allMetrics.filter((m) => m.success);
		const failed = allMetrics.filter((m) => !m.success);
		const totalDuration = allMetrics.reduce(
			(sum, m) => sum + (m.duration || 0),
			0,
		);
		const totalCost = allMetrics.reduce((sum, m) => sum + m.estimatedCost, 0);
		const totalTokens = allMetrics.reduce(
			(sum, m) => sum + m.estimatedTokensUsed,
			0,
		);

		const summary = {
			successful: successful.length,
			failed: failed.length,
			totalDuration,
			totalCost,
			totalTokens,
		};

		// Save session summary if debug enabled
		if (enableDebugSaving && allMetrics.length > 0) {
			const sessionSummary = createMetricsSummary(allMetrics);
			saveToDebugFile("post-generation-session", sessionSummary);
		}

		return {
			success: true,
			data: {
				metrics: allMetrics,
				summary
			}
		};
	} catch (error) {
		return {
			success: false,
			error: error as Error
		};
	}
};

/**
 * Generate posts for specific insights (selective processing)
 */
export const generatePostsForSpecificInsights = async (
	insights: InsightPage[],
	config: AppConfig,
	options: PostGenerationOptions = {}
): Promise<Result<PostGenerationResults>> => {
	try {
		const { batchSize = 3, enableDebugSaving = true } = options;

		if (insights.length === 0) {
			return {
				success: true,
				data: {
					metrics: [],
					summary: {
						successful: 0,
						failed: 0,
						totalDuration: 0,
						totalCost: 0,
						totalTokens: 0,
					}
				}
			};
		}

		// Process insights in batches
		const allMetrics: PostGenerationMetrics[] = [];

		for (let i = 0; i < insights.length; i += batchSize) {
			const batch = insights.slice(i, i + batchSize);
			const batchMetrics = await processBatch(batch, config, options);
			allMetrics.push(...batchMetrics);

			// Small delay between batches to avoid rate limits
			if (i + batchSize < insights.length) {
				await new Promise((resolve) => setTimeout(resolve, 2000));
			}
		}

		// Calculate summary
		const successful = allMetrics.filter((m) => m.success);
		const failed = allMetrics.filter((m) => !m.success);

		const summary = {
			successful: successful.length,
			failed: failed.length,
			totalDuration: allMetrics.reduce((sum, m) => sum + (m.duration || 0), 0),
			totalCost: allMetrics.reduce((sum, m) => sum + m.estimatedCost, 0),
			totalTokens: allMetrics.reduce((sum, m) => sum + m.estimatedTokensUsed, 0),
		};

		return {
			success: true,
			data: {
				metrics: allMetrics,
				summary
			}
		};
	} catch (error) {
		return {
			success: false,
			error: error as Error
		};
	}
};