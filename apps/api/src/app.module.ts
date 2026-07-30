import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DriverMotorcycleLinksModule } from './driver-motorcycle-links/driver-motorcycle-links.module';
import { DriversModule } from './drivers/drivers.module';
import { MotorcyclesModule } from './motorcycles/motorcycles.module';
import { OwnersModule } from './owners/owners.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { MotorcycleRoutesModule } from './motorcycle-routes/motorcycle-routes.module';
import { RouteAuthorizationsModule } from './route-authorizations/route-authorizations.module';
import { AuditModule } from './audit/audit.module';
import { UploadsModule } from './uploads/uploads.module';
import { TheftReportsModule } from './theft-reports/theft-reports.module';
import { PoliceModule } from './police/police.module';
import { GpsModule } from './gps/gps.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AlertsModule } from './alerts/alerts.module';
import { EventEngineModule } from './event-engine/event-engine.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PermissionsModule } from './permissions/permissions.module';
import { GeofenceEngineModule } from './geofence-engine/geofence-engine.module';
import { GeofencesModule } from './geofences/geofences.module';
import { DispatchesModule } from './dispatches/dispatches.module';
import { PoliceOfficersModule } from './police-officers/police-officers.module';
import { PoliceLocationsModule } from './police-locations/police-locations.module';
import { DispatchMessagesModule } from './dispatch-messages/dispatch-messages.module';
import { RecoveryEvidencesModule } from './recovery-evidences/recovery-evidences.module';
import { RecoveryReportsModule } from './recovery-reports/recovery-reports.module';
import { OwnerPortalModule } from './owner-portal/owner-portal.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    OwnersModule,
    DriversModule,
    MotorcyclesModule,
    DriverMotorcycleLinksModule,
    MotorcycleRoutesModule,
    RouteAuthorizationsModule,
    AuditModule,
    UploadsModule,
    TheftReportsModule,
    PoliceModule,
    GpsModule,
    DashboardModule,
    AlertsModule,
    EventEngineModule,
    RealtimeModule,
    PermissionsModule,
    GeofenceEngineModule,
    GeofencesModule,
    DispatchesModule,
    PoliceOfficersModule,
    PoliceLocationsModule,
    DispatchMessagesModule,
    RecoveryEvidencesModule,
    RecoveryReportsModule,
    OwnerPortalModule,
    CloudinaryModule,
  ],
})
export class AppModule {}