import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SUPER_ADMIN_ROLES } from '../common/constants/roles';
import type { ResolvedPermissions } from '../common/types/authorization.types';

const CACHE_PREFIX = 'rbac:permissions:';
/** Cache TTL — short enough to pick up role/permission changes reasonably fast. */
const CACHE_TTL_SECONDS = 300;

@Injectable()
export class PermissionResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  isSuperAdmin(roles: string[] | undefined | null): boolean {
    if (!roles || roles.length === 0) {
      return false;
    }
    return SUPER_ADMIN_ROLES.some((role) => roles.includes(role));
  }

  /**
   * Resolve effective permission slugs for a user.
   * Uses Redis cache when available; always falls back to DB.
   */
  async resolveForUser(
    userId: string,
    roles: string[] = [],
  ): Promise<ResolvedPermissions> {
    const isSuperAdmin = this.isSuperAdmin(roles);

    if (isSuperAdmin) {
      return {
        userId,
        roles,
        permissions: ['*'],
        isSuperAdmin: true,
      };
    }

    const cacheKey = `${CACHE_PREFIX}${userId}`;
    const cached = await this.redisService.get<string[]>(cacheKey);
    if (cached) {
      return {
        userId,
        roles,
        permissions: cached,
        isSuperAdmin: false,
      };
    }

    const permissions = await this.loadFromDatabase(userId);
    await this.redisService.set(cacheKey, permissions, CACHE_TTL_SECONDS);

    return {
      userId,
      roles,
      permissions,
      isSuperAdmin: false,
    };
  }

  /**
   * Invalidate cached permissions for a user (call after role/permission changes).
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.redisService.del(`${CACHE_PREFIX}${userId}`);
  }

  /**
   * Invalidate permission caches for all users that have a given role.
   */
  async invalidateUsersWithRole(roleId: string): Promise<void> {
    const assignments = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    await Promise.all(
      assignments.map((row) => this.invalidateUser(row.userId)),
    );
  }

  hasPermission(
    resolved: ResolvedPermissions,
    required: string[],
    mode: 'all' | 'any' = 'all',
  ): boolean {
    if (resolved.isSuperAdmin) {
      return true;
    }

    if (!required || required.length === 0) {
      return true;
    }

    const granted = new Set(resolved.permissions);

    if (mode === 'any') {
      return required.some((permission) => granted.has(permission));
    }

    return required.every((permission) => granted.has(permission));
  }

  private async loadFromDatabase(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const slugs = new Set<string>();
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        slugs.add(rolePermission.permission.slug);
      }
    }

    return Array.from(slugs).sort();
  }
}
