import { IsString, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Platform {
  LINKEDIN = 'linkedin',
  X = 'x'
}

export class CreatePostDto {
  @ApiProperty({
    description: 'ID of the insight this post is generated from',
    example: 'insight_abc123'
  })
  @IsString()
  @MinLength(1)
  insightId: string;

  @ApiProperty({
    description: 'Title of the post',
    example: 'How to build resilience in uncertain times',
    minLength: 1,
    maxLength: 200
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Platform this post is intended for',
    enum: Platform,
    example: Platform.LINKEDIN
  })
  @IsEnum(Platform)
  platform: Platform;

  @ApiProperty({
    description: 'Content of the post',
    example: 'Building resilience requires developing systems that help you maintain focus during challenging periods...',
    minLength: 1,
    maxLength: 10000
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;
}