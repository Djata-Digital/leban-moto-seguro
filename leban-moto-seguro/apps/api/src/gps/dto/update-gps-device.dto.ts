import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateGpsDeviceDto {
  @IsOptional()
  @IsString()
  motorcycleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  imei?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  simNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  iccid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  apn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceModel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  firmwareVersion?: string;

  @IsOptional()
  @IsBoolean()
  hasBackupBattery?: boolean;
}
