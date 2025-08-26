import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SidebarService } from './sidebar.service';
import { SidebarCountsEntity } from './entities';

@ApiTags('sidebar')
@Controller('sidebar')
export class SidebarController {
  private readonly logger = new Logger(SidebarController.name);

  constructor(private readonly sidebarService: SidebarService) {}

  @Get('counts')
  @ApiOperation({
    summary: 'Get sidebar badge counts',
    description: 'Returns the count of items that need review for sidebar notifications. Includes insights with status "extracted" and posts with status "draft".'
  })
  @ApiResponse({
    status: 200,
    description: 'Sidebar counts retrieved successfully',
    type: SidebarCountsEntity
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  async getSidebarCounts(): Promise<SidebarCountsEntity> {
    this.logger.log('Getting sidebar counts');
    return await this.sidebarService.getSidebarCounts();
  }
}