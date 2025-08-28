import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardDataEntity, DashboardStatsEntity } from './entities';
import { DashboardActionableEntity } from './entities/dashboard-actionable.entity';
import { PublishingScheduleEntity } from './entities/dashboard-schedule.entity';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get comprehensive dashboard data',
    description: 'Returns complete dashboard overview including counts by status for all content types, platform breakdowns for scheduled posts, and recent activity feed across all content types.'
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    type: DashboardDataEntity
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  async getDashboardData(): Promise<DashboardDataEntity> {
    this.logger.log('Getting comprehensive dashboard data');
    return await this.dashboardService.getDashboardData();
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description: 'Returns simple count statistics for all content types. Lighter alternative to the full dashboard data endpoint.'
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved successfully',
    type: DashboardStatsEntity
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  async getDashboardStats(): Promise<DashboardStatsEntity> {
    this.logger.log('Getting dashboard statistics');
    return await this.dashboardService.getStats();  // Method name is getStats, not getDashboardStats
  }

  @Get('actionable')
  @ApiOperation({
    summary: 'Get actionable items requiring user attention',
    description: 'Returns prioritized list of items that need immediate action, review, or processing. Includes failed posts, pending reviews, and ready-to-process content.'
  })
  @ApiResponse({
    status: 200,
    description: 'Actionable items retrieved successfully',
    type: DashboardActionableEntity
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  async getActionableItems(): Promise<DashboardActionableEntity> {
    this.logger.log('Getting actionable items');
    return await this.dashboardService.getActionableItems();
  }

  @Get('schedule')
  @ApiOperation({
    summary: 'Get detailed publishing schedule',
    description: 'Returns comprehensive publishing schedule including next post, hourly breakdown for today, daily breakdown for the week, scheduling gaps, and platform distribution.'
  })
  @ApiResponse({
    status: 200,
    description: 'Publishing schedule retrieved successfully',
    type: PublishingScheduleEntity
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  async getPublishingSchedule(): Promise<PublishingScheduleEntity> {
    this.logger.log('Getting publishing schedule');
    return await this.dashboardService.getPublishingSchedule();
  }
}