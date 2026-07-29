import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { RecoveryReportsController } from './recovery-reports.controller';
import { RecoveryReportsService } from './recovery-reports.service';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [RecoveryReportsController],
  providers: [RecoveryReportsService],
  exports: [RecoveryReportsService],
})
export class RecoveryReportsModule {}