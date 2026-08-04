import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';

@Controller('alerts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Permissions('alerts.create')
  @Post()
  create(@Body() dto: CreateAlertDto) {
    return this.alertsService.create(dto);
  }

  @Permissions('alerts.view')
  @Get()
  findAll() {
    return this.alertsService.findAll();
  }

  @Permissions('alerts.view')
  @Get('open')
  findOpen() {
    return this.alertsService.findOpen();
  }

  @Permissions('alerts.view')
  @Get('motorcycle/:motorcycleId')
  findByMotorcycle(@Param('motorcycleId') motorcycleId: string) {
    return this.alertsService.findByMotorcycle(motorcycleId);
  }

  @Permissions('alerts.view')
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.alertsService.findById(id);
  }

  @Permissions('alerts.acknowledge')
  @Patch(':id/acknowledge')
  acknowledge(@Param('id') id: string, @Body() dto: UpdateAlertStatusDto) {
    return this.alertsService.acknowledge(id, dto);
  }

  @Permissions('alerts.resolve')
  @Patch(':id/resolve')
  resolve(@Param('id') id: string, @Body() dto: UpdateAlertStatusDto) {
    return this.alertsService.resolve(id, dto);
  }

  @Permissions('alerts.dismiss')
  @Patch(':id/dismiss')
  dismiss(@Param('id') id: string, @Body() dto: UpdateAlertStatusDto) {
    return this.alertsService.dismiss(id, dto);
  }
}