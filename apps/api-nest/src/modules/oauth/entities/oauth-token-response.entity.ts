import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileEntity {
  @ApiPropertyOptional({
    description: 'User profile information from the platform'
  })
  [key: string]: any;
}

export class OAuthTokenResponseEntity {
  @ApiProperty({
    description: 'Access token for API calls',
    example: 'AQXdSP_W0CCmhVstP-chTPaul...'
  })
  access_token: string;

  @ApiProperty({
    description: 'Token type (usually Bearer)',
    example: 'Bearer'
  })
  token_type: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600
  })
  expires_in: number;

  @ApiProperty({
    description: 'Scope of access granted',
    example: 'openid profile w_member_social'
  })
  scope: string;

  @ApiPropertyOptional({
    description: 'User profile information',
    type: UserProfileEntity
  })
  profile?: UserProfileEntity;

  @ApiProperty({
    description: 'Instructions for using the token',
    example: [
      'Save the access_token to your .env file as LINKEDIN_ACCESS_TOKEN',
      'The token expires in 3600 seconds',
      'You can now use this token for publishing posts'
    ]
  })
  instructions: string[];
}