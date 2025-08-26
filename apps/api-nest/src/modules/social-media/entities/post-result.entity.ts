import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PostResultEntity {
  @ApiProperty({
    description: 'ID of the created post',
    example: 'urn:li:share:1234567890'
  })
  id: string;

  @ApiProperty({
    description: 'Platform where the post was created',
    example: 'linkedin'
  })
  platform: string;

  @ApiProperty({
    description: 'URL of the created post',
    example: 'https://www.linkedin.com/feed/update/urn:li:share:1234567890'
  })
  url: string;

  @ApiPropertyOptional({
    description: 'Creation timestamp',
    example: '2025-08-26T14:30:00Z'
  })
  createdAt?: string;

  @ApiPropertyOptional({
    description: 'Additional platform-specific data'
  })
  metadata?: Record<string, any>;
}