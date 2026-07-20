import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';
import type { GetActivityLogsQuery } from './activity-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('activity-logs')
@ApiBearerAuth()
@Controller('activity-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ACTIVITY_VIEW)
  @ApiOperation({ summary: 'List activity logs' })
  async findAll(@Query() query: GetActivityLogsQuery) {
    const data = await this.activityLogsService.findAll(query);
    return {
      success: true,
      message: 'Activity logs retrieved successfully',
      data,
    };
  }
}
