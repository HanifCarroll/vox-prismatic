import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../database/prisma.service';
import { IdGeneratorService } from '../shared/services/id-generator.service';
import {
  CleanTranscriptDto,
  ExtractInsightsDto,
  GeneratePostsDto
} from './dto';
import {
  CleanTranscriptResultEntity,
  ExtractInsightsResultEntity,
  GeneratePostsResultEntity,
  InsightEntity,
  GeneratedPostEntity
} from './entities';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private genAI: GoogleGenerativeAI;
  private flashModel: any;
  private proModel: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly idGenerator: IdGeneratorService
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.flashModel = this.genAI.getGenerativeModel({ 
      model: this.configService.get<string>('GEMINI_FLASH_MODEL', 'gemini-1.5-flash') 
    });
    this.proModel = this.genAI.getGenerativeModel({ 
      model: this.configService.get<string>('GEMINI_PRO_MODEL', 'gemini-1.5-pro') 
    });
  }

  /**
   * Estimates token usage (rough approximation: 4 characters ≈ 1 token)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimates cost for Gemini models
   */
  private estimateCost(
    inputTokens: number,
    outputTokens: number,
    modelType: 'flash' | 'pro'
  ): number {
    const rates = {
      flash: { input: 0.075 / 1000000, output: 0.3 / 1000000 },
      pro: { input: 1.25 / 1000000, output: 5.0 / 1000000 },
    };

    const rate = rates[modelType];
    return inputTokens * rate.input + outputTokens * rate.output;
  }

  /**
   * Clean transcript content using AI
   */
  async cleanTranscript(dto: CleanTranscriptDto): Promise<CleanTranscriptResultEntity> {
    const startTime = Date.now();
    this.logger.log(`Cleaning transcript: ${dto.transcriptId}`);

    try {
      // Build the prompt
      const prompt = dto.customPrompt || `
Clean the following transcript by:
1. Removing filler words (um, uh, you know, etc.)
2. Correcting grammar and punctuation
3. Organizing into clear paragraphs
4. Preserving the original meaning and tone
5. Keeping important quotes verbatim

Title: ${dto.title}

Transcript:
${dto.content}

Return only the cleaned transcript text, nothing else.`;

      // Generate cleaned content
      const result = await this.flashModel.generateContent(prompt, {
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.1,
        },
      });

      const response = await result.response;
      const cleanedText = response.text();

      const duration = Date.now() - startTime;
      const inputTokens = this.estimateTokens(prompt);
      const outputTokens = this.estimateTokens(cleanedText);
      const cost = this.estimateCost(inputTokens, outputTokens, 'flash');

      // Update the transcript in the database
      await this.prisma.transcript.update({
        where: { id: dto.transcriptId },
        data: {
          cleanedContent: cleanedText,
          status: 'cleaned',
          processingDurationMs: duration,
          estimatedTokens: outputTokens,
          estimatedCost: cost,
          updatedAt: new Date()
        }
      });

      this.logger.log(`Transcript cleaned successfully: ${dto.transcriptId}`);

      return {
        cleanedTranscriptId: dto.transcriptId,
        cleanedText,
        duration,
        cost,
        tokens: outputTokens
      };
    } catch (error) {
      this.logger.error('Failed to clean transcript:', error);
      throw new BadRequestException('Failed to clean transcript');
    }
  }

  /**
   * Extract insights from cleaned transcript
   */
  async extractInsights(dto: ExtractInsightsDto): Promise<ExtractInsightsResultEntity> {
    const startTime = Date.now();
    this.logger.log(`Extracting insights from transcript: ${dto.transcriptId}`);

    try {
      // Build the prompt
      const prompt = dto.customPrompt || `
Extract 5-10 key insights from this transcript. For each insight:
1. Create a compelling title
2. Include a verbatim quote that supports it
3. Write a brief summary
4. Categorize it (Technology, Business, Personal Development, etc.)
5. Score it on: urgency (0-10), relatability (0-10), specificity (0-10), authority (0-10)
6. Assign a post type: Problem, Solution, Contrarian, Story, or Educational

Transcript:
${dto.content}

Return as JSON in this exact format:
{
  "insights": [
    {
      "title": "string",
      "verbatimQuote": "string",
      "summary": "string",
      "category": "string",
      "postType": "string",
      "scores": {
        "urgency": number,
        "relatability": number,
        "specificity": number,
        "authority": number,
        "total": number
      }
    }
  ]
}`;

      // Generate insights
      const result = await this.proModel.generateContent(prompt, {
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      });

      const response = await result.response;
      let text = response.text();

      // Remove markdown code block wrapping if present
      if (text.startsWith('```json')) {
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const jsonResponse = JSON.parse(text);
      const insights = this.parseJsonInsights(jsonResponse);

      const duration = Date.now() - startTime;
      const inputTokens = this.estimateTokens(prompt);
      const outputTokens = this.estimateTokens(text);
      const cost = this.estimateCost(inputTokens, outputTokens, 'pro');

      // Save insights to database
      const insightIds: string[] = [];
      
      for (const insight of insights) {
        const insightId = this.idGenerator.generate('insight');
        
        await this.prisma.insight.create({
          data: {
            id: insightId,
            transcriptId: dto.transcriptId,
            title: insight.title,
            summary: insight.summary,
            verbatimQuote: insight.quote,
            category: insight.category,
            postType: insight.postType,
            urgencyScore: insight.scores.urgency,
            relatabilityScore: insight.scores.relatability,
            specificityScore: insight.scores.specificity,
            authorityScore: insight.scores.authority,
            status: 'extracted',
            processingDurationMs: Math.round(duration / insights.length),
            estimatedTokens: Math.round(outputTokens / insights.length),
            estimatedCost: cost / insights.length,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        insightIds.push(insightId);
      }

      // Update transcript status
      await this.prisma.transcript.update({
        where: { id: dto.transcriptId },
        data: {
          status: 'insights_generated',
          updatedAt: new Date()
        }
      });

      this.logger.log(`Extracted ${insights.length} insights from transcript: ${dto.transcriptId}`);

      return {
        insightIds,
        insights,
        duration,
        cost
      };
    } catch (error) {
      this.logger.error('Failed to extract insights:', error);
      throw new BadRequestException('Failed to extract insights');
    }
  }

  /**
   * Generate social media posts from insight
   */
  async generatePosts(dto: GeneratePostsDto): Promise<GeneratePostsResultEntity> {
    const startTime = Date.now();
    this.logger.log(`Generating posts for insight: ${dto.insightId}`);

    try {
      const platforms = dto.platforms || ['linkedin', 'x'];
      
      // Build the prompt
      const prompt = dto.customPrompt || `
Create social media posts based on this insight:

Title: ${dto.insightTitle}
Content: ${dto.content}

Generate posts for: ${platforms.join(', ')}

For LinkedIn:
- Hook: Attention-grabbing opening (1-2 lines)
- Body: Main content with value and details (3-5 paragraphs)
- CTA: Soft call-to-action or question
- Full: Complete post ready to publish (hook + body + CTA)

For X (Twitter):
- Hook: Compelling opener (1 line)
- Body: Core message (2-3 lines)
- CTA: Engagement driver
- Full: Complete tweet (max 280 chars) or thread starter

Return as JSON in this exact format:
{
  "linkedinPost": {
    "hook": "string",
    "body": "string",
    "cta": "string",
    "full": "string"
  },
  "xPost": {
    "hook": "string",
    "body": "string",
    "cta": "string",
    "full": "string"
  }
}`;

      // Generate posts
      const result = await this.proModel.generateContent(prompt, {
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      });

      const response = await result.response;
      let text = response.text();

      // Remove markdown code block wrapping if present
      if (text.startsWith('```json')) {
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const jsonResponse = JSON.parse(text);
      const posts: GeneratedPostEntity = {
        linkedinPost: jsonResponse.linkedinPost,
        xPost: jsonResponse.xPost
      };

      const duration = Date.now() - startTime;
      const inputTokens = this.estimateTokens(prompt);
      const outputTokens = this.estimateTokens(text);
      const cost = this.estimateCost(inputTokens, outputTokens, 'pro');

      // Save posts to database
      const postIds: string[] = [];

      if (platforms.includes('linkedin') && posts.linkedinPost) {
        const postId = this.idGenerator.generate('post');
        
        await this.prisma.post.create({
          data: {
            id: postId,
            insightId: dto.insightId,
            title: `${dto.insightTitle} (LinkedIn)`,
            platform: 'linkedin',
            content: posts.linkedinPost.full,
            hook: posts.linkedinPost.hook,
            body: posts.linkedinPost.body,
            softCta: posts.linkedinPost.cta,
            status: 'draft',
            processingDurationMs: Math.round(duration / platforms.length),
            estimatedTokens: Math.round(outputTokens / platforms.length),
            estimatedCost: cost / platforms.length,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        postIds.push(postId);
      }

      if (platforms.includes('x') && posts.xPost) {
        const postId = this.idGenerator.generate('post');
        
        await this.prisma.post.create({
          data: {
            id: postId,
            insightId: dto.insightId,
            title: `${dto.insightTitle} (X)`,
            platform: 'x',
            content: posts.xPost.full,
            hook: posts.xPost.hook,
            body: posts.xPost.body,
            softCta: posts.xPost.cta,
            status: 'draft',
            processingDurationMs: Math.round(duration / platforms.length),
            estimatedTokens: Math.round(outputTokens / platforms.length),
            estimatedCost: cost / platforms.length,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        postIds.push(postId);
      }

      // Update insight status
      await this.prisma.insight.update({
        where: { id: dto.insightId },
        data: {
          status: 'approved',
          updatedAt: new Date()
        }
      });

      this.logger.log(`Generated ${postIds.length} posts for insight: ${dto.insightId}`);

      return {
        postIds,
        posts,
        duration,
        cost
      };
    } catch (error) {
      this.logger.error('Failed to generate posts:', error);
      throw new BadRequestException('Failed to generate posts');
    }
  }

  /**
   * Parse JSON insights response into typed objects
   */
  private parseJsonInsights(jsonResponse: any): InsightEntity[] {
    const insights: InsightEntity[] = [];

    if (!jsonResponse.insights || !Array.isArray(jsonResponse.insights)) {
      return insights;
    }

    for (const item of jsonResponse.insights) {
      const insight: InsightEntity = {
        title: item.title || 'Untitled',
        quote: item.verbatimQuote || '',
        summary: item.summary || '',
        category: item.category || 'Unknown',
        scores: {
          urgency: item.scores?.urgency || 0,
          relatability: item.scores?.relatability || 0,
          specificity: item.scores?.specificity || 0,
          authority: item.scores?.authority || 0,
          total: item.scores?.total || 0,
        },
        postType: item.postType || 'Problem',
      };
      insights.push(insight);
    }

    return insights;
  }
}