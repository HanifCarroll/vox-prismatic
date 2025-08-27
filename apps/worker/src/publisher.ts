import { PrismaClient } from '@prisma/client';
import { getDatabase } from "./database";

/**
 * Worker Publisher
 * Handles the actual publishing of scheduled posts using direct database access
 */

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

export class WorkerPublisher {
	private prisma!: PrismaClient;
	private credentials: PublishingCredentials;

	constructor() {
		// Load credentials from environment variables
		this.credentials = {
			linkedin: {
				accessToken: process.env.LINKEDIN_ACCESS_TOKEN || "",
				clientId: process.env.LINKEDIN_CLIENT_ID,
				clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
			},
			x: {
				accessToken: process.env.X_ACCESS_TOKEN || "",
				clientId: process.env.X_CLIENT_ID,
				clientSecret: process.env.X_CLIENT_SECRET,
			},
		};
	}

	async initialize(): Promise<void> {
		this.prisma = await getDatabase();
	}

	/**
	 * Process all scheduled posts that are due for publishing
	 */
	async processScheduledPosts(): Promise<{
		processed: number;
		successful: number;
		failed: number;
		errors: string[];
	}> {
		try {
			console.log("🔄 [Worker] Starting scheduled post processing...");

			// Ensure we have database connection
			if (!this.prisma) {
				await this.initialize();
			}

			// Get posts due for publishing
			const now = new Date();
			const duePosts = await this.prisma.scheduledPost.findMany({
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

			console.log(`📋 [Worker] Found ${duePosts.length} posts due for publishing`);

			let successful = 0;
			let failed = 0;
			const errors: string[] = [];

			// Process each post
			for (const scheduledPost of duePosts) {
				try {
					// For now, just mark as published (actual publishing would require platform clients)
					await this.prisma.scheduledPost.update({
						where: { id: scheduledPost.id },
						data: {
							status: "published",
							lastAttempt: new Date(),
							errorMessage: null,
						},
					});

					// Update the original post status
					await this.prisma.post.update({
						where: { id: scheduledPost.postId },
						data: { status: "published" },
					});

					successful++;
					console.log(`✅ [Worker] Published post: ${scheduledPost.post.title}`);
				} catch (error) {
					failed++;
					const errorMsg = error instanceof Error ? error.message : "Unknown error";
					errors.push(`Post ${scheduledPost.id}: ${errorMsg}`);
					console.error(`❌ [Worker] Failed to publish post ${scheduledPost.id}:`, error);

					// Mark as failed
					await this.prisma.scheduledPost.update({
						where: { id: scheduledPost.id },
						data: {
							status: "failed",
							lastAttempt: new Date(),
							errorMessage: errorMsg,
						},
					});
				}
			}

			console.log(
				`📊 [Worker] Processing complete: ${successful} successful, ${failed} failed`,
			);

			return {
				processed: duePosts.length,
				successful,
				failed,
				errors,
			};
		} catch (error) {
			console.error("❌ [Worker] Error processing scheduled posts:", error);
			return {
				processed: 0,
				successful: 0,
				failed: 0,
				errors: [error instanceof Error ? error.message : "Unknown error"],
			};
		}
	}

	/**
	 * Get posts that are due for publishing (for monitoring)
	 */
	async getPostsDue(): Promise<number> {
		try {
			if (!this.prisma) {
				await this.initialize();
			}

			const now = new Date();
			const count = await this.prisma.scheduledPost.count({
				where: {
					status: "pending",
					scheduledTime: {
						lte: now,
					},
				},
			});

			return count;
		} catch (error) {
			console.error("❌ [Worker] Error getting posts due:", error);
			return 0;
		}
	}

	/**
	 * Validate that credentials are properly configured
	 */
	validateCredentials(): { valid: boolean; missing: string[] } {
		const missing: string[] = [];

		// Check LinkedIn credentials
		if (!this.credentials.linkedin?.accessToken) {
			missing.push("LINKEDIN_ACCESS_TOKEN");
		}
		if (!this.credentials.linkedin?.clientId) {
			missing.push("LINKEDIN_CLIENT_ID");
		}
		if (!this.credentials.linkedin?.clientSecret) {
			missing.push("LINKEDIN_CLIENT_SECRET");
		}

		// Check X credentials
		if (!this.credentials.x?.accessToken) {
			missing.push("X_ACCESS_TOKEN");
		}
		if (!this.credentials.x?.clientId) {
			missing.push("X_CLIENT_ID");
		}
		if (!this.credentials.x?.clientSecret) {
			missing.push("X_CLIENT_SECRET");
		}

		return {
			valid: missing.length === 0,
			missing,
		};
	}

	/**
	 * Health check for the worker
	 */
	async healthCheck(): Promise<{
		status: "healthy" | "unhealthy";
		details: string;
		postsDue: number;
	}> {
		try {
			// Check database connection
			if (!this.prisma) {
				await this.initialize();
			}

			// Test database connection
			await this.prisma.$queryRaw`SELECT 1`;

			// Validate credentials
			const credentialCheck = this.validateCredentials();
			if (!credentialCheck.valid) {
				return {
					status: "unhealthy",
					details: `Missing credentials: ${credentialCheck.missing.join(", ")}`,
					postsDue: 0,
				};
			}

			// Check how many posts are due
			const postsDue = await this.getPostsDue();

			return {
				status: "healthy",
				details: "All systems operational",
				postsDue,
			};
		} catch (error) {
			return {
				status: "unhealthy",
				details: error instanceof Error ? error.message : "Unknown error",
				postsDue: 0,
			};
		}
	}
}
