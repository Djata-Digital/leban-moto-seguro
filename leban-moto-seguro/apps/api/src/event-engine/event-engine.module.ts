import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { GeofenceEngineModule } from '../geofence-engine/geofence-engine.module';
import { EventEngineService } from './event-engine.service';

@Module({
  imports: [AlertsModule, GeofenceEngineModule],
  providers: [EventEngineService],
  exports: [EventEngineService],
})
export class EventEngineModule {}