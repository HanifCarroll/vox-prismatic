import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LinkedInService } from "../linkedin";
import { XService } from "../x";
import { Platform } from "../integrations";
import { PrismaService } from "../database/prisma.service";
import { RateLimiterService } from "../../common/services/rate-limiter.service";
import { ProcessScheduledPostsDto, PublishImmediateDto } from "./dto";
import {
	ImmediatePublishResultEntity,
	PublisherStatusEntity,
	PublishQueueEntity,
	PublishQueueItemEntity,
	PublishResultEntity,
	RetryPublishResultEntity,
} from "./entities";
import {
	PUBLICATION_EVENTS,
	type PostPublishedEvent,
	type PostPublicationFailedEvent,
	type PostPublicationRetriedEvent,
	type PostPublicationPermanentlyFailedEvent
} from './events/publication.events';

interface PublishingCredentials {
	linkedin?: {
		accessToken: string;
		clientId?: string;
		clientSecret?: string;
	};
	x?: {
		accessToken: string;
		clientId?: string;
		clientSecret?: string;
	};
}

interface PublishResult {
	success: boolean;
	externalPostId?: string;
	error?: string;
	platform: Platform;
}

@Injectable()
export class PublisherService {
	private readonly logger = new Logger(PublisherService.name);

	constructor(
		private readonly configService: ConfigService,
		private readonly prisma: PrismaService,
		private readonly linkedInService: LinkedInService,
		private readonly xService: XService,
		private readonly rateLimiter: RateLimiterService,
		private readonly eventEmitter: EventEmitter2,
	) {}

