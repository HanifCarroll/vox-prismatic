import { ApiProperty } from '@nestjs/swagger';

export class ApiStatusEntity {
  @ApiProperty({
    description: 'API health status',
    example: 'healthy'
  })
  status: string;

  @ApiProperty({
    description: 'Timestamp of status check',
    example: '2025-08-26T14:30:00Z'
  })
  timestamp: string;
}

export class QueueStatusEntity {
  @ApiProperty({
    description: 'Number of posts due for publication',
    example: 5
  })
  postsDue: number;

  @ApiProperty({
    description: 'Whether the queue is healthy',
    example: true
  })
  healthy: boolean;
}

export class PlatformCredentialStatusEntity {
  @ApiProperty({
    description: 'Whether credentials are configured for this platform',
    example: true
  })
  configured: boolean;
}

export class CredentialStatusEntity {
  @ApiProperty({
    description: 'LinkedIn credentials status',
    type: PlatformCredentialStatusEntity
  })
  linkedin: PlatformCredentialStatusEntity;

  @ApiProperty({
    description: 'X (Twitter) credentials status',
    type: PlatformCredentialStatusEntity
  })
  x: PlatformCredentialStatusEntity;
}

export class PublisherStatusEntity {
  @ApiProperty({
    description: 'API status information',
    type: ApiStatusEntity
  })
  api: ApiStatusEntity;

  @ApiProperty({
    description: 'Publishing queue status',
    type: QueueStatusEntity
  })
  queue: QueueStatusEntity;

  @ApiProperty({
    description: 'Platform credentials status',
    type: CredentialStatusEntity
  })
  credentials: CredentialStatusEntity;
}