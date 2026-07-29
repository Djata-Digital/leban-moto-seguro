import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { DistanceService } from './distance.service';
import { GeofenceEngineService } from './geofence-engine.service';

@Module({
  imports: [AlertsModule],
  providers: [GeofenceEngineService, DistanceService],
  exports: [GeofenceEngineService, DistanceService],
})
export class GeofenceEngineModule {}