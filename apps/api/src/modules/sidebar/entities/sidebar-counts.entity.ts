import { ApiProperty } from '@nestjs/swagger';

export class SidebarCountsEntity {
  @ApiProperty({
    description: 'Number of insights that need review (status: extracted)',
    example: 5
  })
  insights: number;

  @ApiProperty({
    description: 'Number of posts that need review (status: draft)',
    example: 12
  })
  posts: number;
}