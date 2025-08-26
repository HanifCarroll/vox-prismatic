import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiBody
} from '@nestjs/swagger';
import { AIService } from './ai.service';
import {
  CleanTranscriptDto,
  ExtractInsightsDto,
  GeneratePostsDto
} from './dto';
import {
  CleanTranscriptResultEntity,
  ExtractInsightsResultEntity,
  GeneratePostsResultEntity
} from './entities';

@ApiTags('AI')
@Controller('ai')
@UsePipes(new ValidationPipe({ transform: true }))
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('clean-transcript')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Clean a transcript using AI',
    description: 'Removes filler words, corrects grammar, and formats the transcript'
  })
  @ApiBody({ type: CleanTranscriptDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Transcript cleaned successfully',
    type: CleanTranscriptResultEntity 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid request or AI processing failed' 
  })
  async cleanTranscript(
    @Body() dto: CleanTranscriptDto
  ): Promise<CleanTranscriptResultEntity> {
    return this.aiService.cleanTranscript(dto);
  }

  @Post('extract-insights')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Extract insights from cleaned transcript',
    description: 'Uses AI to identify key insights, quotes, and generate scores'
  })
  @ApiBody({ type: ExtractInsightsDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Insights extracted successfully',
    type: ExtractInsightsResultEntity 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid request or AI processing failed' 
  })
  async extractInsights(
    @Body() dto: ExtractInsightsDto
  ): Promise<ExtractInsightsResultEntity> {
    return this.aiService.extractInsights(dto);
  }

  @Post('generate-posts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Generate social media posts from insight',
    description: 'Creates optimized posts for LinkedIn and X (Twitter) from an insight'
  })
  @ApiBody({ type: GeneratePostsDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Posts generated successfully',
    type: GeneratePostsResultEntity 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid request or AI processing failed' 
  })
  async generatePosts(
    @Body() dto: GeneratePostsDto
  ): Promise<GeneratePostsResultEntity> {
    return this.aiService.generatePosts(dto);
  }
}