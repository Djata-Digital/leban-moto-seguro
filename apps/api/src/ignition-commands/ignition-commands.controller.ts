import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateIgnitionCommandDto } from './dto/create-ignition-command.dto';
import { IgnitionCommandsService } from './ignition-commands.service';

type AuthenticatedRequest = Request & { user: { id: string; role: UserRole } };

@Controller('ignition-commands')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IgnitionCommandsController {
  constructor(private readonly service: IgnitionCommandsService) {}

  @Roles(UserRole.PROPRIETARIO, UserRole.POLICIA, UserRole.SUPERVISOR_POLICIA, UserRole.ADMIN, UserRole.OPERADOR)
  @Post('motorcycles/:motorcycleId')
  create(@Req() req: AuthenticatedRequest, @Param('motorcycleId') motorcycleId: string, @Body() dto: CreateIgnitionCommandDto) {
    return this.service.create(req.user.id, req.user.role, motorcycleId, dto);
  }

  @Roles(UserRole.PROPRIETARIO, UserRole.POLICIA, UserRole.SUPERVISOR_POLICIA, UserRole.ADMIN, UserRole.OPERADOR)
  @Get('motorcycles/:motorcycleId')
  list(@Req() req: AuthenticatedRequest, @Param('motorcycleId') motorcycleId: string) {
    return this.service.list(req.user.id, req.user.role, motorcycleId);
  }

  @Roles(UserRole.PROPRIETARIO, UserRole.POLICIA, UserRole.SUPERVISOR_POLICIA, UserRole.ADMIN, UserRole.OPERADOR)
  @Post(':id/cancel')
  cancel(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.cancel(req.user.id, req.user.role, id);
  }
}
