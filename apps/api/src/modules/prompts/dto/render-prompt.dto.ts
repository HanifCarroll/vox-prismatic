import { IsObject, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RenderPromptDto {
  @ApiProperty({
    description: 'Variables to substitute in the template',
    example: {
      insight: 'Building resilience requires developing systems that help you maintain focus during challenging periods.',
      platform: 'linkedin',
      characterLimit: '3000'
    }
  })
  @IsObject()
  @Type(() => Object)
  variables: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Whether to validate that all required variables are provided (default: true)',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  validate?: boolean;
}