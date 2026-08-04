import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DispatchMessageSenderType } from '@prisma/client';

export class CreateDispatchMessageDto {
  @IsString()
  dispatchId!: string;

  @IsString()
  @IsOptional()
  senderId?: string;

  @IsEnum(DispatchMessageSenderType)
  senderType!: DispatchMessageSenderType;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;
}