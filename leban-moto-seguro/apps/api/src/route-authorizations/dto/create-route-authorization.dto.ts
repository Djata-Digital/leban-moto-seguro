export class CreateRouteAuthorizationDto {
  motorcycleId!: string;
  driverId!: string;
  routeId?: string;
  requestedDestination!: string;
  reason?: string;
  startDateTime!: string;
  endDateTime!: string;
}