import { createAIClient, generatePosts } from "@content-creation/ai";
import {
	initDatabase,
	getInsights,
	updateInsightStatus,
	type InsightRecord
} from "@content-creation/database";
import { loadPromptTemplate } from "@content-creation/prompts";
import {
	type AppConfig,
	createMetricsSummary,
	formatCost,
	formatDuration,
	formatNumber,
	type PostGenerationMetrics,
	type Result,
	saveToDebugFile,
} from "@content-creation/shared";

/**
 * Post Generation Workflow - Pure Business Logic
 * Updated to use SQLite database instead of Notion
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
 * Formats insight content for post generation prompt
 */
const formatInsightForPostGeneration = (insight: InsightRecord): string => {
	const sections = [];
	
	sections.push(`Title: ${insight.title}`);
	sections.push(`Summary: ${insight.summary}`);
	sections.push(`Category: ${insight.category}`);
	sections.push(`Post Type: ${insight.postType}`);
	sections.push('');
	
	sections.push('Key Quote:');
	sections.push(`"${insight.verbatimQuote}"`);
	sections.push('');
	
	sections.push('Scoring Context:');
	sections.push(`- Urgency: ${insight.urgencyScore}/10`);
	sections.push(`- Relatability: ${insight.relatabilityScore}/10`);
	sections.push(`- Specificity: ${insight.specificityScore}/10`);
	sections.push(`- Authority: ${insight.authorityScore}/10`);
	sections.push(`- Total Score: ${insight.totalScore}/40`);
	
	return sections.join('\n');
};

/**
 * Processes a single insight to generate posts
 */
const processInsightForPosts = async (
	insight: InsightRecord,
	config: AppConfig,
	options: PostGenerationOptions
): Promise<PostGenerationMetrics> => {
	const startTime = Date.now();

	const metrics: PostGenerationMetrics = {
		insightId: insight.id,
		insightTitle: insight.title,
		startTime,
		contentLength: insight.summary.length,
		success: false,
		estimatedTokensUsed: 0,
		estimatedCost: 0,
		error: undefined,
	};

	try {
		console.log(`🚀 Processing insight: ${insight.title} (Score: ${insight.totalScore})`);

		// Format insight content for the AI prompt
		const insightContent = formatInsightForPostGeneration(insight);

		// Load post generation template
		const prompt = loadPromptTemplate('generate-posts', {
			INSIGHT_CONTENT: insightContent,
			POST_TYPE: insight.postType,
			CATEGORY: insight.category
		});

		console.log(`📝 Generating posts with AI...`);

		// Generate posts using AI
		const { proModel } = createAIClient(config.ai);
		const postsResult = await generatePosts(
			proModel, 
			prompt,
			insight.id,
			insight.title
		);

		if (!postsResult.success) {
			throw postsResult.error;
		}

		metrics.duration = postsResult.data.duration;
		metrics.estimatedCost = postsResult.data.cost;
		metrics.estimatedTokensUsed = postsResult.data.posts.linkedinPost ? 
			(postsResult.data.posts.linkedinPost.full?.length || 0) / 4 + 
			(postsResult.data.posts.xPost?.full?.length || 0) / 4 : 0;

		console.log(`✅ Generated ${postsResult.data.postIds.length} posts in ${formatDuration(postsResult.data.duration)}`);
		console.log(`💰 Cost: ${formatCost(postsResult.data.cost)}`);

		// Update insight status to indicate posts have been generated
		const statusResult = updateInsightStatus(insight.id, 'needs_review');
		if (!statusResult.success) {
			console.log('⚠️ Failed to update insight status');
		}

		// Debug saving
		if (options.enableDebugSaving) {
			saveToDebugFile('generated-posts', {
				insight: insight.title,
				posts: postsResult.data.posts,
				metadata: {
					duration: postsResult.data.duration,
					cost: postsResult.data.cost,
					postIds: postsResult.data.postIds
				}
			});
		}

		metrics.success = true;
		return metrics;

	} catch (error) {
		metrics.error = error instanceof Error ? error.message : 'Unknown error';
		console.log(`❌ Failed to process "${insight.title}": ${metrics.error}`);
		return metrics;
	} finally {
		metrics.endTime = Date.now();
		metrics.duration = metrics.duration || (metrics.endTime - startTime);
	}
};

/**
 * Processes insights in parallel batches
 */
const processInsightsBatch = async (
	insights: InsightRecord[],
	config: AppConfig,
	options: PostGenerationOptions
): Promise<PostGenerationMetrics[]> => {
	const batchSize = options.batchSize || 3;
	const allMetrics: PostGenerationMetrics[] = [];

	console.log(`⚡ Processing ${insights.length} insights in batches of ${batchSize}`);

	for (let i = 0; i < insights.length; i += batchSize) {
		const batch = insights.slice(i, i + batchSize);
		
		console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} insights)`);

		// Process batch in parallel
		const batchPromises = batch.map(insight => 
			processInsightForPosts(insight, config, options)
		);

		const batchMetrics = await Promise.all(batchPromises);
		allMetrics.push(...batchMetrics);

		// Brief pause between batches to avoid overwhelming the API
		if (i + batchSize < insights.length) {
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	}

	return allMetrics;
};

/**
 * Main post generation workflow
 */
export const generatePostsWorkflow = async (
	config: AppConfig,
	options: PostGenerationOptions = {}
): Promise<Result<PostGenerationResults>> => {
	try {
		// Initialize database
		initDatabase();

		// Get approved insights ready for post generation
		const insightsResult = getInsights({
			status: 'approved',
			sortBy: 'total_score',
			sortOrder: 'DESC',
			limit: 50 // Reasonable limit for post generation
		});

		if (!insightsResult.success) {
			return insightsResult;
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
					},
				},
			};
		}

		console.log(`📋 Found ${readyInsights.length} approved insights for post generation`);

		// Process insights
		const metrics = await processInsightsBatch(readyInsights, config, options);

		// Calculate summary
		const successful = metrics.filter(m => m.success).length;
		const failed = metrics.length - successful;
		const totalDuration = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
		const totalCost = metrics.reduce((sum, m) => sum + m.estimatedCost, 0);
		const totalTokens = metrics.reduce((sum, m) => sum + m.estimatedTokensUsed, 0);

		// Save session summary if enabled
		if (options.enableDebugSaving) {
			const sessionSummary = createMetricsSummary(metrics);
			saveToDebugFile('post-generation-session', sessionSummary);
		}

		return {
			success: true,
			data: {
				metrics,
				summary: {
					successful,
					failed,
					totalDuration,
					totalCost,
					totalTokens,
				},
			},
		};

	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
};