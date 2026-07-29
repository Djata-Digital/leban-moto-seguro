export class UpdateMotorcycleRouteDto {
  name?: string;

  originZone?: string;
  destinationZone?: string;

  allowedAreas?: string[];
  allowedDays?: string[];

  startTime?: string;
  endTime?: string;

  isActive?: boolean;
}