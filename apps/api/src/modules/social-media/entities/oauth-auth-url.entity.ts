import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OAuthAuthUrlEntity {
  @ApiProperty({
    description: 'OAuth authorization URL',
    example: 'https://www.linkedin.com/oauth/v2/authorization?response_type=code...'
  })
  authUrl: string;

  @ApiProperty({
    description: 'State parameter for CSRF protection',
    example: 'linkedin_abc123'
  })
  state: string;

  @ApiPropertyOptional({
    description: 'Code verifier for PKCE flow (X only)',
    example: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
  })
  codeVerifier?: string;
}