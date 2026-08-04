import { UserStatus } from '@prisma/client';

export class UpdatePoliceStatusDto {
  status!: UserStatus;
}