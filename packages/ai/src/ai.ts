import type {
	AIConfig,
	GeneratedPost,
	Insight,
	PostType,
	Result,
} from "@content-creation/shared";
import {
	createTranscript,
	createInsight,
	createPost,
	type CreateTranscriptData,
	type CreateInsightData,
	type CreatePostData
} from "@content-creation/database";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Functional AI operations
 */

/**
 * Creates AI client and models
 */
export const createAIClient = (config: AIConfig) => {
	const genAI = new GoogleGenerativeAI(config.apiKey);
	return {
		flashModel: genAI.getGenerativeModel({ model: config.flashModel }),
		proModel: genAI.getGenerativeModel({ model: config.proModel }),
	};
};

/**
 * Estimates token usage (rough approximation: 4 characters ≈ 1 token)
 */
export const estimateTokens = (text: string): number =>
	Math.ceil(text.length / 4);

/**
 * Estimates cost for Gemini models
 */
export const estimateCost = (
	inputTokens: number,
	outputTokens: number,
	modelType: "flash" | "pro",
): number => {
	const rates = {
		flash: { input: 0.075 / 1000000, output: 0.3 / 1000000 },
		pro: { input: 1.25 / 1000000, output: 5.0 / 1000000 },
	};

	const rate = rates[modelType];
	return inputTokens * rate.input + outputTokens * rate.output;
};

/**
 * Cleans transcript content and saves to database
 */
export const cleanTranscript = async (
	flashModel: any,
	prompt: string,
	transcriptId: string,
	title: string
): Promise<Result<{ cleanedTranscriptId: string; cleanedText: string; duration: number; cost: number }>> => {
	const startTime = Date.now();

	try {
		const result = await flashModel.generateContent(prompt, {
			generationConfig: {
				maxOutputTokens: 8192,
				temperature: 0.1,
			},
		});

		const response = await result.response;
		const cleanedText = response.text();

		const duration = Date.now() - startTime;
		const inputTokens = estimateTokens(prompt);
		const outputTokens = estimateTokens(cleanedText);
		const cost = estimateCost(inputTokens, outputTokens, "flash");

		// Save cleaned transcript to database
		const { getDatabase } = await import('@content-creation/database');
		const db = getDatabase();
		const cleanedTranscriptId = `cleaned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const now = new Date().toISOString();

		const stmt = db.prepare(`
			INSERT INTO cleaned_transcripts (id, transcript_id, title, content, processing_duration_ms, estimated_tokens, estimated_cost, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			cleanedTranscriptId,
			transcriptId,
			title,
			cleanedText,
			duration,
			outputTokens,
			cost,
			now,
			now
		);

		return {
			success: true,
			data: { cleanedTranscriptId, cleanedText, duration, cost },
		};
	} catch (error) {
		return {
			success: false,
			error: error as Error,
		};
	}
};

/**
 * Extracts insights from cleaned transcript and saves to database
 */
export const extractInsights = async (
	proModel: any,
	prompt: string,
	cleanedTranscriptId: string
): Promise<Result<{ insightIds: string[]; insights: Insight[]; duration: number; cost: number }>> => {
	const startTime = Date.now();

	try {
		const result = await proModel.generateContent(prompt, {
			generationConfig: {
				maxOutputTokens: 8192,
				temperature: 0.3,
				responseMimeType: "application/json",
			},
		});

		const response = await result.response;
		let text = response.text();

		// Remove markdown code block wrapping if present
		if (text.startsWith("```json")) {
			text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
		} else if (text.startsWith("```")) {
			text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");
		}

		const jsonResponse = JSON.parse(text);
		const insights = parseJsonInsights(jsonResponse);

		const duration = Date.now() - startTime;
		const inputTokens = estimateTokens(prompt);
		const outputTokens = estimateTokens(text);
		const cost = estimateCost(inputTokens, outputTokens, "pro");

		// Save insights to database
		const insightIds: string[] = [];
		for (const insight of insights) {
			const insightData: CreateInsightData = {
				cleanedTranscriptId,
				title: insight.title,
				summary: insight.summary,
				verbatimQuote: insight.quote,
				category: insight.category,
				postType: insight.postType as PostType,
				urgencyScore: insight.scores.urgency,
				relatabilityScore: insight.scores.relatability,
				specificityScore: insight.scores.specificity,
				authorityScore: insight.scores.authority,
				processingDurationMs: duration / insights.length, // Distribute duration across insights
				estimatedTokens: Math.round(outputTokens / insights.length),
				estimatedCost: cost / insights.length
			};

			const createResult = createInsight(insightData);
			if (createResult.success) {
				insightIds.push(createResult.data.id);
			}
		}

		return {
			success: true,
			data: { insightIds, insights, duration, cost },
		};
	} catch (error) {
		return {
			success: false,
			error: error as Error,
		};
	}
};

