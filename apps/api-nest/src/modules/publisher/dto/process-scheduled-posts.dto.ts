import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LinkedInCredentials {
  @ApiPropertyOptional({
    description: 'LinkedIn access token',
    example: 'AQXdSP_W0CCmhVstP-chTPaul...'
  })
  @IsOptional()
  @IsString()
  accessToken?: string;
}

export class XCredentials {
  @ApiPropertyOptional({
    description: 'X (Twitter) access token',
    example: '1234567890-abcdefghijklmnop...'
  })
  @IsOptional()
  @IsString()
  accessToken?: string;
}

export class ProcessScheduledPostsDto {
  @ApiPropertyOptional({
    description: 'LinkedIn credentials for publishing',
    type: LinkedInCredentials
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LinkedInCredentials)
  linkedin?: LinkedInCredentials;

  @ApiPropertyOptional({
    description: 'X (Twitter) credentials for publishing',
    type: XCredentials
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => XCredentials)
  x?: XCredentials;
}