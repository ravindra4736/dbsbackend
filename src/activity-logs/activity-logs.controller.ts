import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import type { GetActivityLogsQuery } from './activity-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @Roles('super-admin', 'admin')
  async findAll(@Query() query: GetActivityLogsQuery) {
    const data = await this.activityLogsService.findAll(query);
    return {
      success: true,
      message: 'Activity logs retrieved successfully',
      data,
    };
  }
}
