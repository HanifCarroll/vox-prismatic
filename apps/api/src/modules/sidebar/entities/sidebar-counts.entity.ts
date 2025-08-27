import { ApiProperty } from '@nestjs/swagger';

export class SidebarCountsEntity {
  @ApiProperty({
    description: 'Number of raw transcripts that need cleaning (status: raw)',
    example: 3
  })
  transcripts: number;

  @ApiProperty({
    description: 'Number of insights that need review (status: needs_review)',
    example: 5
  })
  insights: number;

  @ApiProperty({
    description: 'Number of posts that need review (status: needs_review)',
    example: 12
  })
  posts: number;
}