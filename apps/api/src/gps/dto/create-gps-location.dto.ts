export class CreateGpsLocationDto {
  gpsDeviceId!: string;
  latitude!: number;
  longitude!: number;
  speed?: number;
  battery?: number;
  ignitionOn?: boolean;
  signalLevel?: number;
  recordedAt?: string;
}