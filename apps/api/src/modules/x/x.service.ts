import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import {
	Result,
	SocialMediaClient,
	XAnalytics,
	XConfig,
	XMediaUpload,
	XProfile,
	XTokenResponse,
	XTweet,
	XTweetData,
	Platform,
} from "@content-creation/types";

/**
 * X (Twitter) integration service for NestJS
 * Handles OAuth 2.0 authentication and X API v2 operations
 */
@Injectable()
export class XService implements SocialMediaClient {
	private readonly logger = new Logger(XService.name);
	public readonly platform = Platform.X;
	private config: XConfig;
	private _accessToken?: string;
	private _bearerToken?: string;

	constructor(private configService: ConfigService) {
		this.config = {
			clientId: this.configService.get<string>("X_CLIENT_ID") || "",
			clientSecret: this.configService.get<string>("X_CLIENT_SECRET") || "",
			redirectUri: this.configService.get<string>("X_REDIRECT_URI") || "",
			bearerToken: this.configService.get<string>("X_BEARER_TOKEN"),
			accessToken: this.configService.get<string>("X_ACCESS_TOKEN"),
			accessTokenSecret: this.configService.get<string>(
				"X_ACCESS_TOKEN_SECRET",
			),
		};
		this._accessToken = this.config.accessToken;
		this._bearerToken = this.config.bearerToken;
	}

	get isAuthenticated(): boolean {
		return !!this._accessToken;
	}

	/**
	 * Set access token for authenticated requests
	 */
	setAccessToken(token: string): void {
		this._accessToken = token;
	}

	/**
	 * Generate PKCE codes for OAuth 2.0
	 */
	generatePKCECodes(): { codeVerifier: string; codeChallenge: string } {
		const codeVerifier = crypto.randomBytes(32).toString("base64url");
		const codeChallenge = crypto
			.createHash("sha256")
			.update(codeVerifier)
			.digest("base64url");

		return { codeVerifier, codeChallenge };
	}

	/**
	 * Generate X OAuth 2.0 authorization URL with PKCE
	 */
	generateAuthUrl(state: string = "", codeChallenge: string): string {
		const params = new URLSearchParams({
			response_type: "code",
			client_id: this.config.clientId,
			redirect_uri: this.config.redirectUri,
			state,
			code_challenge: codeChallenge,
			code_challenge_method: "S256",
			scope: "tweet.read tweet.write users.read offline.access",
		});

		return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
	}

	/**
	 * Exchange authorization code for access token
	 */
	async exchangeCodeForToken(
		code: string,
		codeVerifier: string,
	): Promise<Result<XTokenResponse>> {
		try {
			const params = new URLSearchParams({
				grant_type: "authorization_code",
				code,
				client_id: this.config.clientId,
				redirect_uri: this.config.redirectUri,
				code_verifier: codeVerifier,
			});

			const credentials = Buffer.from(
				`${this.config.clientId}:${this.config.clientSecret}`,
			).toString("base64");

			const response = await fetch("https://api.twitter.com/2/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${credentials}`,
				},
				body: params,
			});

			if (!response.ok) {
				const errorData = (await response.json()) as any;
				return {
					success: false,
					error: `X OAuth error: ${errorData?.error_description || response.statusText}`,
				};
			}

			const tokenData = (await response.json()) as XTokenResponse;

			// Store the access token
			this._accessToken = tokenData.access_token;

