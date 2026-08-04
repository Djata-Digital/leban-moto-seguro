import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { UploadsModule } from '../uploads/uploads.module';

import { PoliceOfficersController } from './police-officers.controller';
import { PoliceOfficersService } from './police-officers.service';

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
    UploadsModule,
  ],
  controllers: [
    PoliceOfficersController,
  ],
  providers: [
    PoliceOfficersService,
  ],
  exports: [
    PoliceOfficersService,
  ],
})
export class PoliceOfficersModule {}