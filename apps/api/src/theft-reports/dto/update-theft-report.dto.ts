import { TheftReportStatus } from '@prisma/client';

export class UpdateTheftReportDto {
  status?: TheftReportStatus;
  description?: string;
  reportNumber?: string;
  locationText?: string;
  latitude?: number;
  longitude?: number;
  recoveredAt?: string;
}