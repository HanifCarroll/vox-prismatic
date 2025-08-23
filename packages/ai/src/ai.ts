import type {
	AIConfig,
	GeneratedPost,
	Insight,
	Result,
} from "@content-creation/shared";
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
 * Cleans transcript content
 */
export const cleanTranscript = async (
	flashModel: any,
	prompt: string,
): Promise<Result<{ cleanedText: string; duration: number; cost: number }>> => {
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

		return {
			success: true,
			data: { cleanedText, duration, cost },
		};
	} catch (error) {
		return {
			success: false,
			error: error as Error,
		};
	}
};

/**
 * Extracts insights from cleaned transcript
 */
export const extractInsights = async (
	proModel: any,
	prompt: string,
): Promise<Result<{ insights: Insight[]; duration: number; cost: number }>> => {
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

		return {
			success: true,
			data: { insights, duration, cost },
		};
	} catch (error) {
		return {
			success: false,
			error: error as Error,
		};
	}
};

/**
 * Generates social media posts from insight
 */
export const generatePosts = async (
	proModel: any,
	prompt: string,
): Promise<
	Result<{ posts: GeneratedPost; duration: number; cost: number }>
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

		return {
			success: true,
			data: { posts, duration, cost },
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
