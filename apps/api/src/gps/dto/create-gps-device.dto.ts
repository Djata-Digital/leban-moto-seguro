export class CreateGpsDeviceDto {
  motorcycleId!: string;
  imei!: string;
  simNumber?: string;
  provider?: string;
  deviceModel?: string;
  hasBackupBattery?: boolean;
}