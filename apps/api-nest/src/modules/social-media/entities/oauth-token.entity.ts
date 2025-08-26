import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OAuthTokenEntity {
  @ApiProperty({
    description: 'Platform name',
    example: 'linkedin'
  })
  platform: string;

  @ApiProperty({
    description: 'Access token for API calls',
    example: 'AQXdSP_W0CCmhVstP-chTPaul...'
  })
  accessToken: string;

  @ApiPropertyOptional({
    description: 'Token expiration time in seconds',
    example: 3600
  })
  expiresIn?: number;

  @ApiPropertyOptional({
    description: 'Refresh token for token renewal',
    example: 'AQVjFMEkAFbUtJkVOSKTgQ...'
  })
  refreshToken?: string;
}