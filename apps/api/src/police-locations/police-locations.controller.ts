import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreatePoliceLocationDto } from './dto/create-police-location.dto';
import { StopPoliceLocationDto } from './dto/stop-police-location.dto';
import { PoliceLocationsService } from './police-locations.service';

@Controller('police-locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PoliceLocationsController {
  constructor(
    private readonly policeLocationsService: PoliceLocationsService,
  ) {}

  @Permissions('theftReports.update')
  @Post()
  create(@Body() dto: CreatePoliceLocationDto) {
    return this.policeLocationsService.create(dto);
  }

  @Permissions('theftReports.view')
  @Get('active')
  findActive() {
    return this.policeLocationsService.findActive();
  }

  @Permissions('theftReports.view')
  @Get('dispatch/:dispatchId/history')
  findDispatchHistory(
    @Param('dispatchId') dispatchId: string,
  ) {
    return this.policeLocationsService.findDispatchHistory(
      dispatchId,
    );
  }

  @Permissions('theftReports.update')
  @Patch('stop')
  stop(@Body() dto: StopPoliceLocationDto) {
    return this.policeLocationsService.stop(dto);
  }
}