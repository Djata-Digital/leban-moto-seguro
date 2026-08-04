import { AlertSeverity, AlertType } from '@prisma/client';

export class CreateAlertDto {
  type!: AlertType;
  severity!: AlertSeverity;

  title!: string;
  message!: string;

  motorcycleId?: string;
  gpsDeviceId?: string;
  theftReportId?: string;

  latitude?: number;
  longitude?: number;

  metadata?: any;
}