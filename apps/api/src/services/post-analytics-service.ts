import type { Result } from "../types/common";
import { PostRepository, type PostView } from "../repositories/post-repository";
import { ScheduledPostRepository, type ScheduledPostView } from "../repositories/scheduled-post-repository";
import { TranscriptRepository } from "../repositories/transcript-repository";
import { InsightRepository } from "../repositories/insight-repository";

/**
 * Dashboard statistics structure
 */
export interface DashboardStatistics {
	posts: {
		total: number;
		byStatus: Record<string, number>;
		byPlatform: Record<string, number>;
	};
	scheduled: {
		total: number;
		pending: number;
		published: number;
		failed: number;
		upcoming24h: number;
	};
	content: {
		transcripts: number;
		insights: number;
		averagePostsPerInsight: number;
	};
}

/**
 * Activity feed item
 */
export interface ActivityFeedItem {
	id: string;
	type: 'post_created' | 'post_scheduled' | 'post_published' | 'post_failed';
	title: string;
	description: string;
	timestamp: string;
	metadata?: Record<string, any>;
}

/**
 * Post performance metrics
 */
export interface PostPerformanceMetrics {
	postId: string;
	title: string;
	platform: string;
	status: string;
	scheduledTime?: string;
	publishedTime?: string;
	externalPostId?: string;
	retryCount: number;
	engagement?: {
		likes?: number;
		comments?: number;
		shares?: number;
		views?: number;
	};
}

/**
 * PostAnalyticsService - Handles all post analytics and reporting
 * Provides comprehensive statistics, metrics, and dashboard data
 */
export class PostAnalyticsService {
	// Repository dependencies injected via constructor

	constructor(
		private postRepo = new PostRepository(),
		private scheduledRepo = new ScheduledPostRepository(),
		private transcriptRepo = new TranscriptRepository(),
		private insightRepo = new InsightRepository()
	) {}

	/**
	 * Get comprehensive dashboard statistics
	 */
	async getDashboardStatistics(): Promise<Result<DashboardStatistics>> {
		try {
			// Get all the required data in parallel
			const [
				postStatsResult,
				scheduledStatsResult,
				postsResult,
				transcriptStatsResult,
				insightStatsResult
			] = await Promise.all([
				this.postRepo.getStats(),
				this.scheduledRepo.getStats(),
				this.postRepo.findWithRelatedData(),
				this.transcriptRepo.getStats(),
				this.insightRepo.getStats()
			]);

			// Check if any critical operations failed
			if (!postStatsResult.success || !scheduledStatsResult.success) {
				return {
					success: false,
					error: new Error("Failed to get core statistics"),
				};
			}

			// Calculate platform distribution from posts
			const byPlatform: Record<string, number> = {};
			if (postsResult.success) {
				for (const post of postsResult.data) {
					byPlatform[post.platform] = (byPlatform[post.platform] || 0) + 1;
				}
			}

			// Calculate average posts per insight
			let averagePostsPerInsight = 0;
			if (insightStatsResult.success && insightStatsResult.data.total > 0) {
				averagePostsPerInsight = postStatsResult.data.total / insightStatsResult.data.total;
			}

			const statistics: DashboardStatistics = {
				posts: {
					total: postStatsResult.data.total,
					byStatus: postStatsResult.data.byStatus,
					byPlatform,
				},
				scheduled: {
					total: scheduledStatsResult.data.total,
					pending: scheduledStatsResult.data.byStatus.pending || 0,
					published: scheduledStatsResult.data.byStatus.published || 0,
					failed: scheduledStatsResult.data.byStatus.failed || 0,
					upcoming24h: scheduledStatsResult.data.upcoming24h || 0,
				},
				content: {
					transcripts: transcriptStatsResult.success ? transcriptStatsResult.data.total : 0,
					insights: insightStatsResult.success ? insightStatsResult.data.total : 0,
					averagePostsPerInsight: Math.round(averagePostsPerInsight * 10) / 10, // Round to 1 decimal
				},
			};

			return {
				success: true,
				data: statistics,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to get dashboard statistics"),
			};
		}
	}

	/**
	 * Get posts grouped by their current stage/status
	 */
	async getPostsByStage(): Promise<Result<Record<string, PostView[]>>> {
		try {
			const postsResult = await this.postRepo.findWithRelatedData();
			if (!postsResult.success) {
				return postsResult;
			}

			const postsByStage: Record<string, PostView[]> = {};
			
			for (const post of postsResult.data) {
				const stage = post.status || 'unknown';
				if (!postsByStage[stage]) {
					postsByStage[stage] = [];
				}
				postsByStage[stage].push(post);
			}

			return {
				success: true,
				data: postsByStage,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to get posts by stage"),
			};
		}
	}

