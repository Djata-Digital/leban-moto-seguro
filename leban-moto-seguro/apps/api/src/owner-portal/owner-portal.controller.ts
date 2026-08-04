import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ChangeOwnerPasswordDto } from './dto/change-owner-password.dto';
import { CreateOwnerTheftReportDto } from './dto/create-owner-theft-report.dto';
import { UpdateOwnerProfileDto } from './dto/update-owner-profile.dto';
import { OwnerPortalService } from './owner-portal.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('owner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PROPRIETARIO)
export class OwnerPortalController {
  constructor(private readonly service: OwnerPortalService) {}


  @Get('profile')
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.service.getProfile(request.user.id);
  }

  @Patch('profile')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateOwnerProfileDto,
  ) {
    return this.service.updateProfile(request.user.id, dto);
  }

  @Post('profile/change-password')
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ChangeOwnerPasswordDto,
  ) {
    return this.service.changePassword(request.user.id, dto);
  }

  @Get('dashboard')
  getDashboard(@Req() request: AuthenticatedRequest) {
    return this.service.getDashboard(request.user.id);
  }

  @Get('motorcycles')
  getMotorcycles(@Req() request: AuthenticatedRequest) {
    return this.service.getMotorcycles(request.user.id);
  }

  @Get('drivers')
  getDrivers(@Req() request: AuthenticatedRequest) {
    return this.service.getDrivers(request.user.id);
  }

  @Get('tracking')
  getTracking(@Req() request: AuthenticatedRequest) {
    return this.service.getTracking(request.user.id);
  }

  @Get('motorcycles/:id/location')
  getMotorcycleLocation(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.service.getMotorcycleLocation(request.user.id, id);
  }

  @Get('motorcycles/:id/routes')
  getRouteHistory(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.service.getRouteHistory(request.user.id, id, start, end);
  }

  @Get('motorcycles/:id/routes/:routeId')
  getRouteDetails(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('routeId') routeId: string,
  ) {
    return this.service.getRouteDetails(request.user.id, id, routeId);
  }

  @Post('incidents')
  createIncident(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateOwnerTheftReportDto,
  ) {
    return this.service.createIncident(request.user.id, dto);
  }

  @Get('incidents')
  getIncidents(@Req() request: AuthenticatedRequest) {
    return this.service.getIncidents(request.user.id);
  }

  @Get('incidents/:id')
  getIncident(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.service.getIncidentById(request.user.id, id);
  }

  @Get('alerts')
  getAlerts(@Req() request: AuthenticatedRequest) {
    return this.service.getAlerts(request.user.id);
  }

  @Get('alerts/:id')
  getAlert(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.service.getAlertById(request.user.id, id);
  }

  @Patch('alerts/:id/acknowledge')
  acknowledgeAlert(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.service.acknowledgeAlert(request.user.id, id);
  }

  @Get('motorcycles/:id')
  getMotorcycle(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.getMotorcycleById(request.user.id, id);
  }
}
