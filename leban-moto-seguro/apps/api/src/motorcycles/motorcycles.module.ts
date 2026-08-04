import { Module } from '@nestjs/common';

import { UploadsModule } from '../uploads/uploads.module';

import { MotorcyclesController } from './motorcycles.controller';
import { MotorcyclesService } from './motorcycles.service';
import { MotorcycleUploadsService } from './motorcycle-uploads.service';
import { PublicMotorcyclesController } from './public-motorcycles.controller';

@Module({
  imports: [
    UploadsModule,
  ],

  controllers: [
    MotorcyclesController,
    PublicMotorcyclesController,
  ],

  providers: [
    MotorcyclesService,
    MotorcycleUploadsService,
  ],

  exports: [
    MotorcyclesService,
    MotorcycleUploadsService,
  ],
})
export class MotorcyclesModule {}