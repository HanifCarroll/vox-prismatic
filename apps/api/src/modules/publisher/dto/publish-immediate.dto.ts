import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PublishPlatform } from '@content-creation/types';

export class PublishImmediateDto {
  @ApiProperty({
    description: 'ID of the post to publish',
    example: 'post_abc123'
  })
  @IsNotEmpty()
  @IsString()
  postId: string;

  @ApiProperty({
    description: 'Platform to publish to',
    enum: PublishPlatform,
    example: PublishPlatform.LINKEDIN
  })
  @IsEnum(PublishPlatform)
  platform: PublishPlatform;

  @ApiProperty({
    description: 'Content to publish',
    example: 'Check out this amazing insight about resilience...'
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Access token for the platform',
    example: 'AQXdSP_W0CCmhVstP-chTPaul...'
  })
  @IsNotEmpty()
  @IsString()
  accessToken: string;
}