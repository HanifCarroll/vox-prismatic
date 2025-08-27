import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardDataEntity, DashboardStatsEntity } from './entities';

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
}