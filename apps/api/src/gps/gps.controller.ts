import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CreateGpsDeviceDto } from './dto/create-gps-device.dto';
import { CreateGpsLocationDto } from './dto/create-gps-location.dto';
import { GpsService } from './gps.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { GpsHistoryQueryDto } from './dto/gps-history-query.dto';

@Controller('gps')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GpsController {
  constructor(private readonly gpsService: GpsService) {}

  // =========================
  // GPS DEVICES
  // =========================

  @Permissions('gps.create')
  @Post('devices')
  createDevice(@Body() dto: CreateGpsDeviceDto) {
    return this.gpsService.createDevice(dto);
  }

  @Permissions('gps.view')
  @Get('devices')
  findDevices() {
    return this.gpsService.findDevices();
  }

  @Permissions('gps.view')
  @Get('devices/:id')
  findDeviceById(@Param('id') id: string) {
    return this.gpsService.findDeviceById(id);
  }

  @Permissions('gps.view')
  @Get('motorcycle/:motorcycleId/devices')
  findDevicesByMotorcycle(
    @Param('motorcycleId') motorcycleId: string,
  ) {
    return this.gpsService.findDevicesByMotorcycle(motorcycleId);
  }

  @Permissions('gps.create')
  @Patch('devices/:id/deactivate')
  deactivateDevice(@Param('id') id: string) {
    return this.gpsService.deactivateDevice(id);
  }

  @Permissions('gps.create')
  @Patch('devices/:id/activate')
  activateDevice(@Param('id') id: string) {
    return this.gpsService.activateDevice(id);
  }

  // =========================
  // GPS LOCATIONS
  // =========================

  @Permissions('gps.location.create')
  @Post('locations')
  createLocation(@Body() dto: CreateGpsLocationDto) {
    return this.gpsService.createLocation(dto);
  }

  @Permissions('gps.track')
  @Get('motorcycle/:motorcycleId/last-location')
  getLastLocationByMotorcycle(
    @Param('motorcycleId') motorcycleId: string,
  ) {
    return this.gpsService.getLastLocationByMotorcycle(motorcycleId);
  }

  @Permissions('gps.track')
  @Get('motorcycle/:motorcycleId/history')
  getHistoryByMotorcycle(
    @Param('motorcycleId') motorcycleId: string,
    @Query() query: GpsHistoryQueryDto,
  ) {
    return this.gpsService.getHistoryByMotorcycle(motorcycleId, query);
  }
}