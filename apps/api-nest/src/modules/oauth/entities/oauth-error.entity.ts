import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OAuthErrorEntity {
  @ApiProperty({
    description: 'Error message',
    example: 'X (Twitter) OAuth not yet implemented'
  })
  error: string;

  @ApiPropertyOptional({
    description: 'Additional message or context',
    example: 'X OAuth 2.0 flow is more complex. Consider using Twitter API v1.1 with API keys for now.'
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Additional error details'
  })
  details?: any;
}