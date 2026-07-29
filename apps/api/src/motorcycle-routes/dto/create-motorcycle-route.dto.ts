export class CreateMotorcycleRouteDto {
  motorcycleId!: string;
  name!: string;

  originZone?: string;
  destinationZone?: string;

  allowedAreas?: string[];
  allowedDays?: string[];

  startTime?: string;
  endTime?: string;
}