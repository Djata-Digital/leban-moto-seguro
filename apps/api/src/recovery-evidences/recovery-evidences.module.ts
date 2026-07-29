import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { RecoveryEvidencesController } from './recovery-evidences.controller';
import { RecoveryEvidencesService } from './recovery-evidences.service';

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
  ],

  controllers: [
    RecoveryEvidencesController,
  ],

  providers: [
    RecoveryEvidencesService,
  ],

  exports: [
    RecoveryEvidencesService,
  ],
})
export class RecoveryEvidencesModule {}