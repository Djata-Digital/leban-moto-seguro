import { Module } from '@nestjs/common';

import { UploadsModule } from '../uploads/uploads.module';

import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

@Module({
  imports: [UploadsModule],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}