import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

import { DispatchesController } from './dispatches.controller';
import { DispatchesService } from './dispatches.service';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    RealtimeModule,
  ],
  controllers: [
    DispatchesController,
  ],
  providers: [
    DispatchesService,
  ],
  exports: [
    DispatchesService,
  ],
})
export class DispatchesModule {}