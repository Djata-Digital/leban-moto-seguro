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
import { AssignDispatchDto } from './dto/assign-dispatch.dto';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { UpdateDispatchStatusDto } from './dto/update-dispatch-status.dto';
import { DispatchesService } from './dispatches.service';

@Controller('dispatches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DispatchesController {
  constructor(
    private readonly dispatchesService: DispatchesService,
  ) {}

  @Permissions('theftReports.create')
  @Post()
  create(@Body() dto: CreateDispatchDto) {
    return this.dispatchesService.create(dto);
  }

  @Permissions('theftReports.view')
  @Get()
  findAll() {
    return this.dispatchesService.findAll();
  }

  @Permissions('theftReports.view')
  @Get(':id/timeline')
  findTimeline(@Param('id') id: string) {
    return this.dispatchesService.findTimeline(id);
  }

  @Permissions('theftReports.view')
  @Get(':id/nearest-officers')
  findNearestOfficers(
    @Param('id') id: string,
  ) {
    return this.dispatchesService.findNearestOfficers(
      id,
    );
  }
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.dispatchesService.findById(id);
  }

  @Permissions('theftReports.update')
  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignDispatchDto,
  ) {
    return this.dispatchesService.assign(id, dto);
  }

  @Permissions('theftReports.update')
  @Patch(':id/accept')
  accept(
    @Param('id') id: string,
    @Body() dto: UpdateDispatchStatusDto,
  ) {
    return this.dispatchesService.accept(id, dto);
  }

  @Permissions('theftReports.update')
  @Patch(':id/on-route')
  onRoute(
    @Param('id') id: string,
    @Body() dto: UpdateDispatchStatusDto,
  ) {
    return this.dispatchesService.onRoute(id, dto);
  }

  @Permissions('theftReports.update')
  @Patch(':id/arrive')
  arrive(
    @Param('id') id: string,
    @Body() dto: UpdateDispatchStatusDto,
  ) {
    return this.dispatchesService.arrive(id, dto);
  }

  @Permissions('theftReports.update')
  @Patch(':id/search')
  startSearch(
    @Param('id') id: string,
    @Body() dto: UpdateDispatchStatusDto,
  ) {
    return this.dispatchesService.startSearch(id, dto);
  }

  @Permissions('theftReports.update')
  @Patch(':id/recover')
  recover(
    @Param('id') id: string,
    @Body() dto: UpdateDispatchStatusDto,
  ) {
    return this.dispatchesService.recover(id, dto);
  }

  @Permissions('theftReports.update')
  @Patch(':id/start')
  start(
    @Param('id') id: string,
    @Body() dto: UpdateDispatchStatusDto,
  ) {
    return this.dispatchesService.start(id, dto);
  }

  @Permissions('theftReports.update')
  @Patch(':id/resolve')
  resolve(
    @Param('id') id: string,
    @Body() dto: UpdateDispatchStatusDto,
  ) {
    return this.dispatchesService.resolve(id, dto);
  }

  @Permissions('theftReports.update')
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: UpdateDispatchStatusDto,
  ) {
    return this.dispatchesService.cancel(id, dto);
  }

  @Permissions('theftReports.update')
  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() dto: UpdateDispatchStatusDto,
  ) {
    return this.dispatchesService.addNote(id, dto);
  }
}