import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateDriverMotorcycleLinkDto } from './dto/create-driver-motorcycle-link.dto';
import { UpdateDriverMotorcycleLinkDto } from './dto/update-driver-motorcycle-link.dto';
import { DriverMotorcycleLinksService } from './driver-motorcycle-links.service';

@Controller('driver-motorcycle-links')
export class DriverMotorcycleLinksController {
  constructor(
    private readonly driverMotorcycleLinksService: DriverMotorcycleLinksService,
  ) {}

  @Post()
  create(@Body() dto: CreateDriverMotorcycleLinkDto) {
    return this.driverMotorcycleLinksService.create(dto);
  }

  @Get()
  findAll() {
    return this.driverMotorcycleLinksService.findAll();
  }

  @Get('motorcycle/:motorcycleId')
  findByMotorcycle(@Param('motorcycleId') motorcycleId: string) {
    return this.driverMotorcycleLinksService.findByMotorcycle(motorcycleId);
  }

  @Get('driver/:driverId')
  findByDriver(@Param('driverId') driverId: string) {
    return this.driverMotorcycleLinksService.findByDriver(driverId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.driverMotorcycleLinksService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDriverMotorcycleLinkDto,
  ) {
    return this.driverMotorcycleLinksService.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.driverMotorcycleLinksService.deactivate(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.driverMotorcycleLinksService.remove(id);
  }
}