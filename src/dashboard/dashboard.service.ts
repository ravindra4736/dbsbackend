import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const RECENT_ACTIVITY_LIMIT = 10;
const RECENT_USERS_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const notDeleted = { deletedAt: null };

    const [
      totalRoles,
      totalPermissions,
      usersByStatusRaw,
      usersByRoleRaw,
      recentUsers,
      recentActivity,
    ] = await Promise.all([
      this.prisma.role.count(),
      this.prisma.permission.count(),
      this.prisma.user.groupBy({
        by: ['status'],
        where: notDeleted,
        _count: { _all: true },
      }),
      this.prisma.userRole.groupBy({
        by: ['roleId'],
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        where: notDeleted,
        orderBy: { createdAt: 'desc' },
        take: RECENT_USERS_LIMIT,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: RECENT_ACTIVITY_LIMIT,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    const usersByStatus = {
      ACTIVE: 0,
      INACTIVE: 0,
      SUSPENDED: 0,
    };
    for (const row of usersByStatusRaw) {
      usersByStatus[row.status] = row._count._all;
    }

    const totalUsers =
      usersByStatus.ACTIVE + usersByStatus.INACTIVE + usersByStatus.SUSPENDED;

    const sortedRoleCounts = [...usersByRoleRaw].sort(
      (a, b) => b._count._all - a._count._all,
    );
    const topRoleCounts = sortedRoleCounts.slice(0, 10);
    const roleIds = topRoleCounts.map((row) => row.roleId);
    const roles =
      roleIds.length === 0
        ? []
        : await this.prisma.role.findMany({
            where: { id: { in: roleIds } },
            select: { id: true, name: true, slug: true },
          });
    const roleMap = new Map(roles.map((role) => [role.id, role]));

    const usersByRole = topRoleCounts.map((row) => {
      const role = roleMap.get(row.roleId);
      return {
        roleId: row.roleId,
        roleName: role?.name ?? 'Unknown',
        roleSlug: role?.slug ?? 'unknown',
        userCount: row._count._all,
      };
    });

    return {
      summary: {
        totalUsers,
        activeUsers: usersByStatus.ACTIVE,
        inactiveUsers: usersByStatus.INACTIVE,
        suspendedUsers: usersByStatus.SUSPENDED,
        totalRoles,
        totalPermissions,
      },
      usersByStatus,
      usersByRole,
      recentUsers,
      recentActivity: recentActivity.map((entry) => ({
        id: entry.id,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        createdAt: entry.createdAt,
        actor: entry.user
          ? {
              id: entry.user.id,
              email: entry.user.email,
              firstName: entry.user.firstName,
              lastName: entry.user.lastName,
            }
          : null,
      })),
    };
  }
}
