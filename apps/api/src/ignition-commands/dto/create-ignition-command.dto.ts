import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export enum RequestedIgnitionAction {
  BLOCK_NEXT_START = 'BLOCK_NEXT_START',
  SAFE_SHUTDOWN = 'SAFE_SHUTDOWN',
  UNBLOCK = 'UNBLOCK',
}

export class CreateIgnitionCommandDto {
  @IsEnum(RequestedIgnitionAction)
  action: RequestedIgnitionAction;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  incidentNumber?: string;
}
