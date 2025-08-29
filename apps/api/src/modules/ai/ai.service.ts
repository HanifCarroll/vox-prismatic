import { GoogleGenerativeAI } from "@google/generative-ai";
import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/prisma.service";
import { PromptsService } from "../prompts/prompts.service";
import { IdGeneratorService } from "../shared/services/id-generator.service";
import { TranscriptStateService } from "../transcripts/services/transcript-state.service";
import { InsightStateService } from "../insights/services/insight-state.service";
import { classifyGoogleAIError } from "./errors/ai-errors";
import { PostStatus, Platform } from '@content-creation/types';
import type {
	CleanTranscriptDto,
	ExtractInsightsDto,
	GeneratePostsDto,
} from "./dto";
import type {
	CleanTranscriptResultEntity,
	ExtractInsightsResultEntity,
	GeneratedPostEntity,
	GeneratePostsResultEntity,
	InsightEntity,
} from "./entities";

@Injectable()
export class AIService implements OnModuleDestroy {
	private readonly logger = new Logger(AIService.name);
	private genAI: GoogleGenerativeAI | null = null;
	private flashModel: any = null;
	private proModel: any = null;
	private readonly apiKey: string;

	constructor(
		private readonly configService: ConfigService,
		private readonly prisma: PrismaService,
		private readonly idGenerator: IdGeneratorService,
		private readonly promptsService: PromptsService,
		private readonly transcriptStateService: TranscriptStateService,
		private readonly insightStateService: InsightStateService,
	) {
		const apiKey = this.configService.get<string>("GOOGLE_AI_API_KEY");
		if (!apiKey) {
			throw new Error("GOOGLE_AI_API_KEY is not configured");
		}
		this.apiKey = apiKey;
	}

	/**
	 * Lazy initialization of AI models
	 */
	private getFlashModel() {
		if (!this.flashModel) {
			if (!this.genAI) {
				this.genAI = new GoogleGenerativeAI(this.apiKey);
			}
			this.flashModel = this.genAI.getGenerativeModel({
				model: this.configService.get<string>(
					"GEMINI_FLASH_MODEL",
					"gemini-1.5-flash",
				),
			});
			this.logger.log('Flash model initialized');
		}
		return this.flashModel;
	}

	private getProModel() {
		if (!this.proModel) {
			if (!this.genAI) {
				this.genAI = new GoogleGenerativeAI(this.apiKey);
			}
			this.proModel = this.genAI.getGenerativeModel({
				model: this.configService.get<string>(
					"GEMINI_PRO_MODEL",
					"gemini-1.5-pro",
				),
			});
			this.logger.log('Pro model initialized');
		}
		return this.proModel;
	}

	/**
	 * Cleanup on module destroy
	 */
	onModuleDestroy() {
		this.flashModel = null;
		this.proModel = null;
		this.genAI = null;
		this.logger.log('AI models cleaned up');
	}

	/**
	 * Estimates token usage (rough approximation: 4 characters ≈ 1 token)
	 */
	private estimateTokens(text: string): number {
		return Math.ceil(text.length / 4);
	}

	/**
	 * Estimates cost for Gemini models
	 */
	private estimateCost(
		inputTokens: number,
		outputTokens: number,
		modelType: "flash" | "pro",
	): number {
		const rates = {
			flash: { input: 0.075 / 1000000, output: 0.3 / 1000000 },
			pro: { input: 1.25 / 1000000, output: 5.0 / 1000000 },
		};

		const rate = rates[modelType];
		return inputTokens * rate.input + outputTokens * rate.output;
	}

	/**
	 * Clean transcript content using AI
	 */
	async cleanTranscript(
		dto: CleanTranscriptDto,
	): Promise<CleanTranscriptResultEntity> {
		const startTime = Date.now();
		this.logger.log(`Cleaning transcript: ${dto.transcriptId}`);

		try {
			// Build the prompt
			const prompt =
				dto.customPrompt ||
				`
Clean the following transcript by:
1. Removing filler words (um, uh, you know, etc.)
2. Correcting grammar and punctuation
3. Organizing into clear paragraphs
4. Preserving the original meaning and tone
5. Keeping important quotes verbatim

Title: ${dto.title}

Transcript:
${dto.content}

Return only the cleaned transcript text, nothing else.`;

			// Generate cleaned content using lazy-loaded model
			const model = this.getFlashModel();
			const result = await model.generateContent(prompt, {
				generationConfig: {
					maxOutputTokens: 8192,
					temperature: 0.1,
				},
			});

			const response = await result.response;
			const cleanedText = response.text();

			const duration = Date.now() - startTime;
			const inputTokens = this.estimateTokens(prompt);
			const outputTokens = this.estimateTokens(cleanedText);
			const cost = this.estimateCost(inputTokens, outputTokens, "flash");

			// First update the cleaned content through repository
			await this.prisma.transcript.update({
				where: { id: dto.transcriptId },
				data: {
					cleanedContent: cleanedText,
					updatedAt: new Date(),
				},
			});

			// Then use state machine to transition status
			await this.transcriptStateService.markCleaned(dto.transcriptId);

			this.logger.log(`Transcript cleaned successfully: ${dto.transcriptId}`);

			return {
				cleanedTranscriptId: dto.transcriptId,
				cleanedText,
				duration,
				cost,
				tokens: outputTokens,
			};
		} catch (error) {
			this.logger.error("Failed to clean transcript:", error);
			throw classifyGoogleAIError(error);
		}
	}

