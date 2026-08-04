import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AssignDispatchDto {
  @IsUUID()
  policeOfficerId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}