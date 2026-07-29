import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateTheftReportDto } from './dto/create-theft-report.dto';
import { UpdateTheftReportDto } from './dto/update-theft-report.dto';
import { TheftReportsService } from './theft-reports.service';

@Controller('theft-reports')
export class TheftReportsController {
  constructor(private readonly theftReportsService: TheftReportsService) {}

  @Post()
  create(@Body() dto: CreateTheftReportDto) {
    return this.theftReportsService.create(dto);
  }

  @Get()
  findAll() {
    return this.theftReportsService.findAll();
  }

  @Get('open')
  findOpen() {
    return this.theftReportsService.findOpen();
  }

  @Get('motorcycle/:motorcycleId')
  findByMotorcycle(@Param('motorcycleId') motorcycleId: string) {
    return this.theftReportsService.findByMotorcycle(motorcycleId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.theftReportsService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTheftReportDto) {
    return this.theftReportsService.update(id, dto);
  }

  @Patch(':id/recovered')
  markRecovered(@Param('id') id: string) {
    return this.theftReportsService.markRecovered(id);
  }

  @Patch(':id/close')
  close(@Param('id') id: string) {
    return this.theftReportsService.close(id);
  }
}