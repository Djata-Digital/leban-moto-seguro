import { GeofenceShape, GeofenceType } from '@prisma/client';

export class UpdateGeofenceDto {
  name?: string;
  type?: GeofenceType;
  shape?: GeofenceShape;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  isActive?: boolean;
}