import { ApiProperty } from '@nestjs/swagger';

export class CleanTranscriptResultEntity {
  @ApiProperty({
    description: 'The ID of the cleaned transcript',
    example: 'transcript_018c7f24-3b68-7950-9f38-5f3b42c9d523'
  })
  cleanedTranscriptId: string;

  @ApiProperty({
    description: 'The cleaned transcript text',
    example: 'Today we discussed the transformative impact of AI...'
  })
  cleanedText: string;

  @ApiProperty({
    description: 'Processing duration in milliseconds',
    example: 2345
  })
  duration: number;

  @ApiProperty({
    description: 'Estimated cost in USD',
    example: 0.0012
  })
  cost: number;

  @ApiProperty({
    description: 'Number of tokens processed',
    example: 1500
  })
  tokens: number;
}

export class InsightEntity {
  @ApiProperty({
    description: 'Insight title',
    example: 'AI Will Create More Jobs Than It Destroys'
  })
  title: string;

  @ApiProperty({
    description: 'Verbatim quote from the transcript',
    example: 'Research definitively shows that AI automation will create 97 million new jobs by 2025'
  })
  quote: string;

  @ApiProperty({
    description: 'Summary of the insight',
    example: 'Counter to popular belief, AI is projected to be a net job creator...'
  })
  summary: string;

  @ApiProperty({
    description: 'Category of the insight',
    example: 'Technology'
  })
  category: string;

  @ApiProperty({
    description: 'Type of post this insight is best suited for',
    example: 'Contrarian'
  })
  postType: string;

  @ApiProperty({
    description: 'Scoring metrics for the insight'
  })
  scores: {
    urgency: number;
    relatability: number;
    specificity: number;
    authority: number;
    total: number;
  };
}

export class ExtractInsightsResultEntity {
  @ApiProperty({
    description: 'Array of generated insight IDs',
    example: ['insight_018c7f24-3b68-7950-9f38-5f3b42c9d523']
  })
  insightIds: string[];

  @ApiProperty({
    description: 'Array of extracted insights',
    type: [InsightEntity]
  })
  insights: InsightEntity[];

  @ApiProperty({
    description: 'Processing duration in milliseconds',
    example: 3456
  })
  duration: number;

  @ApiProperty({
    description: 'Estimated cost in USD',
    example: 0.0025
  })
  cost: number;
}

export class GeneratedPostEntity {
  @ApiProperty({
    description: 'LinkedIn post components'
  })
  linkedinPost?: {
    hook: string;
    body: string;
    cta: string;
    full: string;
  };

  @ApiProperty({
    description: 'X (Twitter) post components'
  })
  xPost?: {
    hook: string;
    body: string;
    cta: string;
    full: string;
  };
}

export class GeneratePostsResultEntity {
  @ApiProperty({
    description: 'Array of generated post IDs',
    example: ['post_018c7f24-3b68-7950-9f38-5f3b42c9d523']
  })
  postIds: string[];

  @ApiProperty({
    description: 'Generated posts for different platforms'
  })
  posts: GeneratedPostEntity;

  @ApiProperty({
    description: 'Processing duration in milliseconds',
    example: 2100
  })
  duration: number;

  @ApiProperty({
    description: 'Estimated cost in USD',
    example: 0.0018
  })
  cost: number;
}