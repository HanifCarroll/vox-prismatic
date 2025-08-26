import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SocialProfileEntity {
  @ApiProperty({
    description: 'Platform name',
    example: 'linkedin'
  })
  platform: string;

  @ApiProperty({
    description: 'User ID on the platform',
    example: 'abc123def456'
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Display name',
    example: 'John Doe'
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Username or handle',
    example: 'johndoe'
  })
  username?: string;

  @ApiPropertyOptional({
    description: 'Profile picture URL',
    example: 'https://media.licdn.com/dms/image/...'
  })
  profilePicture?: string;

  @ApiPropertyOptional({
    description: 'Bio or description',
    example: 'Software Engineer passionate about AI and machine learning'
  })
  bio?: string;

  @ApiPropertyOptional({
    description: 'Number of followers',
    example: 1500
  })
  followersCount?: number;

  @ApiPropertyOptional({
    description: 'Number of following',
    example: 800
  })
  followingCount?: number;

  @ApiPropertyOptional({
    description: 'Whether the profile is verified',
    example: false
  })
  verified?: boolean;

  @ApiPropertyOptional({
    description: 'Additional platform-specific data'
  })
  metadata?: Record<string, any>;
}

export class ProfilesEntity {
  @ApiProperty({
    description: 'List of connected social media profiles',
    type: [SocialProfileEntity]
  })
  profiles: SocialProfileEntity[];
}