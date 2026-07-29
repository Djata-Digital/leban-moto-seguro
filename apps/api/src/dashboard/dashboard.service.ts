import { Injectable } from '@nestjs/common';
import { MotorcycleStatus, MotorcycleType, TheftReportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [
      totalUsers,
      totalOwners,
      totalDrivers,
      totalMotorcycles,
      totalMotoTaxi,
      totalParticular,
      totalPoliceOfficers,
      totalGpsDevices,
      activeGpsDevices,
      openTheftReports,
      totalPoliceChecks,
      pendingAuthorizations,
      openAlerts,
      criticalAlerts,
      highAlerts,
      mediumAlerts,
      lowAlerts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.owner.count(),
      this.prisma.driver.count(),
      this.prisma.motorcycle.count(),
      this.prisma.motorcycle.count({ where: { type: MotorcycleType.MOTO_TAXI } }),
      this.prisma.motorcycle.count({ where: { type: MotorcycleType.PARTICULAR } }),
      this.prisma.policeOfficer.count(),
      this.prisma.gpsDevice.count(),
      this.prisma.gpsDevice.count({ where: { isActive: true } }),
      this.prisma.theftReport.count({
        where: {
          status: {
            in: [TheftReportStatus.OPEN, TheftReportStatus.INVESTIGATING],
          },
        },
      }),
      this.prisma.policeCheck.count(),
      this.prisma.routeAuthorization.count({ where: { status: 'PENDING' } }),
      this.prisma.alert.count({ where: { status: 'OPEN' } }),
      this.prisma.alert.count({ where: { status: 'OPEN', severity: 'CRITICAL' } }),
      this.prisma.alert.count({ where: { status: 'OPEN', severity: 'HIGH' } }),
      this.prisma.alert.count({ where: { status: 'OPEN', severity: 'MEDIUM' } }),
      this.prisma.alert.count({ where: { status: 'OPEN', severity: 'LOW' } }),
    ]);

    const motorcyclesByStatus = await this.prisma.motorcycle.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const theftReportsByStatus = await this.prisma.theftReport.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    return {
      totals: {
        users: totalUsers,
        owners: totalOwners,
        drivers: totalDrivers,
        motorcycles: totalMotorcycles,
        motoTaxi: totalMotoTaxi,
        particular: totalParticular,
        policeOfficers: totalPoliceOfficers,
        gpsDevices: totalGpsDevices,
        activeGpsDevices,
        openTheftReports,
        policeChecks: totalPoliceChecks,
        pendingAuthorizations,
        openAlerts,
        criticalAlerts,
        highAlerts,
        mediumAlerts,
        lowAlerts,
      },
      motorcyclesByStatus: motorcyclesByStatus.map((item) => ({
        status: item.status,
        total: item._count.status,
      })),
      theftReportsByStatus: theftReportsByStatus.map((item) => ({
        status: item.status,
        total: item._count.status,
      })),
    };
  }

  async recentActivity() {
    const [
      recentMotorcycles,
      recentTheftReports,
      recentPoliceChecks,
      recentGpsLocations,
      recentAuthorizations,
    ] = await Promise.all([
      this.prisma.motorcycle.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          owner: true,
        },
      }),

      this.prisma.theftReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          motorcycle: true,
        },
      }),

      this.prisma.policeCheck.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          policeOfficer: true,
          motorcycle: true,
        },
      }),

      this.prisma.gpsLocation.findMany({
        orderBy: { recordedAt: 'desc' },
        take: 10,
        include: {
          gpsDevice: {
            include: {
              motorcycle: true,
            },
          },
        },
      }),

      this.prisma.routeAuthorization.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          motorcycle: true,
          driver: true,
          route: true,
        },
      }),
    ]);

    return {
      recentMotorcycles,
      recentTheftReports,
      recentPoliceChecks,
      recentGpsLocations,
      recentAuthorizations,
    };
  }

  async securityMapData() {
    const motorcyclesWithGps = await this.prisma.motorcycle.findMany({
      include: {
        owner: true,
        theftReports: {
          where: {
            status: {
              in: [TheftReportStatus.OPEN, TheftReportStatus.INVESTIGATING],
            },
          },
        },
        gpsDevices: {
          where: {
            isActive: true,
          },
          include: {
            locations: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    return motorcyclesWithGps
      .map((motorcycle) => {
        const lastLocation = motorcycle.gpsDevices?.[0]?.locations?.[0];

        if (!lastLocation) {
          return null;
        }

        let mapStatus = 'NORMAL';

        if (motorcycle.theftReports.length > 0) {
          mapStatus = 'ALERT';
        } else if (motorcycle.status !== MotorcycleStatus.ACTIVE) {
          mapStatus = 'WARNING';
        }

        return {
          motorcycleId: motorcycle.id,
          plateNumber: motorcycle.plateNumber,
          brand: motorcycle.brand,
          model: motorcycle.model,
          color: motorcycle.color,
          type: motorcycle.type,
          status: motorcycle.status,
          ownerName: motorcycle.owner.fullName,
          mapStatus,
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
          speed: lastLocation.speed,
          battery: lastLocation.battery,
          ignitionOn: lastLocation.ignitionOn,
          recordedAt: lastLocation.recordedAt,
        };
      })
      .filter(Boolean);
  }

  async alerts() {
    const [
      openTheftReports,
      motorcyclesBlocked,
      motorcyclesWithoutGps,
      lowBatteryLocations,
      pendingAuthorizations,
    ] = await Promise.all([
      this.prisma.theftReport.findMany({
        where: {
          status: {
            in: [TheftReportStatus.OPEN, TheftReportStatus.INVESTIGATING],
          },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          motorcycle: true,
        },
      }),

      this.prisma.motorcycle.findMany({
        where: {
          status: {
            in: [
              MotorcycleStatus.BLOCKED,
              MotorcycleStatus.ROBBED,
              MotorcycleStatus.STOLEN,
              MotorcycleStatus.INVESTIGATION,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.motorcycle.findMany({
        where: {
          gpsDevices: {
            none: {
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      this.prisma.gpsLocation.findMany({
        where: {
          battery: {
            lt: 20,
          },
        },
        orderBy: { recordedAt: 'desc' },
        take: 20,
        include: {
          gpsDevice: {
            include: {
              motorcycle: true,
            },
          },
        },
      }),

      this.prisma.routeAuthorization.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: {
          motorcycle: true,
          driver: true,
        },
      }),
    ]);

    return {
      openTheftReports,
      motorcyclesBlocked,
      motorcyclesWithoutGps,
      lowBatteryLocations,
      pendingAuthorizations,
    };
  }
}