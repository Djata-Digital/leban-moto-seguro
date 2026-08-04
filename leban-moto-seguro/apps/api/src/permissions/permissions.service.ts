import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.permission.findMany({
      orderBy: {
        module: 'asc',
      },
    });
  }

  rolePermissions(role: any) {
    return this.prisma.rolePermission.findMany({
      where: { role },
      include: {
        permission: true,
      },
    });
  }

  userPermissions(userId: string) {
    return this.prisma.userPermission.findMany({
      where: { userId },
      include: {
        permission: true,
      },
    });
  }
}