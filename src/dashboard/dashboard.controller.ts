import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Admin dashboard summary aggregates' })
  async getSummary() {
    const data = await this.dashboardService.getSummary();
    return {
      success: true,
      message: 'Dashboard summary retrieved successfully',
      data,
    };
  }
}
