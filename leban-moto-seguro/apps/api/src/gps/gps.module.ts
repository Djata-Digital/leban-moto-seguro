import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EventEngineModule } from '../event-engine/event-engine.module';
import { GpsController } from './gps.controller';
import { GpsService } from './gps.service';

@Module({
  imports: [AuditModule, EventEngineModule],
  controllers: [GpsController],
  providers: [GpsService],
  exports: [GpsService],
})
export class GpsModule {}