import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AIService } from './ai.service';

@ApiTags('AI')
@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  // Manual AI endpoints removed - use automated content processing pipeline
  // POST /content-processing/transcripts/:id/clean - triggers automated cleaning → insights → posts
  // POST /content-processing/insights/:id/generate-posts - generates posts from reviewed insights
  //
  // The AI service methods are still available for internal use by queue processors
}