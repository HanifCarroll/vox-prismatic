import { Controller, Get, Post, Body, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SocialMediaService } from './social-media.service';
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

@ApiTags('social-media')
@Controller('social-media')
export class SocialMediaController {
  private readonly logger = new Logger(SocialMediaController.name);

  constructor(private readonly socialMediaService: SocialMediaService) {}

  // LinkedIn OAuth Routes

  @Get('linkedin/auth')
  @ApiOperation({
    summary: 'Generate LinkedIn OAuth URL',
    description: 'Creates a LinkedIn OAuth 2.0 authorization URL with required scopes for posting content.'
  })
  @ApiResponse({
    status: 200,
    description: 'LinkedIn OAuth URL generated successfully',
    type: OAuthAuthUrlEntity
  })
  @ApiResponse({
    status: 400,
    description: 'LinkedIn OAuth configuration is incomplete'
  })
  async generateLinkedInAuthUrl(): Promise<OAuthAuthUrlEntity> {
    this.logger.log('Generating LinkedIn OAuth URL');
    return await this.socialMediaService.generateLinkedInAuthUrl();
  }

  @Post('linkedin/callback')
  @ApiOperation({
    summary: 'Handle LinkedIn OAuth callback',
    description: 'Processes the OAuth callback from LinkedIn and exchanges the authorization code for an access token.'
  })
  @ApiResponse({
    status: 200,
    description: 'LinkedIn OAuth callback processed successfully',
    type: OAuthTokenEntity
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid authorization code or OAuth configuration'
  })
  async handleLinkedInCallback(@Body() callbackDto: LinkedInOAuthCallbackDto): Promise<OAuthTokenEntity> {
    this.logger.log('Processing LinkedIn OAuth callback');
    return await this.socialMediaService.handleLinkedInCallback(callbackDto);
  }

  @Post('linkedin/post')
  @ApiOperation({
    summary: 'Create LinkedIn post',
    description: 'Creates a new post on LinkedIn using the provided access token and content.'
  })
  @ApiResponse({
    status: 200,
    description: 'LinkedIn post created successfully',
    type: PostResultEntity
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid content, access token, or LinkedIn client configuration'
  })
  async createLinkedInPost(@Body() postDto: LinkedInPostDto): Promise<PostResultEntity> {
    this.logger.log('Creating LinkedIn post');
    return await this.socialMediaService.createLinkedInPost(postDto);
  }

  // X (Twitter) OAuth Routes

  @Get('x/auth')
  @ApiOperation({
    summary: 'Generate X (Twitter) OAuth URL',
    description: 'Creates an X OAuth 2.0 authorization URL with PKCE for secure authentication flow.'
  })
  @ApiResponse({
    status: 200,
    description: 'X OAuth URL generated successfully',
    type: OAuthAuthUrlEntity
  })
  @ApiResponse({
    status: 400,
    description: 'X OAuth configuration is incomplete'
  })
  async generateXAuthUrl(): Promise<OAuthAuthUrlEntity> {
    this.logger.log('Generating X OAuth URL');
    return await this.socialMediaService.generateXAuthUrl();
  }

  @Post('x/callback')
  @ApiOperation({
    summary: 'Handle X (Twitter) OAuth callback',
    description: 'Processes the OAuth callback from X and exchanges the authorization code for an access token using PKCE.'
  })
  @ApiResponse({
    status: 200,
    description: 'X OAuth callback processed successfully',
    type: OAuthTokenEntity
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid authorization code, code verifier, or OAuth configuration'
  })
  async handleXCallback(@Body() callbackDto: XOAuthCallbackDto): Promise<OAuthTokenEntity> {
    this.logger.log('Processing X OAuth callback');
    return await this.socialMediaService.handleXCallback(callbackDto);
  }

  @Post('x/tweet')
  @ApiOperation({
    summary: 'Create X (Twitter) tweet/thread',
    description: 'Creates a new tweet or thread on X using the provided access token and content. Supports automatic thread creation for long content.'
  })
  @ApiResponse({
    status: 200,
    description: 'X tweet created successfully',
    type: PostResultEntity
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid content, access token, or X client configuration'
  })
  async createXTweet(@Body() tweetDto: XTweetDto): Promise<PostResultEntity> {
    this.logger.log('Creating X tweet');
    return await this.socialMediaService.createXTweet(tweetDto);
  }

  // Profile Management

  @Get('profiles')
  @ApiOperation({
    summary: 'Get connected social media profiles',
    description: 'Retrieves profile information for connected social media accounts. Provide access tokens as query parameters for each platform you want to retrieve.'
  })
  @ApiQuery({
    name: 'linkedinToken',
    description: 'LinkedIn access token',
    required: false
  })
  @ApiQuery({
    name: 'xToken',
    description: 'X (Twitter) access token',
    required: false
  })
  @ApiResponse({
    status: 200,
    description: 'Connected profiles retrieved successfully',
    type: [SocialProfileEntity]
  })
  async getConnectedProfiles(
    @Query('linkedinToken') linkedinToken?: string,
    @Query('xToken') xToken?: string
  ): Promise<SocialProfileEntity[]> {
    this.logger.log('Getting connected profiles');
    
    const profilesDto: GetProfilesDto = {
      linkedinToken,
      xToken
    };
    
    return await this.socialMediaService.getConnectedProfiles(profilesDto);
  }
}