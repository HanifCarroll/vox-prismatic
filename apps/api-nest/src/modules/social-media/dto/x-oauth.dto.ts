import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class XOAuthCallbackDto {
  @ApiProperty({
    description: 'Authorization code from X (Twitter)',
    example: 'b1c2d3e4f5...'
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Code verifier for PKCE flow',
    example: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
  })
  @IsNotEmpty()
  @IsString()
  codeVerifier: string;

  @ApiPropertyOptional({
    description: 'State parameter for CSRF protection',
    example: 'x_abc123'
  })
  @IsOptional()
  @IsString()
  state?: string;
}

export class XTweetDto {
  @ApiProperty({
    description: 'Content of the tweet or thread',
    example: 'Just discovered this amazing insight about leadership resilience! 🧵'
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({
    description: 'X (Twitter) access token',
    example: '1234567890-abcdefghijklmnop...'
  })
  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @ApiPropertyOptional({
    description: 'Additional posting options'
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}