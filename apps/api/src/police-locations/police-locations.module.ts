import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PoliceLocationsController } from './police-locations.controller';
import { PoliceLocationsService } from './police-locations.service';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [PoliceLocationsController],
  providers: [PoliceLocationsService],
  exports: [PoliceLocationsService],
})
export class PoliceLocationsModule {}