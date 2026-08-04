import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const rolePermissions =
      await this.prisma.rolePermission.findMany({
        where: {
          role: user.role,
        },
        include: {
          permission: true,
        },
      });

    const userPermissions =
      await this.prisma.userPermission.findMany({
        where: {
          userId: user.id,
        },
        include: {
          permission: true,
        },
      });

    const permissions = new Set<string>();

    rolePermissions.forEach((p) =>
      permissions.add(p.permission.key),
    );

    userPermissions.forEach((p) => {
      if (p.allowed)
        permissions.add(p.permission.key);
      else
        permissions.delete(p.permission.key);
    });

    return requiredPermissions.every((permission) =>
      permissions.has(permission),
    );
  }
}