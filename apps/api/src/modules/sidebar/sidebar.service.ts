import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SidebarCountsEntity } from './entities/sidebar-counts.entity';

@Injectable()
export class SidebarService {
  private readonly logger = new Logger(SidebarService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSidebarCounts(): Promise<SidebarCountsEntity> {
    this.logger.log('Getting sidebar badge counts');

    try {
      // Get raw transcripts that haven't been cleaned yet (status: 'raw')
      const transcriptsCount = await this.prisma.transcript.count({
        where: { status: 'raw' }
      });

      // Get insights that need review (status: 'needs_review')
      const insightsCount = await this.prisma.insight.count({
        where: { status: 'needs_review' }
      });

      // Get posts that need review (status: 'needs_review') 
      const postsCount = await this.prisma.post.count({
        where: { status: 'needs_review' }
      });

      const counts: SidebarCountsEntity = {
        transcripts: transcriptsCount,
        insights: insightsCount,
        posts: postsCount
      };

      this.logger.log(`Sidebar counts - transcripts: ${transcriptsCount}, insights: ${insightsCount}, posts: ${postsCount}`);
      return counts;
    } catch (error) {
      this.logger.error('Failed to get sidebar counts', error);
      throw error;
    }
  }
}