			return {
				success: true,
				data: tokenData,
			};
		} catch (error) {
			this.logger.error("Failed to exchange code for token", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Refresh access token using refresh token
	 */
	async refreshAccessToken(
		refreshToken: string,
	): Promise<Result<XTokenResponse>> {
		try {
			const params = new URLSearchParams({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
				client_id: this.config.clientId,
			});

			const credentials = Buffer.from(
				`${this.config.clientId}:${this.config.clientSecret}`,
			).toString("base64");

			const response = await fetch("https://api.twitter.com/2/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${credentials}`,
				},
				body: params,
			});

			if (!response.ok) {
				const errorData = (await response.json()) as any;
				return {
					success: false,
					error: `X refresh token error: ${errorData?.error_description || response.statusText}`,
				};
			}

			const tokenData = (await response.json()) as XTokenResponse;

			// Update the access token
			this._accessToken = tokenData.access_token;

			return {
				success: true,
				data: tokenData,
			};
		} catch (error) {
			this.logger.error("Failed to refresh access token", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Generate app-only bearer token for read-only operations
	 */
	async generateAppOnlyToken(): Promise<Result<string>> {
		try {
			const credentials = Buffer.from(
				`${this.config.clientId}:${this.config.clientSecret}`,
			).toString("base64");

			const response = await fetch("https://api.twitter.com/oauth2/token", {
				method: "POST",
				headers: {
					Authorization: `Basic ${credentials}`,
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: "grant_type=client_credentials",
			});

			if (!response.ok) {
				return {
					success: false,
					error: `Failed to generate app-only token: ${response.statusText}`,
				};
			}

			const data = (await response.json()) as any;
			this._bearerToken = data?.access_token;

			return {
				success: true,
				data: data?.access_token,
			};
		} catch (error) {
			this.logger.error("Failed to generate app-only token", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Validate access token by making a test API call
	 */
	async validateAccessToken(): Promise<Result<boolean>> {
		if (!this._accessToken) {
			return {
				success: false,
				error: "No access token available",
			};
		}

		try {
			const response = await fetch("https://api.twitter.com/2/users/me", {
				headers: {
					Authorization: `Bearer ${this._accessToken}`,
				},
			});

			if (response.status === 401) {
				return {
					success: false,
					error: "X access token is invalid or expired",
				};
			}

			if (!response.ok) {
				return {
					success: false,
					error: `X API error: ${response.statusText}`,
				};
			}

			return {
				success: true,
				data: true,
			};
		} catch (error) {
			this.logger.error("Failed to validate access token", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Get authenticated user's X profile
	 */
	async getProfile(): Promise<Result<XProfile>> {
		if (!this._accessToken) {
			return {
				success: false,
				error: "Not authenticated with X",
			};
		}

		try {
			const response = await fetch(
				"https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics",
				{
					headers: {
						Authorization: `Bearer ${this._accessToken}`,
					},
				},
			);

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as any;
				return {
					success: false,
					error: `X API error: ${errorData?.detail || response.statusText}`,
				};
			}

			const responseData = (await response.json()) as any;
			const data = responseData?.data;

			const profile: XProfile = {
				id: data?.id || "",
				username: data?.username || "",
				name: data?.name || "",
				profile_image_url: data?.profile_image_url,
				public_metrics: data?.public_metrics,
			};

			return {
				success: true,
				data: profile,
			};
		} catch (error) {
			this.logger.error("Failed to get profile", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Create a tweet
	 */
	async createTweet(tweetData: XTweetData): Promise<Result<XTweet>> {
		if (!this._accessToken) {
			return {
				success: false,
				error: "Not authenticated with X",
			};
		}

		try {
			this.logger.log("🐦 Creating tweet...");

			const payload: any = {
				text: tweetData.text,
			};

			if (tweetData.replyTo) {
				payload.reply = { in_reply_to_tweet_id: tweetData.replyTo };
			}

			if (tweetData.quoteTweetId) {
				payload.quote_tweet_id = tweetData.quoteTweetId;
			}

			if (tweetData.mediaIds && tweetData.mediaIds.length > 0) {
				payload.media = { media_ids: tweetData.mediaIds };
			}

			if (tweetData.poll) {
				payload.poll = {
					options: tweetData.poll.options,
					duration_minutes: tweetData.poll.duration_minutes,
				};
			}

			const response = await fetch("https://api.twitter.com/2/tweets", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this._accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as any;
				return {
					success: false,
					error: `Failed to create tweet: ${errorData?.detail || response.statusText}`,
				};
			}

			const responseData = (await response.json()) as any;
			const data = responseData?.data;

			const tweet: XTweet = {
				id: data?.id || "",
				text: data?.text || tweetData.text,
				created_at: new Date().toISOString(),
				author_id: data?.author_id || "",
			};

			this.logger.log("✅ Tweet created successfully");
			return {
				success: true,
				data: tweet,
			};
		} catch (error) {
			this.logger.error("Failed to create tweet", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Create a thread of tweets
	 */
	async createThread(tweets: string[]): Promise<Result<XTweet[]>> {
		if (!this._accessToken) {
			return {
				success: false,
				error: "Not authenticated with X",
			};
		}

		try {
			this.logger.log(`🧵 Creating thread with ${tweets.length} tweets...`);

			const createdTweets: XTweet[] = [];
			let previousTweetId: string | undefined;

			for (const tweetText of tweets) {
				const tweetData: XTweetData = {
					text: tweetText,
					replyTo: previousTweetId,
				};

				const result = await this.createTweet(tweetData);
				if (!result.success) {
					return {
						success: false,
						error: `Failed to create thread at tweet ${createdTweets.length + 1}: ${(result as any).error}`,
					};
				}

				createdTweets.push(result.data);
				previousTweetId = result.data.id;
			}

			this.logger.log(
				`✅ Thread created successfully with ${createdTweets.length} tweets`,
			);
			return {
				success: true,
				data: createdTweets,
			};
		} catch (error) {
			this.logger.error("Failed to create thread", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Simplified post method for SocialMediaClient interface
	 */
	async post(
		content: string,
		options?: {
			replyTo?: string;
			quoteTweetId?: string;
			mediaIds?: string[];
		},
	): Promise<Result<XTweet>> {
		const tweetData: XTweetData = {
			text: content,
			...options,
		};
		return this.createTweet(tweetData);
	}

	/**
	 * Delete a tweet
	 */
	async deletePost(tweetId: string): Promise<Result<void>> {
		if (!this._accessToken) {
			return {
				success: false,
				error: "Not authenticated with X",
			};
		}

		try {
			const response = await fetch(
				`https://api.twitter.com/2/tweets/${tweetId}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${this._accessToken}`,
					},
				},
			);

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as any;
				return {
					success: false,
					error: `Failed to delete tweet: ${errorData?.detail || response.statusText}`,
				};
			}

			return {
				success: true,
				data: undefined,
			};
		} catch (error) {
			this.logger.error("Failed to delete tweet", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Get user's tweets
	 */
	async getTweets(
		userId?: string,
		maxResults: number = 20,
	): Promise<Result<XTweet[]>> {
		const token = this._accessToken || this._bearerToken;
		if (!token) {
			return {
				success: false,
				error: "No authentication token available",
			};
		}

		try {
			this.logger.log(`📡 Fetching tweets (limit: ${maxResults})...`);

			// If no userId provided, get the authenticated user's ID
			if (!userId && this._accessToken) {
				const profileResult = await this.getProfile();
				if (!profileResult.success) {
					return {
						success: false,
						error: 'Failed to get profile',
					};
				}
				userId = profileResult.data.id;
			}

			if (!userId) {
				return {
					success: false,
					error: "User ID is required",
				};
			}

			const params = new URLSearchParams({
				max_results: maxResults.toString(),
				"tweet.fields": "created_at,public_metrics,referenced_tweets",
			});

			const response = await fetch(
				`https://api.twitter.com/2/users/${userId}/tweets?${params}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as any;
				return {
					success: false,
					error: `X API error: ${errorData?.detail || response.statusText}`,
				};
			}

			const responseData = (await response.json()) as any;
			const data = responseData?.data;
			const tweets: XTweet[] = ((data as any[]) || []).map((tweet: any) => ({
				id: tweet?.id || "",
				text: tweet?.text || "",
				created_at: tweet?.created_at || "",
				author_id: userId || "",
				public_metrics: tweet?.public_metrics,
				referenced_tweets: tweet?.referenced_tweets,
			}));

			this.logger.log(`✅ Found ${tweets.length} tweets`);
			return {
				success: true,
				data: tweets,
			};
		} catch (error) {
			this.logger.error("Failed to get tweets", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Upload media for use in tweets
	 */
	async uploadMedia(
		mediaData: Buffer,
		mediaType: string,
	): Promise<Result<XMediaUpload>> {
		if (!this._accessToken) {
			return {
				success: false,
				error: "Not authenticated with X",
			};
		}

		try {
			// Note: Media upload requires v1.1 API endpoint
			const formData = new FormData();
			formData.append("media", new Blob([mediaData], { type: mediaType }));

			const response = await fetch(
				"https://upload.twitter.com/1.1/media/upload.json",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${this._accessToken}`,
					},
					body: formData,
				},
			);

			if (!response.ok) {
				return {
					success: false,
					error: `Media upload failed: ${response.statusText}`,
				};
			}

			const data = (await response.json()) as any;

			const mediaUpload: XMediaUpload = {
				media_id: data?.media_id || "",
				media_id_string: data?.media_id_string || "",
				size: data?.size || 0,
				expires_after_secs: data?.expires_after_secs || 0,
			};

			return {
				success: true,
				data: mediaUpload,
			};
		} catch (error) {
			this.logger.error("Failed to upload media", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Get tweet analytics (requires premium access)
	 */
	async getTweetAnalytics(tweetId: string): Promise<Result<XAnalytics>> {
		if (!this._accessToken) {
			return {
				success: false,
				error: "Not authenticated with X",
			};
		}

		try {
			// Note: Analytics API requires special access levels
			const response = await fetch(
				`https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=organic_metrics,public_metrics`,
				{
					headers: {
						Authorization: `Bearer ${this._accessToken}`,
					},
				},
			);

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as any;
				return {
					success: false,
					error: `X analytics error: ${errorData?.detail || response.statusText}`,
				};
			}

			const responseData = (await response.json()) as any;
			const data = responseData?.data;

			const analytics: XAnalytics = {
				tweetId,
				impressions: data?.organic_metrics?.impression_count || 0,
				url_link_clicks: data?.organic_metrics?.url_link_clicks || 0,
				user_profile_clicks: data?.organic_metrics?.user_profile_clicks || 0,
				likes: data?.public_metrics?.like_count || 0,
				replies: data?.public_metrics?.reply_count || 0,
				retweets: data?.public_metrics?.retweet_count || 0,
			};

			return {
				success: true,
				data: analytics,
			};
		} catch (error) {
			this.logger.error("Failed to get tweet analytics", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Helper function to create a post or thread based on content length
	 * Automatically splits long content into threads
	 */
	async createPostOrThread(
		content: string,
		options?: {
			maxTweetLength?: number;
			replyTo?: string;
			mediaIds?: string[];
		},
	): Promise<Result<XTweet | XTweet[]>> {
		const maxLength = options?.maxTweetLength || 280;

		// Check if content fits in a single tweet
		if (content.length <= maxLength) {
			return this.createTweet({
				text: content,
				replyTo: options?.replyTo,
				mediaIds: options?.mediaIds,
			});
		}

		// Split content into thread
		const tweets: string[] = [];
		const words = content.split(" ");
		let currentTweet = "";

		for (const word of words) {
			const testTweet = currentTweet ? `${currentTweet} ${word}` : word;

			if (testTweet.length <= maxLength - 10) {
				// Leave room for thread numbering
				currentTweet = testTweet;
			} else {
				if (currentTweet) {
					tweets.push(currentTweet);
				}
				currentTweet = word;
			}
		}

		if (currentTweet) {
			tweets.push(currentTweet);
		}

		// Add thread numbering
		const numberedTweets = tweets.map(
			(tweet, index) => `${index + 1}/${tweets.length}: ${tweet}`,
		);

		// Create thread
		return this.createThread(numberedTweets);
	}
}
