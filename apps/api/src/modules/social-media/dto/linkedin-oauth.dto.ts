import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkedInOAuthCallbackDto {
  @ApiProperty({
    description: 'Authorization code from LinkedIn',
    example: 'AQTfH3VJkL5iHw...'
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiPropertyOptional({
    description: 'State parameter for CSRF protection',
    example: 'linkedin_abc123'
  })
  @IsOptional()
  @IsString()
  state?: string;
}

export class LinkedInPostDto {
  @ApiProperty({
    description: 'Content of the LinkedIn post',
    example: 'Check out this amazing insight about resilience in leadership!'
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({
    description: 'LinkedIn access token',
    example: 'AQXdSP_W0CCmhVstP-chTPaul...'
  })
  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @ApiPropertyOptional({
    description: 'Post visibility setting',
    example: 'public'
  })
  @IsOptional()
  @IsString()
  visibility?: string;
}