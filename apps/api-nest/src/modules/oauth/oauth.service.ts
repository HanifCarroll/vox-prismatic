import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OAuthAuthUrlEntity, OAuthTokenResponseEntity, OAuthErrorEntity } from './entities';
import { ExchangeTokenDto } from './dto';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  getLinkedInAuthUrl(): OAuthAuthUrlEntity {
    this.logger.log('Generating LinkedIn OAuth URL');

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/auth/linkedin/callback';
    
    if (!clientId) {
      throw new BadRequestException('LINKEDIN_CLIENT_ID not configured');
    }

    // LinkedIn OAuth 2.0 authorization URL
    const scopes = [
      'openid',
      'profile', 
      'w_member_social'  // Required for posting
    ].join('%20');

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${scopes}&` +
      `state=${Math.random().toString(36).substring(7)}`;

    return {
      authUrl,
      instructions: [
        '1. Visit the authUrl in your browser',
        '2. Sign in to LinkedIn and authorize the app',
        '3. You will be redirected to the callback URL with a code',
        '4. Use the code with POST /oauth/linkedin/token to get access token'
      ]
    };
  }

  async exchangeLinkedInToken(exchangeDto: ExchangeTokenDto): Promise<OAuthTokenResponseEntity> {
    this.logger.log('Exchanging LinkedIn authorization code for token');

    try {
      const { code } = exchangeDto;

      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/auth/linkedin/callback';

      if (!clientId || !clientSecret) {
        throw new BadRequestException('LinkedIn credentials not configured');
      }

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        this.logger.error('LinkedIn token exchange failed:', tokenData);
        throw new BadRequestException('Failed to exchange code for token');
      }

      // Get user profile info
      const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      const profileData = await profileResponse.json();

      return {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
        profile: profileData,
        instructions: [
          'Save the access_token to your .env file as LINKEDIN_ACCESS_TOKEN',
          'The token expires in ' + tokenData.expires_in + ' seconds',
          'You can now use this token for publishing posts'
        ]
      };

    } catch (error) {
      this.logger.error('OAuth token exchange error:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to process token exchange'
      );
    }
  }

  getLinkedInCallback(code?: string, error?: string): string {
    if (error) {
      return `
        <html>
          <body>
            <h1>LinkedIn OAuth Error</h1>
            <p>Error: ${error}</p>
            <p>Description: Unknown error</p>
            <a href="/oauth/linkedin">Try Again</a>
          </body>
        </html>
      `;
    }

    if (!code) {
      return `
        <html>
          <body>
            <h1>LinkedIn OAuth Callback</h1>
            <p>No authorization code received</p>
            <a href="/oauth/linkedin">Start OAuth Flow</a>
          </body>
        </html>
      `;
    }

    return `
      <html>
        <head>
          <title>LinkedIn OAuth Success</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .code { background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; }
            .copy-btn { margin-left: 10px; padding: 5px 10px; }
          </style>
        </head>
        <body>
          <h1>✅ LinkedIn Authorization Successful!</h1>
          <p>Authorization code received. Now exchange it for an access token:</p>
          
          <h3>Step 1: Copy this authorization code:</h3>
          <div class="code" id="authCode">${code}</div>
          <button class="copy-btn" onclick="copyCode()">Copy Code</button>
          
          <h3>Step 2: Exchange for access token using curl:</h3>
          <div class="code">
curl -X POST http://localhost:3000/oauth/linkedin/token \\
  -H "Content-Type: application/json" \\
  -d '{"code": "${code}"}'
          </div>
          
          <h3>Or use this JavaScript:</h3>
          <div class="code">
fetch('http://localhost:3000/oauth/linkedin/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: '${code}' })
}).then(r => r.json()).then(console.log);
          </div>
          
          <script>
            function copyCode() {
              navigator.clipboard.writeText('${code}');
              alert('Code copied to clipboard!');
            }
          </script>
        </body>
      </html>
    `;
  }

  getXOAuth(): OAuthErrorEntity {
    this.logger.log('X OAuth requested (not implemented)');
    
    return {
      error: 'X (Twitter) OAuth not yet implemented',
      message: 'X OAuth 2.0 flow is more complex. Consider using Twitter API v1.1 with API keys for now.'
    };
  }
}