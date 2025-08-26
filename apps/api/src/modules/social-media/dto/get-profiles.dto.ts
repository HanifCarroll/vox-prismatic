import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetProfilesDto {
  @ApiPropertyOptional({
    description: 'LinkedIn access token to fetch LinkedIn profile',
    example: 'AQXdSP_W0CCmhVstP-chTPaul...'
  })
  @IsOptional()
  @IsString()
  linkedinToken?: string;

  @ApiPropertyOptional({
    description: 'X (Twitter) access token to fetch X profile',
    example: '1234567890-abcdefghijklmnop...'
  })
  @IsOptional()
  @IsString()
  xToken?: string;
}