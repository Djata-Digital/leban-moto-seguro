import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';

import { MotorcyclesService } from './motorcycles.service';

@Controller('public/motorcycles')
export class PublicMotorcyclesController {
  constructor(
    private readonly motorcyclesService:
      MotorcyclesService,
  ) {}

  @Get(':qrToken')
  verifyByQrToken(
    @Param('qrToken')
    qrToken: string,
  ) {
    return this.motorcyclesService.verifyByQrToken(
      qrToken,
    );
  }
}