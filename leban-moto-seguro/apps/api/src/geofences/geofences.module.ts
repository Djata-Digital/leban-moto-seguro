import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { GeofencesController } from './geofences.controller';
import { GeofencesService } from './geofences.service';

@Module({
  imports: [AuditModule],
  controllers: [GeofencesController],
  providers: [GeofencesService],
  exports: [GeofencesService],
})
export class GeofencesModule {}