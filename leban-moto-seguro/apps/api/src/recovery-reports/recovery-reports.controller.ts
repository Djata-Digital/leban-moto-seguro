import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateRecoveryReportDto } from './dto/create-recovery-report.dto';
import { RecoveryReportsService } from './recovery-reports.service';

@Controller('recovery-reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecoveryReportsController {
  constructor(
    private readonly recoveryReportsService: RecoveryReportsService,
  ) {}

  @Post()
  @Permissions('theftReports.update')
  create(@Body() dto: CreateRecoveryReportDto) {
    return this.recoveryReportsService.create(dto);
  }

  @Get('dispatch/:dispatchId')
  @Permissions('theftReports.view')
  findByDispatch(
    @Param('dispatchId') dispatchId: string,
  ) {
    return this.recoveryReportsService.findByDispatch(dispatchId);
  }
}