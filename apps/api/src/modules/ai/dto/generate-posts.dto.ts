import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneratePostsDto {
  @ApiProperty({
    description: 'The ID of the insight to generate posts from',
    example: 'insight_018c7f24-3b68-7950-9f38-5f3b42c9d523'
  })
  @IsString()
  @IsNotEmpty()
  insightId: string;

  @ApiProperty({
    description: 'The title of the insight',
    example: 'AI Will Create More Jobs Than It Destroys'
  })
  @IsString()
  @IsNotEmpty()
  insightTitle: string;

  @ApiProperty({
    description: 'The insight content to generate posts from',
    example: 'Research shows that AI automation will create 97 million new jobs by 2025...'
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Platforms to generate posts for',
    example: ['linkedin', 'x'],
    default: ['linkedin', 'x']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @ApiPropertyOptional({
    description: 'Optional custom prompt for post generation',
    example: 'Make it controversial and thought-provoking'
  })
  @IsOptional()
  @IsString()
  customPrompt?: string;
}