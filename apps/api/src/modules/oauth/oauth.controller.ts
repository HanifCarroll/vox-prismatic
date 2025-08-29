import { Controller, Get, Post, Body, Query, Logger, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { OAuthService } from './oauth.service';
import { OAuthAuthUrlEntity, OAuthTokenResponseEntity, OAuthErrorEntity } from './entities';
import { ExchangeTokenDto } from './dto';

@ApiTags('oauth')
@Controller('oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(private readonly oAuthService: OAuthService) {}

  @Get('linkedin')
  @ApiOperation({
    summary: 'Start LinkedIn OAuth flow',
    description: 'Generates LinkedIn OAuth 2.0 authorization URL with required scopes for posting. Returns the URL and step-by-step instructions for completing the OAuth flow.'
  })
  @ApiResponse({
    status: 200,
    description: 'LinkedIn OAuth URL generated successfully',
    type: OAuthAuthUrlEntity
  })
  @ApiResponse({
    status: 400,
    description: 'LinkedIn client ID not configured'
  })
  getLinkedInAuthUrl(): OAuthAuthUrlEntity {
    this.logger.log('Getting LinkedIn OAuth URL');
    return this.oAuthService.getLinkedInAuthUrl();
  }

  @Post('linkedin/token')
  @ApiOperation({
    summary: 'Exchange LinkedIn authorization code for access token',
    description: 'Exchanges the authorization code received from LinkedIn OAuth callback for an access token. Also retrieves user profile information and provides setup instructions.'
  })
  @ApiResponse({
    status: 200,
    description: 'Token exchanged successfully',
    type: OAuthTokenResponseEntity
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid authorization code or LinkedIn credentials not configured'
  })
  @ApiResponse({
    status: 500,
    description: 'Token exchange failed'
  })
  async exchangeLinkedInToken(@Body() exchangeDto: ExchangeTokenDto): Promise<OAuthTokenResponseEntity> {
    this.logger.log('Exchanging LinkedIn authorization code');
    return await this.oAuthService.exchangeLinkedInToken(exchangeDto);
  }

  @Get('linkedin/callback')
  @ApiOperation({
    summary: 'Handle LinkedIn OAuth callback',
    description: 'Handles the OAuth callback from LinkedIn and displays a user-friendly HTML page with instructions for completing the token exchange.'
  })
  @ApiQuery({
    name: 'code',
    description: 'Authorization code from LinkedIn',
    required: false
  })
  @ApiQuery({
    name: 'error',
    description: 'Error code from LinkedIn OAuth',
    required: false
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth callback handled, HTML page returned'
  })
  getLinkedInCallback(
    @Query('code') code?: string,
    @Query('error') error?: string,
    @Res() res?: Response
  ) {
    this.logger.log(`LinkedIn OAuth callback - code: ${!!code}, error: ${!!error}`);
    
    const html = this.oAuthService.getLinkedInCallback(code, error);
    
    if (res) {
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      return;
    }
    
    return html;
  }

  @Get('x')
  @ApiOperation({
    summary: 'Start X (Twitter) OAuth flow',
    description: 'X OAuth 2.0 flow is not yet implemented. Returns information about the current status and alternative approaches.'
  })
  @ApiResponse({
    status: 200,
    description: 'X OAuth status information',
    type: OAuthErrorEntity
  })
  getXOAuth(): OAuthErrorEntity {
    this.logger.log('X OAuth requested (not implemented)');
    return this.oAuthService.getXOAuth();
  }
}