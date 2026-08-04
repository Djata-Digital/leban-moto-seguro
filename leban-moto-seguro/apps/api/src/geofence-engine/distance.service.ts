import { Injectable } from '@nestjs/common';
import { haversineDistanceMeters } from './utils/haversine';

@Injectable()
export class DistanceService {
  distanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    return haversineDistanceMeters(lat1, lng1, lat2, lng2);
  }

  isInsideCircle(
    pointLat: number,
    pointLng: number,
    centerLat: number,
    centerLng: number,
    radiusMeters: number,
  ): boolean {
    const distance = this.distanceMeters(
      pointLat,
      pointLng,
      centerLat,
      centerLng,
    );

    return distance <= radiusMeters;
  }
}