/**
 * Generates social media posts from insight and saves to database
 */
export const generatePosts = async (
	proModel: any,
	prompt: string,
	insightId: string,
	insightTitle: string
): Promise<
	Result<{ postIds: string[]; posts: GeneratedPost; duration: number; cost: number }>
> => {
	const startTime = Date.now();

	try {
		const result = await proModel.generateContent(prompt, {
			generationConfig: {
				maxOutputTokens: 4096,
				temperature: 0.3,
				responseMimeType: "application/json",
			},
		});

		const response = await result.response;
		let text = response.text();

		// Remove markdown code block wrapping if present
		if (text.startsWith("```json")) {
			text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
		} else if (text.startsWith("```")) {
			text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");
		}

		const jsonResponse = JSON.parse(text);
		const posts: GeneratedPost = {
			linkedinPost: {
				hook: jsonResponse.linkedinPost?.hook || "Failed to generate hook",
				body: jsonResponse.linkedinPost?.body || "Failed to generate body",
				cta: jsonResponse.linkedinPost?.cta || "Failed to generate CTA",
				full: jsonResponse.linkedinPost?.full || "Failed to generate full post",
			},
			xPost: {
				hook: jsonResponse.xPost?.hook || "Failed to generate hook",
				body: jsonResponse.xPost?.body || "Failed to generate body",
				cta: jsonResponse.xPost?.cta || "Failed to generate CTA",
				full: jsonResponse.xPost?.full || "Failed to generate full post",
			},
		};

		const duration = Date.now() - startTime;
		const inputTokens = estimateTokens(prompt);
		const outputTokens = estimateTokens(text);
		const cost = estimateCost(inputTokens, outputTokens, "pro");

		// Save posts to database
		const postIds: string[] = [];

		// Create LinkedIn post
		if (posts.linkedinPost) {
			const linkedinPostData: CreatePostData = {
				insightId,
				title: `${insightTitle} (LinkedIn)`,
				platform: 'linkedin',
				hook: posts.linkedinPost.hook,
				body: posts.linkedinPost.body,
				softCta: posts.linkedinPost.cta,
				processingDurationMs: duration / 2,
				estimatedTokens: Math.round(outputTokens / 2),
				estimatedCost: cost / 2
			};

			const linkedinResult = createPost(linkedinPostData);
			if (linkedinResult.success) {
				postIds.push(linkedinResult.data.id);
			}
		}

		// Create X post  
		if (posts.xPost) {
			const xPostData: CreatePostData = {
				insightId,
				title: `${insightTitle} (X)`,
				platform: 'x',
				hook: posts.xPost.hook,
				body: posts.xPost.body,
				softCta: posts.xPost.cta,
				processingDurationMs: duration / 2,
				estimatedTokens: Math.round(outputTokens / 2),
				estimatedCost: cost / 2
			};

			const xResult = createPost(xPostData);
			if (xResult.success) {
				postIds.push(xResult.data.id);
			}
		}

		return {
			success: true,
			data: { postIds, posts, duration, cost },
		};
	} catch (error) {
		return {
			success: false,
			error: error as Error,
		};
	}
};

/**
 * Parses JSON insights response into typed objects
 */
const parseJsonInsights = (jsonResponse: any): Insight[] => {
	const insights: Insight[] = [];

	if (!jsonResponse.insights || !Array.isArray(jsonResponse.insights)) {
		return insights;
	}

	for (const item of jsonResponse.insights) {
		const insight: Insight = {
			title: item.title || "Untitled",
			quote: item.verbatimQuote || "",
			summary: item.summary || "",
			category: item.category || "Unknown",
			scores: {
				urgency: item.scores?.urgency || 0,
				relatability: item.scores?.relatability || 0,
				specificity: item.scores?.specificity || 0,
				authority: item.scores?.authority || 0,
				total: item.scores?.total || 0,
			},
			postType: item.postType || "Problem",
		};
		insights.push(insight);
	}

	return insights;
};
