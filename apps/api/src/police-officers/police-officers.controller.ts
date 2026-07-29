import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePoliceOfficerDto } from './dto/create-police-officer.dto';
import { UpdatePoliceOfficerDto } from './dto/update-police-officer.dto';
import { UpdatePoliceStatusDto } from './dto/update-police-status.dto';
import { PoliceOfficersService } from './police-officers.service';
import { CreatePoliceLocationDto } from './dto/create-police-location.dto';

@Controller('police-officers')
@UseGuards(JwtAuthGuard)
export class PoliceOfficersController {
  constructor(
    private readonly policeOfficersService: PoliceOfficersService,
  ) {}

  @Post()
  create(@Body() dto: CreatePoliceOfficerDto) {
    return this.policeOfficersService.create(dto);
  }

  @Get()
  findAll() {
    return this.policeOfficersService.findAll();
  }

  @Get(':id/dispatches')
  findDispatches(@Param('id') id: string) {
    return this.policeOfficersService.findDispatches(id);
  }

  @Post(':id/locations')
  createLocation(
    @Param('id') id: string,
    @Body() dto: CreatePoliceLocationDto,
  ) {
    return this.policeOfficersService.createLocation(
      id,
      dto,
    );
  }

  @Get('locations/live')
  findLiveLocations() {
    return this.policeOfficersService.findLiveLocations();
  }

  @Get(':id/locations/history')
  findLocationHistory(
    @Param('id') id: string,
    @Query('dispatchId') dispatchId?: string,
  ) {
    return this.policeOfficersService.findLocationHistory(
      id,
      dispatchId,
    );
  }

  @Patch(':id/locations/stop')
  stopLocationSharing(
    @Param('id') id: string,
  ) {
    return this.policeOfficersService.stopLocationSharing(
      id,
    );
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.policeOfficersService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePoliceOfficerDto,
  ) {
    return this.policeOfficersService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePoliceStatusDto,
  ) {
    return this.policeOfficersService.updateStatus(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.policeOfficersService.remove(id);
  }
}