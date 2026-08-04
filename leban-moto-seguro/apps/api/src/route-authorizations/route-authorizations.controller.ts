import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateRouteAuthorizationDto } from './dto/create-route-authorization.dto';
import { DecideRouteAuthorizationDto } from './dto/decide-route-authorization.dto';
import { RouteAuthorizationsService } from './route-authorizations.service';

@Controller('route-authorizations')
export class RouteAuthorizationsController {
  constructor(
    private readonly routeAuthorizationsService: RouteAuthorizationsService,
  ) {}

  @Post()
  create(@Body() dto: CreateRouteAuthorizationDto) {
    return this.routeAuthorizationsService.create(dto);
  }

  @Get()
  findAll() {
    return this.routeAuthorizationsService.findAll();
  }

  @Get('motorcycle/:motorcycleId')
  findByMotorcycle(@Param('motorcycleId') motorcycleId: string) {
    return this.routeAuthorizationsService.findByMotorcycle(motorcycleId);
  }

  @Get('motorcycle/:motorcycleId/active')
  findActiveByMotorcycle(@Param('motorcycleId') motorcycleId: string) {
    return this.routeAuthorizationsService.findActiveByMotorcycle(motorcycleId);
  }

  @Get('driver/:driverId')
  findByDriver(@Param('driverId') driverId: string) {
    return this.routeAuthorizationsService.findByDriver(driverId);
  }

  @Get('verify/:verificationCode')
  verifyByCode(@Param('verificationCode') verificationCode: string) {
    return this.routeAuthorizationsService.verifyByCode(verificationCode);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.routeAuthorizationsService.findById(id);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body() dto: DecideRouteAuthorizationDto) {
    return this.routeAuthorizationsService.approve(id, dto);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: DecideRouteAuthorizationDto) {
    return this.routeAuthorizationsService.reject(id, dto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: DecideRouteAuthorizationDto) {
    return this.routeAuthorizationsService.cancel(id, dto);
  }
}