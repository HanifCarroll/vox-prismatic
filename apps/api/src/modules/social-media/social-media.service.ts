import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { LinkedInService } from "../linkedin";
import { XService } from "../x";
import { IdGeneratorService } from "../shared/services/id-generator.service";
import {
	GetProfilesDto,
	LinkedInOAuthCallbackDto,
	LinkedInPostDto,
	XOAuthCallbackDto,
	XTweetDto,
} from "./dto";
import {
	OAuthAuthUrlEntity,
	OAuthTokenEntity,
	PostResultEntity,
	SocialProfileEntity,
} from "./entities";

@Injectable()
export class SocialMediaService {
	private readonly logger = new Logger(SocialMediaService.name);

	constructor(
		private readonly linkedInService: LinkedInService,
		private readonly xService: XService,
		private readonly idGenerator: IdGeneratorService,
	) {}

	// LinkedIn OAuth Methods
	async generateLinkedInAuthUrl(): Promise<OAuthAuthUrlEntity> {
		this.logger.log("Generating LinkedIn OAuth URL");

		const state = this.idGenerator.generate("linkedin");
		const authUrl = this.linkedInService.generateAuthUrl(state);

		return {
			authUrl,
			state,
		};
	}

	async handleLinkedInCallback(
		callbackDto: LinkedInOAuthCallbackDto,
	): Promise<OAuthTokenEntity> {
		this.logger.log("Processing LinkedIn OAuth callback");

		const tokenResult = await this.linkedInService.exchangeCodeForToken(callbackDto.code);
		if (!tokenResult.success) {
			throw new BadRequestException("LinkedIn token exchange failed");
		}

		return {
			platform: "linkedin",
			accessToken: tokenResult.data.access_token,
			expiresIn: tokenResult.data.expires_in,
			refreshToken: tokenResult.data.refresh_token,
		};
	}

	async createLinkedInPost(
		postDto: LinkedInPostDto,
	): Promise<PostResultEntity> {
		this.logger.log("Creating LinkedIn post");

		// Set access token for this request
		this.linkedInService.setAccessToken(postDto.accessToken);

		if (!this.linkedInService.isAuthenticated) {
			throw new BadRequestException("LinkedIn authentication failed");
		}

		const postResult = await this.linkedInService.post(
			postDto.content,
			{ visibility: postDto.visibility as any }
		);
		if (!postResult.success) {
			throw new BadRequestException("Failed to create LinkedIn post");
		}

		return {
			id: postResult.data.id,
			platform: "linkedin",
			url:
				(postResult.data as any).shareUrl ||
				`https://linkedin.com/posts/${postResult.data.id}`,
			createdAt: postResult.data.createdAt,
			metadata: postResult.data,
		};
	}

	// X (Twitter) OAuth Methods
	async generateXAuthUrl(): Promise<OAuthAuthUrlEntity> {
		this.logger.log("Generating X OAuth URL");

		const state = this.idGenerator.generate("x");
		const { codeVerifier, codeChallenge } = this.xService.generatePKCECodes();
		const authUrl = this.xService.generateAuthUrl(state, codeChallenge);

		return {
			authUrl,
			state,
			codeVerifier, // Store this for the callback
		};
	}

	async handleXCallback(
		callbackDto: XOAuthCallbackDto,
	): Promise<OAuthTokenEntity> {
		this.logger.log("Processing X OAuth callback");

		const tokenResult = await this.xService.exchangeCodeForToken(
			callbackDto.code,
			callbackDto.codeVerifier,
		);
		if (!tokenResult.success) {
			throw new BadRequestException("X token exchange failed");
		}

		return {
			platform: "x",
			accessToken: tokenResult.data.access_token,
			expiresIn: tokenResult.data.expires_in,
			refreshToken: tokenResult.data.refresh_token,
		};
	}

	async createXTweet(tweetDto: XTweetDto): Promise<PostResultEntity> {
		this.logger.log("Creating X tweet");

		// Set access token for this request
		this.xService.setAccessToken(tweetDto.accessToken);

		if (!this.xService.isAuthenticated) {
			throw new BadRequestException("X authentication failed");
		}

		const result = await this.xService.createPostOrThread(
			tweetDto.content,
			tweetDto.options,
		);
		if (!result.success) {
			throw new BadRequestException("Failed to create X tweet");
		}

		// Transform the result to match our entity
		const tweetData = Array.isArray(result.data) ? result.data[0] : result.data;
		return {
			id: tweetData.id,
			platform: "x",
			url: `https://twitter.com/i/status/${tweetData.id}`,
			createdAt: tweetData.created_at,
			metadata: result.data,
		};
	}

	// Profile Methods
	async getConnectedProfiles(
		profilesDto: GetProfilesDto,
	): Promise<SocialProfileEntity[]> {
		this.logger.log("Getting connected profiles");

		const profiles: SocialProfileEntity[] = [];

		// Get LinkedIn profile if token provided
		if (profilesDto.linkedinToken) {
			try {
				// Set access token for this request
				this.linkedInService.setAccessToken(profilesDto.linkedinToken);
				
				if (this.linkedInService.isAuthenticated) {
					const profileResult = await this.linkedInService.getProfile();
					if (profileResult.success) {
						const profileData = profileResult.data;
						profiles.push({
							platform: "linkedin",
							id: profileData.id,
							name: `${profileData.localizedFirstName} ${profileData.localizedLastName}`,
							username: profileData.vanityName,
							profilePicture: profileData.profilePicture?.displayImage,
							bio: undefined, // LinkedIn API doesn't return headline in this endpoint
							verified: false, // LinkedIn doesn't have verified status in API
							metadata: profileData,
						});
					}
				}
			} catch (error) {
				this.logger.warn("Failed to get LinkedIn profile:", error);
			}
		}

		// Get X profile if token provided
		if (profilesDto.xToken) {
			try {
				// Set access token for this request
				this.xService.setAccessToken(profilesDto.xToken);
				
				if (this.xService.isAuthenticated) {
					const profileResult = await this.xService.getProfile();
					if (profileResult.success) {
						const profileData = profileResult.data;
						profiles.push({
							platform: "x",
							id: profileData.id,
							name: profileData.name,
							username: profileData.username,
							profilePicture: profileData.profile_image_url,
							bio: undefined,
							verified: false,
							metadata: profileData,
						});
					}
				}
			} catch (error) {
				this.logger.warn("Failed to get X profile:", error);
			}
		}

		return profiles;
	}
}
