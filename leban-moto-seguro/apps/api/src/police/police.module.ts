import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PoliceController } from './police.controller';
import { PoliceService } from './police.service';

@Module({
  imports: [AuditModule],
  controllers: [PoliceController],
  providers: [PoliceService],
  exports: [PoliceService],
})
export class PoliceModule {}