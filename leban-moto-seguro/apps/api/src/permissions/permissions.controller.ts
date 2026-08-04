import { Controller, Get, Param } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get()
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get('role/:role')
  rolePermissions(@Param('role') role: string) {
    return this.permissionsService.rolePermissions(role as any);
  }

  @Get('user/:userId')
  userPermissions(@Param('userId') userId: string) {
    return this.permissionsService.userPermissions(userId);
  }
}