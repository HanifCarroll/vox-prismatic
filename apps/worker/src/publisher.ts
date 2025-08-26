import {
	PublisherService,
	type PublishingCredentials,
} from "../../api-hono/src/services/publisher";
import { getDatabase } from "./database";

/**
 * Worker Publisher
 * Handles the actual publishing of scheduled posts using the existing PublisherService
 */

export class WorkerPublisher {
	private publisherService: PublisherService;
	private credentials: PublishingCredentials;

	constructor() {
		this.publisherService = new PublisherService();

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

			// Verify database connection
			getDatabase();

			// Use the existing PublisherService to process posts
			const result = await this.publisherService.processScheduledPosts(
				this.credentials,
			);

			console.log(
				`📊 [Worker] Processing complete: ${result.successful} successful, ${result.failed} failed`,
			);

			return result;
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
			const result = await this.publisherService.getPostsDueForPublishing();
			if (result.success) {
				return result.data.length;
			}
			return 0;
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
			getDatabase();

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
