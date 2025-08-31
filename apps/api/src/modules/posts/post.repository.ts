import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PostEntity } from './entities/post.entity';
import { CreatePostDto, UpdatePostDto } from './dto';
import { PostStatus } from '@content-creation/types';
@Injectable()
export class PostRepository {
  private readonly logger = new Logger(PostRepository.name);

  constructor(public readonly prisma: PrismaService) {}

  async create(data: CreatePostDto & { id: string }): Promise<PostEntity> {
    const characterCount = data.content.length;
    
    const post = await this.prisma.post.create({
      data: {
        id: data.id,
        insightId: data.insightId,
        title: data.title,
        platform: data.platform,
        content: data.content,
        status: PostStatus.DRAFT,
        characterCount,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        insight: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            totalScore: true,
          },
        },
      },
    });

    return this.mapToEntity(post);
  }

  async findById(id: string, includeSchedule = false): Promise<PostEntity | null> {
    const include: any = {
      insight: {
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          totalScore: true,
        },
      },
    };

    if (includeSchedule) {
      include.scheduledPosts = {
        orderBy: { createdAt: 'desc' },
        take: 1, // Get most recent scheduling
      };
    }

    const post = await this.prisma.post.findUnique({
      where: { id },
      include,
    });

    if (!post) return null;
    return this.mapToEntity(post);
  }

  async findAll(): Promise<PostEntity[]> {
    // Simple fetch all, ordered by updatedAt
    const posts = await this.prisma.post.findMany({
      include: {
        insight: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            totalScore: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10000, // Safety limit
    });

    return posts.map(post => this.mapToEntity(post));
  }

  async update(id: string, data: Partial<UpdatePostDto>): Promise<PostEntity> {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // Update character count if content changed
    if (data.content) {
      updateData.characterCount = data.content.length;
    }

    // Note: hashtags and metadata not supported in simplified schema

    const post = await this.prisma.post.update({
      where: { id },
      data: updateData,
      include: {
        insight: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            totalScore: true,
          },
        },
      },
    });

    return this.mapToEntity(post);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.post.delete({ where: { id } });
  }

  async findByStatus(status: string): Promise<PostEntity[]> {
    const posts = await this.prisma.post.findMany({
      where: { status },
      include: {
        insight: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            totalScore: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return posts.map(post => this.mapToEntity(post));
  }

  async findByInsightId(insightId: string): Promise<PostEntity[]> {
    const posts = await this.prisma.post.findMany({
      where: { insightId },
      include: {
        insight: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            totalScore: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return posts.map(post => this.mapToEntity(post));
  }

  async getPlatformCounts(): Promise<Record<string, number>> {
    const counts = await this.prisma.post.groupBy({
      by: ['platform'],
      _count: true,
    });

    return counts.reduce((acc, item) => {
      acc[item.platform] = item._count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Count all posts
   * Simplified version without filters
   */
  async count(): Promise<number> {
    return await this.prisma.post.count();
  }

  /**
   * Count posts by status
   * Used for statistics
   */
  async countByStatus(status: string): Promise<number> {
    return await this.prisma.post.count({
      where: { status }
    });
  }

  private mapToEntity(data: any): PostEntity {
    return {
      id: data.id,
      insightId: data.insightId,
      title: data.title,
      platform: data.platform,
      content: data.content,
      status: data.status,
      characterCount: data.characterCount,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      queueJobId: data.queueJobId || undefined,
      errorMessage: data.errorMessage || undefined,
      rejectedAt: data.rejectedAt || undefined,
      rejectedBy: data.rejectedBy || undefined,
      rejectedReason: data.rejectedReason || undefined,
      approvedAt: data.approvedAt || undefined,
      approvedBy: data.approvedBy || undefined,
      archivedAt: data.archivedAt || undefined,
      archivedReason: data.archivedReason || undefined,
      failedAt: data.failedAt || undefined,
      insight: data.insight ? {
        id: data.insight.id,
        title: data.insight.title,
        category: data.insight.category,
        status: data.insight.status,
        totalScore: data.insight.totalScore,
      } : undefined,
      scheduledPost: data.scheduledPosts && data.scheduledPosts.length > 0 ? {
        id: data.scheduledPosts[0].id,
        scheduledTime: data.scheduledPosts[0].scheduledTime,
        platform: data.scheduledPosts[0].platform,
        status: data.scheduledPosts[0].status,
        retryCount: data.scheduledPosts[0].retryCount,
        lastAttempt: data.scheduledPosts[0].lastAttempt,
        errorMessage: data.scheduledPosts[0].errorMessage,
        externalPostId: data.scheduledPosts[0].externalPostId,
      } : undefined,
    };
  }

  async getStatusCounts(): Promise<Record<string, number>> {
    const counts = await this.prisma.post.groupBy({
      by: ['status'],
      _count: {
        _all: true
      }
    });

    const result: Record<string, number> = {};
    let total = 0;
    
    for (const item of counts) {
      result[item.status] = item._count._all;
      total += item._count._all;
    }
    
    result.total = total;
    return result;
  }

  // Remove findAllWithMetadata method entirely
}