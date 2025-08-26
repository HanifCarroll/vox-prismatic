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
      // Get insights that need review (status: 'extracted')
      const insightsCount = await this.prisma.insight.count({
        where: { status: 'extracted' }
      });

      // Get posts that need review (status: 'draft') 
      const postsCount = await this.prisma.post.count({
        where: { status: 'draft' }
      });

      const counts: SidebarCountsEntity = {
        insights: insightsCount,
        posts: postsCount
      };

      this.logger.log(`Sidebar counts - insights: ${insightsCount}, posts: ${postsCount}`);
      return counts;
    } catch (error) {
      this.logger.error('Failed to get sidebar counts', error);
      throw error;
    }
  }
}