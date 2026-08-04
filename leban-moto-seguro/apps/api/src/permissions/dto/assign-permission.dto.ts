import { IsBoolean, IsUUID } from 'class-validator';

export class AssignPermissionDto {
  @IsUUID()
  permissionId!: string;

  @IsBoolean()
  allowed!: boolean;
}