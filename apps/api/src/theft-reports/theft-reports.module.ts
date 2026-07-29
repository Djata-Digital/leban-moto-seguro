import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TheftReportsController } from './theft-reports.controller';
import { TheftReportsService } from './theft-reports.service';

@Module({
  imports: [AuditModule],
  controllers: [TheftReportsController],
  providers: [TheftReportsService],
  exports: [TheftReportsService],
})
export class TheftReportsModule {}