	/**
	 * Publish a post to LinkedIn
	 */
	private async publishToLinkedIn(
		content: string,
		credentials: { accessToken: string },
	): Promise<{ success: boolean; externalPostId?: string; error?: Error }> {
		try {
			this.logger.log("Publishing to LinkedIn...");

			// Set the access token for this request
			this.linkedInService.setAccessToken(credentials.accessToken);

			// Check if properly authenticated
			if (!this.linkedInService.isAuthenticated) {
				return {
					success: false,
					error: new Error("LinkedIn authentication failed"),
				};
			}

			// Create the post
			const postResult = await this.linkedInService.post(content, { visibility: "PUBLIC" });
			if (!postResult.success) {
				return {
					success: false,
					error: new Error('LinkedIn publishing failed'),
				};
			}

			this.logger.log("Published to LinkedIn successfully");
			return {
				success: true,
				externalPostId: postResult.data.id,
			};
		} catch (error) {
			this.logger.error("LinkedIn publishing failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	}

	/**
	 * Publish a post to X (Twitter)
	 */
	private async publishToX(
		content: string,
		credentials: { accessToken: string },
	): Promise<{ success: boolean; externalPostId?: string; error?: Error }> {
		try {
			this.logger.log("Publishing to X...");

			// Set the access token for this request
			this.xService.setAccessToken(credentials.accessToken);

			// Check if properly authenticated
			if (!this.xService.isAuthenticated) {
				return {
					success: false,
					error: new Error("X authentication failed"),
				};
			}

			// Use the helper function to handle long content
			const result = await this.xService.createPostOrThread(content);
			if (!result.success) {
				return {
					success: false,
					error: new Error('X publishing failed'),
				};
			}

			// Handle both single tweet and thread responses
			let externalPostId: string;
			if (Array.isArray(result.data)) {
				// Thread - use the first tweet's ID
				externalPostId = result.data[0].id;
			} else {
				// Single tweet
				externalPostId = result.data.id;
			}

			this.logger.log("Published to X successfully");
			return {
				success: true,
				externalPostId,
			};
		} catch (error) {
			this.logger.error("X publishing failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	}

	/**
	 * Get all scheduled posts that are due for publishing
	 */
	private async getPostsDueForPublishing(): Promise<Array<any>> {
		const now = new Date();

		const posts = await this.prisma.scheduledPost.findMany({
			where: {
				status: "pending",
				scheduledTime: {
					lte: now,
				},
			},
			include: {
				post: true,
			},
		});

		return posts;
	}

	/**
	 * Publish a scheduled post to the specified platform
	 */
	async publishScheduledPost(
		scheduledPostId: string,
		credentials: PublishingCredentials,
	): Promise<PublishResult> {
		try {
			// Get the scheduled post
			const scheduledPost = await this.prisma.scheduledPost.findUnique({
				where: { id: scheduledPostId },
				include: { post: true },
			});

			if (!scheduledPost) {
				return {
					success: false,
					error: `Scheduled post not found: ${scheduledPostId}`,
					platform: "linkedin",
				};
			}

			// Check if post is ready to be published
			if (scheduledPost.status !== "pending") {
				return {
					success: false,
					error: `Post status is ${scheduledPost.status}, cannot publish`,
					platform: scheduledPost.platform as Platform,
				};
			}

			let publishResult: {
				success: boolean;
				externalPostId?: string;
				error?: Error;
			};

			// Publish to the appropriate platform
			if (scheduledPost.platform === "linkedin") {
				if (!credentials.linkedin) {
					return {
						success: false,
						error: "LinkedIn credentials not provided",
						platform: "linkedin",
					};
				}
				publishResult = await this.publishToLinkedIn(
					scheduledPost.content,
					credentials.linkedin,
				);
			} else if (scheduledPost.platform === "x") {
				if (!credentials.x) {
					return {
						success: false,
						error: "X credentials not provided",
						platform: "x",
					};
				}
				publishResult = await this.publishToX(
					scheduledPost.content,
					credentials.x,
				);
			} else {
				return {
					success: false,
					error: `Unsupported platform: ${scheduledPost.platform}`,
					platform: scheduledPost.platform as Platform,
				};
			}

			// Emit event based on the result instead of direct DB update
			if (publishResult.success) {
				// Emit publication success event
				this.eventEmitter.emit(PUBLICATION_EVENTS.PUBLISHED, {
					scheduledPostId,
					postId: scheduledPost.postId,
					platform: scheduledPost.platform as Platform,
					externalPostId: publishResult.externalPostId!,
					publishedAt: new Date(),
					content: scheduledPost.content,
					timestamp: new Date()
				} as PostPublishedEvent);

				this.logger.log(`Emitted publication success event for scheduled post: ${scheduledPostId}`);

				return {
					success: true,
					externalPostId: publishResult.externalPostId,
					platform: scheduledPost.platform as Platform,
				};
			} else {
				// Handle publication failure with events
				const newRetryCount = scheduledPost.retryCount + 1;
				const maxRetries = 3;
				const willRetry = newRetryCount < maxRetries;
				const error = publishResult.error?.message || "Publishing failed";

				if (willRetry) {
					// Emit retry event
					this.eventEmitter.emit(PUBLICATION_EVENTS.FAILED, {
						scheduledPostId,
						postId: scheduledPost.postId,
						platform: scheduledPost.platform as Platform,
						error,
						retryCount: newRetryCount,
						maxRetries,
						willRetry: true,
						failedAt: new Date(),
						timestamp: new Date()
					} as PostPublicationFailedEvent);

					this.logger.log(`Emitted publication failed event (will retry) for scheduled post: ${scheduledPostId}`);
				} else {
					// Emit permanent failure event
					this.eventEmitter.emit(PUBLICATION_EVENTS.PERMANENTLY_FAILED, {
						scheduledPostId,
						postId: scheduledPost.postId,
						platform: scheduledPost.platform as Platform,
						finalError: error,
						totalAttempts: newRetryCount,
						firstFailedAt: new Date(), // Would need to track this properly
						permanentlyFailedAt: new Date(),
						timestamp: new Date()
					} as PostPublicationPermanentlyFailedEvent);

					this.logger.log(`Emitted permanent publication failure event for scheduled post: ${scheduledPostId}`);
				}

				return {
					success: false,
					error,
					platform: scheduledPost.platform as Platform,
				};
			}
		} catch (error) {
			this.logger.error(
				`Failed to publish scheduled post ${scheduledPostId}:`,
				error,
			);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				platform: "linkedin",
			};
		}
	}

	async processScheduledPosts(
		credentials: ProcessScheduledPostsDto,
	): Promise<PublishResultEntity> {
		this.logger.log("Processing scheduled posts");

		try {
			// Build credentials object
			const formattedCredentials: PublishingCredentials = {
				linkedin: credentials.linkedin
					? {
							accessToken:
								credentials.linkedin.accessToken ||
								this.configService.get<string>("LINKEDIN_ACCESS_TOKEN") ||
								"",
							clientId: this.configService.get<string>("LINKEDIN_CLIENT_ID"),
							clientSecret: this.configService.get<string>(
								"LINKEDIN_CLIENT_SECRET",
							),
						}
					: undefined,
				x: credentials.x
					? {
							accessToken:
								credentials.x.accessToken ||
								this.configService.get<string>("X_ACCESS_TOKEN") ||
								"",
							clientId: this.configService.get<string>("X_CLIENT_ID"),
							clientSecret: this.configService.get<string>("X_CLIENT_SECRET"),
						}
					: undefined,
			};

			const postsDue = await this.getPostsDueForPublishing();
			this.logger.log(`Found ${postsDue.length} posts due for publishing`);

			if (postsDue.length === 0) {
				return {
					processed: 0,
					successful: 0,
					failed: 0,
					errors: [],
					timestamp: new Date().toISOString(),
				};
			}

			let successful = 0;
			let failed = 0;
			const errors: string[] = [];

			// Process each post with rate limiting
			for (const scheduledPost of postsDue) {
				this.logger.log(
					`Publishing post ${scheduledPost.id} to ${scheduledPost.platform}...`,
				);

				// Wait for rate limit before attempting
				await this.rateLimiter.waitForRateLimit(scheduledPost.platform, 0);

				let attemptNumber = 0;
				let published = false;
				let lastError: string | undefined;

				// Retry loop with exponential backoff
				while (attemptNumber < 3 && !published) {
					try {
						const result = await this.publishScheduledPost(
							scheduledPost.id,
							formattedCredentials,
						);

						if (result.success) {
							this.logger.log(
								`Successfully published ${scheduledPost.id} to ${scheduledPost.platform}`,
							);
							successful++;
							published = true;
						} else {
							lastError = result.error;
							
							// Check if we should retry
							const shouldRetry = await this.rateLimiter.handleRateLimitError(
								scheduledPost.platform,
								attemptNumber,
								{ message: result.error }
							);
							
							if (!shouldRetry) {
								break;
							}
						}
					} catch (error: any) {
						lastError = error?.message || 'Unknown error';
						
						// Check if we should retry
						const shouldRetry = await this.rateLimiter.handleRateLimitError(
							scheduledPost.platform,
							attemptNumber,
							error
						);
						
						if (!shouldRetry) {
							break;
						}
					}
					
					attemptNumber++;
				}

				if (!published) {
					this.logger.error(
						`Failed to publish ${scheduledPost.id} after ${attemptNumber} attempts: ${lastError}`,
					);
					failed++;
					errors.push(`${scheduledPost.id}: ${lastError}`);
				}

				// Add optimal delay between posts
				const delay = this.rateLimiter.getOptimalDelay(scheduledPost.platform);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}

			return {
				processed: postsDue.length,
				successful,
				failed,
				errors,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			this.logger.error("Error processing scheduled posts:", error);
			throw new BadRequestException("Failed to process scheduled posts");
		}
	}

	async getPublishingQueue(): Promise<PublishQueueEntity> {
		this.logger.log("Getting publishing queue");

		try {
			const postsDue = await this.getPostsDueForPublishing();

			const posts: PublishQueueItemEntity[] = postsDue.map((scheduledPost) => ({
				id: scheduledPost.id,
				postId: scheduledPost.postId,
				platform: scheduledPost.platform,
				content: scheduledPost.content,
				scheduledTime: scheduledPost.scheduledTime.toISOString(),
				status: scheduledPost.status,
			}));

			return {
				postsDue: posts.length,
				posts: posts,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			this.logger.error("Failed to get publishing queue:", error);
			throw new BadRequestException("Failed to get publishing queue");
		}
	}

	async retryScheduledPost(
		scheduledPostId: string,
		credentials: ProcessScheduledPostsDto,
	): Promise<RetryPublishResultEntity> {
		this.logger.log(`Retrying scheduled post: ${scheduledPostId}`);

		try {
			// Build credentials object
			const formattedCredentials: PublishingCredentials = {
				linkedin: credentials.linkedin
					? {
							accessToken:
								credentials.linkedin.accessToken ||
								this.configService.get<string>("LINKEDIN_ACCESS_TOKEN") ||
								"",
							clientId: this.configService.get<string>("LINKEDIN_CLIENT_ID"),
							clientSecret: this.configService.get<string>(
								"LINKEDIN_CLIENT_SECRET",
							),
						}
					: undefined,
				x: credentials.x
					? {
							accessToken:
								credentials.x.accessToken ||
								this.configService.get<string>("X_ACCESS_TOKEN") ||
								"",
							clientId: this.configService.get<string>("X_CLIENT_ID"),
							clientSecret: this.configService.get<string>("X_CLIENT_SECRET"),
						}
					: undefined,
			};

			// Attempt to publish the specific post
			const result = await this.publishScheduledPost(
				scheduledPostId,
				formattedCredentials,
			);

			if (result.success) {
				return {
					scheduledPostId,
					externalPostId: result.externalPostId,
					platform: result.platform,
					timestamp: new Date().toISOString(),
				};
			} else {
				throw new BadRequestException(result.error || "Failed to retry post");
			}
		} catch (error) {
			this.logger.error("Failed to retry scheduled post:", error);
			throw error;
		}
	}

	async getPublisherStatus(): Promise<PublisherStatusEntity> {
		this.logger.log("Getting publisher status");

		try {
			// Check how many posts are due
			const postsDue = await this.getPostsDueForPublishing();

			// Basic health status
			const status: PublisherStatusEntity = {
				api: {
					status: "healthy",
					timestamp: new Date().toISOString(),
				},
				queue: {
					postsDue: postsDue.length,
					healthy: true,
				},
				credentials: {
					linkedin: {
						configured: !!(
							this.configService.get<string>("LINKEDIN_ACCESS_TOKEN") &&
							this.configService.get<string>("LINKEDIN_CLIENT_ID") &&
							this.configService.get<string>("LINKEDIN_CLIENT_SECRET")
						),
					},
					x: {
						configured: !!(
							this.configService.get<string>("X_ACCESS_TOKEN") &&
							this.configService.get<string>("X_CLIENT_ID") &&
							this.configService.get<string>("X_CLIENT_SECRET")
						),
					},
				},
			};

			return status;
		} catch (error) {
			this.logger.error("Failed to get publisher status:", error);
			throw new BadRequestException("Failed to get publisher status");
		}
	}

	async publishImmediately(
		publishDto: PublishImmediateDto,
	): Promise<ImmediatePublishResultEntity> {
		this.logger.log(
			`Immediate publishing requested for post ${publishDto.postId} on ${publishDto.platform}`,
		);

		try {
			let publishResult: {
				success: boolean;
				externalPostId?: string;
				error?: Error;
			};

			if (publishDto.platform === "linkedin") {
				publishResult = await this.publishToLinkedIn(publishDto.content, {
					accessToken: publishDto.accessToken,
				});
			} else if (publishDto.platform === "x") {
				publishResult = await this.publishToX(publishDto.content, {
					accessToken: publishDto.accessToken,
				});
			} else {
				throw new BadRequestException(
					`Unsupported platform: ${publishDto.platform}`,
				);
			}

			if (publishResult.success) {
				return {
					postId: publishDto.postId,
					externalPostId: publishResult.externalPostId,
					platform: publishDto.platform,
					timestamp: new Date().toISOString(),
				};
			} else {
				throw new BadRequestException(
					publishResult.error?.message || "Publishing failed",
				);
			}
		} catch (error) {
			this.logger.error("Immediate publishing failed:", error);
			throw error;
		}
	}
}
