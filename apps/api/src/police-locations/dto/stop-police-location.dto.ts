import { IsOptional, IsString } from 'class-validator';

export class StopPoliceLocationDto {
  @IsString()
  policeOfficerId!: string;

  @IsString()
  @IsOptional()
  dispatchId?: string;
}