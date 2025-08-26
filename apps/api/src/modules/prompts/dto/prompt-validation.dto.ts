import { IsObject, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class PromptValidationDto {
  @ApiPropertyOptional({
    description: 'Variables to validate (JSON string that will be parsed)',
    example: '{"insight": "test", "platform": "linkedin"}',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        throw new Error('Invalid variables JSON format');
      }
    }
    return value;
  })
  @IsObject()
  @Type(() => Object)
  variables?: Record<string, string>;
}