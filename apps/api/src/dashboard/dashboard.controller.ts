import { Controller, Get, UseGuards } from '@nestjs/common';

import { DashboardService } from './dashboard.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Permissions('dashboard.view')
  @Get('overview')
  overview() {
    return this.dashboardService.overview();
  }

  @Permissions('dashboard.view')
  @Get('recent-activity')
  recentActivity() {
    return this.dashboardService.recentActivity();
  }

  @Permissions('dashboard.view')
  @Get('security-map')
  securityMapData() {
    return this.dashboardService.securityMapData();
  }

  @Permissions('dashboard.view')
  @Get('alerts')
  alerts() {
    return this.dashboardService.alerts();
  }
}