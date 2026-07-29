import { Module } from '@nestjs/common';
import { DriverMotorcycleLinksController } from './driver-motorcycle-links.controller';
import { DriverMotorcycleLinksService } from './driver-motorcycle-links.service';

@Module({
  controllers: [DriverMotorcycleLinksController],
  providers: [DriverMotorcycleLinksService],
  exports: [DriverMotorcycleLinksService],
})
export class DriverMotorcycleLinksModule {}