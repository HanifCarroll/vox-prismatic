import { ApiProperty } from '@nestjs/swagger';

export class OAuthAuthUrlEntity {
  @ApiProperty({
    description: 'Authorization URL for the OAuth flow',
    example: 'https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=...'
  })
  authUrl: string;

  @ApiProperty({
    description: 'Step-by-step instructions for completing OAuth flow',
    example: [
      '1. Visit the authUrl in your browser',
      '2. Sign in to LinkedIn and authorize the app',
      '3. You will be redirected to the callback URL with a code',
      '4. Use the code with POST /oauth/linkedin/token to get access token'
    ]
  })
  instructions: string[];
}