	/**
	 * Extract insights from cleaned transcript
	 */
	async extractInsights(
		dto: ExtractInsightsDto,
	): Promise<ExtractInsightsResultEntity> {
		const startTime = Date.now();
		this.logger.log(`Extracting insights from transcript: ${dto.transcriptId}`);

		try {
			// Build the prompt
			const prompt =
				dto.customPrompt ||
				`
Extract 5-10 key insights from this transcript. For each insight:
1. Create a compelling title
2. Include a verbatim quote that supports it
3. Write a brief summary
4. Categorize it (Technology, Business, Personal Development, etc.)
5. Score it on: urgency (0-10), relatability (0-10), specificity (0-10), authority (0-10)
6. Assign a post type: Problem, Solution, Contrarian, Story, or Educational

Transcript:
${dto.content}

Return as JSON in this exact format:
{
  "insights": [
    {
      "title": "string",
      "verbatimQuote": "string",
      "summary": "string",
      "category": "string",
      "postType": "string",
      "scores": {
        "urgency": number,
        "relatability": number,
        "specificity": number,
        "authority": number,
        "total": number
      }
    }
  ]
}`;

			// Generate insights using lazy-loaded model
			const model = this.getProModel();
			const result = await model.generateContent(prompt, {
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
			const insights = this.parseJsonInsights(jsonResponse);

			const duration = Date.now() - startTime;
			const inputTokens = this.estimateTokens(prompt);
			const outputTokens = this.estimateTokens(text);
			const cost = this.estimateCost(inputTokens, outputTokens, "pro");

			// Use a transaction to ensure atomic creation of all insights
			const insightIds = await this.prisma.$transaction(async (tx) => {
				const ids: string[] = [];

				for (const insight of insights) {
					const insightId = this.idGenerator.generate("insight");

					await tx.insight.create({
						data: {
							id: insightId,
							cleanedTranscriptId: dto.transcriptId,
							title: insight.title,
							summary: insight.summary,
							verbatimQuote: insight.quote,
							category: insight.category,
							postType: insight.postType,
							urgencyScore: insight.scores.urgency,
							relatabilityScore: insight.scores.relatability,
							specificityScore: insight.scores.specificity,
							authorityScore: insight.scores.authority,
							totalScore: insight.scores.total,
							status: "extracted",
							processingDurationMs: Math.round(duration / insights.length),
							estimatedTokens: Math.round(outputTokens / insights.length),
							estimatedCost: cost / insights.length,
							createdAt: new Date(),
							updatedAt: new Date(),
						},
					});

					ids.push(insightId);
				}

				// Update transcript status atomically
				await tx.transcript.update({
					where: { id: dto.transcriptId },
					data: {
						status: "insights_generated",
						updatedAt: new Date(),
					},
				});

				return ids;
			});

			this.logger.log(
				`Extracted ${insights.length} insights from transcript: ${dto.transcriptId}`,
			);

			return {
				insightIds,
				insights,
				duration,
				cost,
			};
		} catch (error) {
			this.logger.error("Failed to extract insights:", error);
			throw classifyGoogleAIError(error);
		}
	}

	/**
	 * Generate social media posts from insight
	 */
	async generatePosts(
		dto: GeneratePostsDto,
	): Promise<GeneratePostsResultEntity> {
		const startTime = Date.now();
		this.logger.log(`Generating posts for insight: ${dto.insightId}`);

		try {
			const platforms = dto.platforms || ["linkedin", "x"];

			// Build the prompt
			const prompt =
				dto.customPrompt ||
				`
Create social media posts based on this insight:

Title: ${dto.insightTitle}
Content: ${dto.content}

Generate posts for: ${platforms.join(", ")}

For LinkedIn:
- Hook: Attention-grabbing opening (1-2 lines)
- Body: Main content with value and details (3-5 paragraphs)
- CTA: Soft call-to-action or question
- Full: Complete post ready to publish (hook + body + CTA)

For X (Twitter):
- Hook: Compelling opener (1 line)
- Body: Core message (2-3 lines)
- CTA: Engagement driver
- Full: Complete tweet (max 280 chars) or thread starter

Return as JSON in this exact format:
{
  "linkedinPost": {
    "hook": "string",
    "body": "string",
    "cta": "string",
    "full": "string"
  },
  "xPost": {
    "hook": "string",
    "body": "string",
    "cta": "string",
    "full": "string"
  }
}`;

			// Generate posts using lazy-loaded model
			const model = this.getProModel();
			const result = await model.generateContent(prompt, {
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
			const posts: GeneratedPostEntity = {
				linkedinPost: jsonResponse.linkedinPost,
				xPost: jsonResponse.xPost,
			};

			const duration = Date.now() - startTime;
			const inputTokens = this.estimateTokens(prompt);
			const outputTokens = this.estimateTokens(text);
			const cost = this.estimateCost(inputTokens, outputTokens, "pro");

			// Save posts to database
			const postIds: string[] = [];

			if (platforms.includes("linkedin") && posts.linkedinPost) {
				const postId = this.idGenerator.generate("post");

				await this.prisma.post.create({
					data: {
						id: postId,
						insightId: dto.insightId,
						title: `${dto.insightTitle} (LinkedIn)`,
						platform: Platform.LINKEDIN,
						content: posts.linkedinPost.full,
						characterCount: posts.linkedinPost.full.length,
						status: PostStatus.DRAFT,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				});

				postIds.push(postId);
			}

			if (platforms.includes("x") && posts.xPost) {
				const postId = this.idGenerator.generate("post");

				await this.prisma.post.create({
					data: {
						id: postId,
						insightId: dto.insightId,
						title: `${dto.insightTitle} (X)`,
						platform: Platform.X,
						content: posts.xPost.full,
						characterCount: posts.xPost.full.length,
						status: PostStatus.DRAFT,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				});

				postIds.push(postId);
			}

			// Use state machine to approve the insight
			await this.insightStateService.approveInsight(dto.insightId);

			this.logger.log(
				`Generated ${postIds.length} posts for insight: ${dto.insightId}`,
			);

			return {
				postIds,
				posts,
				duration,
				cost,
			};
		} catch (error) {
			this.logger.error("Failed to generate posts:", error);
			throw classifyGoogleAIError(error);
		}
	}

	/**
	 * Parse JSON insights response into typed objects
	 */
	private parseJsonInsights(jsonResponse: any): InsightEntity[] {
		const insights: InsightEntity[] = [];

		if (!jsonResponse.insights || !Array.isArray(jsonResponse.insights)) {
			return insights;
		}

		for (const item of jsonResponse.insights) {
			const insight: InsightEntity = {
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
	}

	/**
	 * Generate a title for a transcript using AI
	 */
	async generateTitle(
		transcript: string,
	): Promise<
		| { success: true; data: { title: string } }
		| { success: false; error: Error }
	> {
		try {
			if (!transcript || transcript.trim().length < 10) {
				return {
					success: false,
					error: new Error("Transcript too short to generate title"),
				};
			}

			// Load prompt template
			const promptResult = await this.promptsService.renderTemplate(
				"generate-transcript-title",
				{
					variables: {
						TRANSCRIPT_CONTENT: transcript.substring(0, 2000), // Limit for title generation
					},
				},
			);

			// Generate title using AI
			if (!this.genAI) {
				throw new Error("AI service not initialized");
			}
			const model = this.genAI.getGenerativeModel({
				model:
					this.configService.get<string>("AI_FLASH_MODEL") ||
					"gemini-2.0-flash-exp",
			});

			const result = await model.generateContent(promptResult.rendered);
			const response = result.response;
			const aiTitle = response.text().trim();

			// Validate AI title
			if (aiTitle && aiTitle.length > 0 && aiTitle.length < 100) {
				this.logger.log("AI-generated title:", aiTitle);
				return {
					success: true,
					data: { title: aiTitle },
				};
			}

			return {
				success: false,
				error: new Error("Generated title invalid"),
			};
		} catch (error) {
			this.logger.error("Failed to generate title:", error);
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Unknown error"),
			};
		}
	}
}
