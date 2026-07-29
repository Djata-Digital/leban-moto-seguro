export class CreatePoliceOfficerDto {
  userId!: string;
  fullName!: string;
  identityNumber?: string;
  badgeNumber?: string;
  stationName?: string;
  phone?: string;
  photoUrl?: string;
}