	/**
	 * Generate activity feed for dashboard
	 */
	async getActivityFeed(limit: number = 20): Promise<Result<ActivityFeedItem[]>> {
		try {
			const activities: ActivityFeedItem[] = [];

			// Get recent posts
			const postsResult = await this.postRepo.findWithRelatedData({ 
				limit, 
				orderBy: 'createdAt',
				orderDirection: 'desc' 
			});
			
			if (postsResult.success) {
				for (const post of postsResult.data) {
					activities.push({
						id: `post_${post.id}`,
						type: 'post_created',
						title: `Post created: ${post.title}`,
						description: `New ${post.platform} post created`,
						timestamp: post.createdAt.toISOString(),
						metadata: { postId: post.id, platform: post.platform }
					});
				}
			}

			// Get recent scheduled posts
			const scheduledResult = await this.scheduledRepo.findAll({ 
				limit, 
				orderBy: 'createdAt',
				orderDirection: 'desc' 
			});

			if (scheduledResult.success) {
				for (const scheduled of scheduledResult.data) {
					let activityType: ActivityFeedItem['type'] = 'post_scheduled';
					let title = `Post scheduled for ${scheduled.platform}`;
					
					if (scheduled.status === 'published') {
						activityType = 'post_published';
						title = `Post published to ${scheduled.platform}`;
					} else if (scheduled.status === 'failed') {
						activityType = 'post_failed';
						title = `Post failed to publish to ${scheduled.platform}`;
					}

					activities.push({
						id: `scheduled_${scheduled.id}`,
						type: activityType,
						title,
						description: `Scheduled for ${new Date(scheduled.scheduledTime).toLocaleString()}`,
						timestamp: scheduled.updatedAt,
						metadata: { 
							scheduledPostId: scheduled.id, 
							postId: scheduled.postId,
							platform: scheduled.platform 
						}
					});
				}
			}

			// Sort all activities by timestamp (most recent first)
			activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

			// Limit to requested number
			const limitedActivities = activities.slice(0, limit);

			return {
				success: true,
				data: limitedActivities,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to get activity feed"),
			};
		}
	}

	/**
	 * Get platform distribution statistics
	 */
	async getPlatformDistribution(): Promise<Result<Record<string, {
		total: number;
		published: number;
		pending: number;
		failed: number;
	}>>> {
		try {
			const [postsResult, scheduledResult] = await Promise.all([
				this.postRepo.findWithRelatedData(),
				this.scheduledRepo.findAll()
			]);

			if (!postsResult.success || !scheduledResult.success) {
				return {
					success: false,
					error: new Error("Failed to get platform data"),
				};
			}

			const platformStats: Record<string, {
				total: number;
				published: number;
				pending: number;
				failed: number;
			}> = {};

			// Count posts by platform
			for (const post of postsResult.data) {
				if (!platformStats[post.platform]) {
					platformStats[post.platform] = {
						total: 0,
						published: 0,
						pending: 0,
						failed: 0,
					};
				}
				platformStats[post.platform].total++;
			}

			// Count scheduled posts by platform and status
			for (const scheduled of scheduledResult.data) {
				if (!platformStats[scheduled.platform]) {
					platformStats[scheduled.platform] = {
						total: 0,
						published: 0,
						pending: 0,
						failed: 0,
					};
				}
				
				if (scheduled.status === 'published') {
					platformStats[scheduled.platform].published++;
				} else if (scheduled.status === 'pending') {
					platformStats[scheduled.platform].pending++;
				} else if (scheduled.status === 'failed') {
					platformStats[scheduled.platform].failed++;
				}
			}

			return {
				success: true,
				data: platformStats,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to get platform distribution"),
			};
		}
	}

	/**
	 * Get post performance metrics (for future engagement tracking)
	 */
	async getPostPerformance(
		options?: {
			platform?: string;
			dateRange?: {
				start: string;
				end: string;
			};
			limit?: number;
		}
	): Promise<Result<PostPerformanceMetrics[]>> {
		try {
			// Get posts with their scheduled information
			const postsResult = await this.postRepo.findWithRelatedData(options);
			if (!postsResult.success) {
				return postsResult;
			}

			const performance: PostPerformanceMetrics[] = [];

			for (const post of postsResult.data) {
				// Find associated scheduled post
				const scheduledResult = await this.scheduledRepo.findAll({ postId: post.id });
				const scheduledPost = scheduledResult.success ? scheduledResult.data[0] : null;

				const metrics: PostPerformanceMetrics = {
					postId: post.id,
					title: post.title,
					platform: post.platform,
					status: post.status || 'unknown',
					retryCount: scheduledPost?.retryCount || 0,
				};

				if (scheduledPost) {
					metrics.scheduledTime = scheduledPost.scheduledTime;
					metrics.externalPostId = scheduledPost.externalPostId || undefined;
					
					if (scheduledPost.status === 'published') {
						metrics.publishedTime = scheduledPost.lastAttempt || undefined;
					}
				}

				// TODO: Add engagement metrics when social media APIs support it
				// metrics.engagement = {
				//   likes: 0,
				//   comments: 0,
				//   shares: 0,
				//   views: 0
				// };

				performance.push(metrics);
			}

			return {
				success: true,
				data: performance,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to get post performance"),
			};
		}
	}

	/**
	 * Get content pipeline health metrics
	 */
	async getPipelineHealth(): Promise<Result<{
		transcriptsProcessing: number;
		insightsNeedingReview: number;
		postsAwaitingApproval: number;
		scheduledPostsPending: number;
		failedPosts: number;
	}>> {
		try {
			const [
				transcriptsResult,
				insightsResult,
				postsResult,
				scheduledResult
			] = await Promise.all([
				this.transcriptRepo.findAll({ status: 'processing' }),
				this.insightRepo.findAll({ status: 'extracted' }),
				this.postRepo.findAll({ status: 'draft' }),
				this.scheduledRepo.findAll({ status: 'pending' })
			]);

			const failedScheduledResult = await this.scheduledRepo.findAll({ status: 'failed' });

			return {
				success: true,
				data: {
					transcriptsProcessing: transcriptsResult.success ? transcriptsResult.data.length : 0,
					insightsNeedingReview: insightsResult.success ? insightsResult.data.length : 0,
					postsAwaitingApproval: postsResult.success ? postsResult.data.length : 0,
					scheduledPostsPending: scheduledResult.success ? scheduledResult.data.length : 0,
					failedPosts: failedScheduledResult.success ? failedScheduledResult.data.length : 0,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Failed to get pipeline health"),
			};
		}
	}
}