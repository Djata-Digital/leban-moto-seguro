import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateMotorcycleRouteDto } from './dto/create-motorcycle-route.dto';
import { UpdateMotorcycleRouteDto } from './dto/update-motorcycle-route.dto';
import { MotorcycleRoutesService } from './motorcycle-routes.service';

@Controller('motorcycle-routes')
export class MotorcycleRoutesController {
  constructor(
    private readonly motorcycleRoutesService: MotorcycleRoutesService,
  ) {}

  @Post()
  create(@Body() dto: CreateMotorcycleRouteDto) {
    return this.motorcycleRoutesService.create(dto);
  }

  @Get()
  findAll() {
    return this.motorcycleRoutesService.findAll();
  }

  @Get('motorcycle/:motorcycleId')
  findByMotorcycle(@Param('motorcycleId') motorcycleId: string) {
    return this.motorcycleRoutesService.findByMotorcycle(motorcycleId);
  }

  @Get('motorcycle/:motorcycleId/active')
  findActiveByMotorcycle(@Param('motorcycleId') motorcycleId: string) {
    return this.motorcycleRoutesService.findActiveByMotorcycle(motorcycleId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.motorcycleRoutesService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMotorcycleRouteDto) {
    return this.motorcycleRoutesService.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.motorcycleRoutesService.deactivate(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.motorcycleRoutesService.remove(id);
  }
}