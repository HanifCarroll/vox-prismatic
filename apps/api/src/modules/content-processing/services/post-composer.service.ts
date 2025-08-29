import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AIService } from '../../ai/ai.service';
import { PostStatus } from '@content-creation/types';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PostComposerService {
  private readonly logger = new Logger(PostComposerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async generatePosts(insightId: string, insightContent: string, platforms: string[]) {
    this.logger.log(`Processing post generation for insight ${insightId}`);
    
    const insight = await this.prisma.insight.findUnique({
      where: { id: insightId },
    });
    
    if (!insight) {
      throw new Error(`Insight ${insightId} not found`);
    }
    
    const result = await this.aiService.generatePosts({
      insightId,
      insightTitle: insight.title,
      content: `${insight.summary}\n\nQuote: "${insight.verbatimQuote}"`,
      platforms: platforms,
    });
    
    const posts = [];
    
    if (result.posts.linkedinPost) {
      const linkedinPost = await this.prisma.post.create({
        data: {
          insightId,
          platform: 'linkedin',
          title: result.posts.linkedinPost.hook,
          content: result.posts.linkedinPost.full,
          characterCount: result.posts.linkedinPost.full.length,
          status: PostStatus.NEEDS_REVIEW,
        },
      });
      posts.push(linkedinPost);
    }
    
    if (result.posts.xPost) {
      const xPost = await this.prisma.post.create({
        data: {
          insightId,
          platform: 'x',
          title: result.posts.xPost.hook,
          content: result.posts.xPost.full,
          characterCount: result.posts.xPost.full.length,
          status: PostStatus.NEEDS_REVIEW,
        },
      });
      posts.push(xPost);
    }
    
    return {
      posts: posts.map(post => ({
        id: post.id,
        platform: post.platform as 'linkedin' | 'x',
        title: post.title,
        content: post.content,
        characterCount: post.characterCount || 0,
      })),
      processingDurationMs: result.duration,
      estimatedTokens: 0,
      estimatedCost: result.cost,
    };
  }

  async updatePostProcessingStatus(postId: string, updates: Prisma.PostUpdateInput) {
    this.logger.log(`Updating post ${postId} processing status`);
    
    await this.prisma.post.update({
      where: { id: postId },
      data: updates,
    });
  }

  async getPost(postId: string) {
    return await this.prisma.post.findUnique({
      where: { id: postId },
    });
  }

  async updatePostJobId(postId: string, jobId: string) {
    await this.prisma.post.update({
      where: { id: postId },
      data: { queueJobId: jobId },
    });
  }

  async clearPostQueueJobId(postId: string) {
    await this.prisma.post.update({
      where: { id: postId },
      data: { queueJobId: null },
    });
  }

  async getPostsWithJobIds() {
    return await this.prisma.post.findMany({
      where: { queueJobId: { not: null } },
      select: { id: true, queueJobId: true },
    });
  }
}