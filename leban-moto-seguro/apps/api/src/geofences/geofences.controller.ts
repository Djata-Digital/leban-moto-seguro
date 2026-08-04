import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';
import { GeofencesService } from './geofences.service';

@Controller('geofences')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GeofencesController {
  constructor(private readonly geofencesService: GeofencesService) {}

  @Permissions('gps.view')
  @Get()
  findAll() {
    return this.geofencesService.findAll();
  }

  @Permissions('gps.view')
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.geofencesService.findById(id);
  }

  @Permissions('gps.view')
  @Get('motorcycle/:motorcycleId')
  findByMotorcycle(@Param('motorcycleId') motorcycleId: string) {
    return this.geofencesService.findByMotorcycle(motorcycleId);
  }

  @Permissions('gps.create')
  @Post()
  create(@Body() dto: CreateGeofenceDto) {
    return this.geofencesService.create(dto);
  }

  @Permissions('gps.create')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGeofenceDto) {
    return this.geofencesService.update(id, dto);
  }

  @Permissions('gps.create')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.geofencesService.remove(id);
  }
}