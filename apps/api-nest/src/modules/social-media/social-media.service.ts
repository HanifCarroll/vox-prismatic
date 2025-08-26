import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  OAuthAuthUrlEntity,
  OAuthTokenEntity,
  PostResultEntity,
  SocialProfileEntity
} from './entities';
import {
  LinkedInOAuthCallbackDto,
  LinkedInPostDto,
  XOAuthCallbackDto,
  XTweetDto,
  GetProfilesDto
} from './dto';

// Import existing social media integrations
import { 
  LinkedInConfig, 
  XConfig, 
  Platform 
} from '../../../../api/src/integrations/types/social-media';
import { generateId } from '../../../../api/src/lib/id-generator';

// LinkedIn integration
import { 
  createLinkedInClient,
  generateAuthUrl as generateLinkedInAuthUrl,
  exchangeCodeForToken as exchangeLinkedInToken,
} from '../../../../api/src/integrations/linkedin/client';

// X integration
import { 
  createXClient,
  generateAuthUrl as generateXAuthUrl,
  exchangeCodeForToken as exchangeXToken,
  createPostOrThread,
  generatePKCECodes
} from '../../../../api/src/integrations/x/client';

@Injectable()
export class SocialMediaService {
  private readonly logger = new Logger(SocialMediaService.name);

  // LinkedIn OAuth Methods
  async generateLinkedInAuthUrl(): Promise<OAuthAuthUrlEntity> {
    this.logger.log('Generating LinkedIn OAuth URL');

    const config: LinkedInConfig = {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirectUri: process.env.LINKEDIN_REDIRECT_URI || ''
    };

    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      throw new BadRequestException('LinkedIn OAuth configuration is incomplete. Check environment variables.');
    }

    const state = generateId('linkedin');
    const authUrl = generateLinkedInAuthUrl(config, state);

    return {
      authUrl,
      state
    };
  }

  async handleLinkedInCallback(callbackDto: LinkedInOAuthCallbackDto): Promise<OAuthTokenEntity> {
    this.logger.log('Processing LinkedIn OAuth callback');

    const config: LinkedInConfig = {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirectUri: process.env.LINKEDIN_REDIRECT_URI || ''
    };

    const tokenResult = await exchangeLinkedInToken(config, callbackDto.code);
    if (!tokenResult.success) {
      throw new BadRequestException(
        tokenResult.error instanceof Error ? tokenResult.error.message : 'Token exchange failed'
      );
    }

    return {
      platform: 'linkedin',
      accessToken: tokenResult.data.access_token,
      expiresIn: tokenResult.data.expires_in,
      refreshToken: tokenResult.data.refresh_token
    };
  }

  async createLinkedInPost(postDto: LinkedInPostDto): Promise<PostResultEntity> {
    this.logger.log('Creating LinkedIn post');

    const config: LinkedInConfig = {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirectUri: process.env.LINKEDIN_REDIRECT_URI || '',
      accessToken: postDto.accessToken
    };

    const clientResult = await createLinkedInClient(config);
    if (!clientResult.success) {
      throw new BadRequestException(
        clientResult.error instanceof Error ? clientResult.error.message : 'Failed to create client'
      );
    }

    const postResult = await clientResult.data.createPost(postDto.content, postDto.visibility);
    if (!postResult.success) {
      throw new BadRequestException(
        postResult.error instanceof Error ? postResult.error.message : 'Failed to create post'
      );
    }

    return postResult.data;
  }

  // X (Twitter) OAuth Methods
  async generateXAuthUrl(): Promise<OAuthAuthUrlEntity> {
    this.logger.log('Generating X OAuth URL');

    const config: XConfig = {
      clientId: process.env.X_CLIENT_ID || '',
      clientSecret: process.env.X_CLIENT_SECRET || '',
      redirectUri: process.env.X_REDIRECT_URI || ''
    };

    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      throw new BadRequestException('X OAuth configuration is incomplete. Check environment variables.');
    }

    const state = generateId('x');
    const { codeVerifier, codeChallenge } = generatePKCECodes();
    const authUrl = generateXAuthUrl(config, state, codeChallenge);

    return {
      authUrl,
      state,
      codeVerifier // Store this for the callback
    };
  }

  async handleXCallback(callbackDto: XOAuthCallbackDto): Promise<OAuthTokenEntity> {
    this.logger.log('Processing X OAuth callback');

    const config: XConfig = {
      clientId: process.env.X_CLIENT_ID || '',
      clientSecret: process.env.X_CLIENT_SECRET || '',
      redirectUri: process.env.X_REDIRECT_URI || ''
    };

    const tokenResult = await exchangeXToken(config, callbackDto.code, callbackDto.codeVerifier);
    if (!tokenResult.success) {
      throw new BadRequestException(
        tokenResult.error instanceof Error ? tokenResult.error.message : 'Token exchange failed'
      );
    }

    return {
      platform: 'x',
      accessToken: tokenResult.data.access_token,
      expiresIn: tokenResult.data.expires_in,
      refreshToken: tokenResult.data.refresh_token
    };
  }

  async createXTweet(tweetDto: XTweetDto): Promise<PostResultEntity> {
    this.logger.log('Creating X tweet');

    const config: XConfig = {
      clientId: process.env.X_CLIENT_ID || '',
      clientSecret: process.env.X_CLIENT_SECRET || '',
      redirectUri: process.env.X_REDIRECT_URI || '',
      accessToken: tweetDto.accessToken
    };

    const result = await createPostOrThread(config, tweetDto.content, tweetDto.options);
    if (!result.success) {
      throw new BadRequestException(
        result.error instanceof Error ? result.error.message : 'Failed to create tweet'
      );
    }

    return result.data;
  }

  // Profile Methods
  async getConnectedProfiles(profilesDto: GetProfilesDto): Promise<SocialProfileEntity[]> {
    this.logger.log('Getting connected profiles');

    const profiles: SocialProfileEntity[] = [];

    // Get LinkedIn profile if token provided
    if (profilesDto.linkedinToken) {
      const linkedinConfig: LinkedInConfig = {
        clientId: process.env.LINKEDIN_CLIENT_ID || '',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
        redirectUri: process.env.LINKEDIN_REDIRECT_URI || '',
        accessToken: profilesDto.linkedinToken
      };

      try {
        const clientResult = await createLinkedInClient(linkedinConfig);
        if (clientResult.success) {
          const profileResult = await clientResult.data.getProfile();
          if (profileResult.success) {
            profiles.push({
              platform: 'linkedin',
              ...profileResult.data
            });
          }
        }
      } catch (error) {
        this.logger.warn('Failed to get LinkedIn profile:', error);
      }
    }

    // Get X profile if token provided
    if (profilesDto.xToken) {
      const xConfig: XConfig = {
        clientId: process.env.X_CLIENT_ID || '',
        clientSecret: process.env.X_CLIENT_SECRET || '',
        redirectUri: process.env.X_REDIRECT_URI || '',
        accessToken: profilesDto.xToken
      };

      try {
        const clientResult = await createXClient(xConfig);
        if (clientResult.success) {
          const profileResult = await clientResult.data.getProfile();
          if (profileResult.success) {
            profiles.push({
              platform: 'x',
              ...profileResult.data
            });
          }
        }
      } catch (error) {
        this.logger.warn('Failed to get X profile:', error);
      }
    }

    return profiles;
  }
}