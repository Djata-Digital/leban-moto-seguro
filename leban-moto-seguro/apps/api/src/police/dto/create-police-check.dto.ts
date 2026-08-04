export class CreatePoliceCheckDto {
  policeOfficerId!: string;
  motorcycleId?: string;
  plateNumber?: string;
  chassisNumber?: string;
  locationText?: string;
  latitude?: number;
  longitude?: number;
  result?: string;
  notes?: string;
}