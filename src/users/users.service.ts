import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { RedisService } from '../redis/redis.service';
import { PermissionResolverService } from '../authorization/permission-resolver.service';
import { SUPER_ADMIN_ROLES } from '../common/constants/roles';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';

type RoleGuardFields = {
  slug: string;
  isProtected: boolean;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly redisService: RedisService,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async create(
    dto: CreateUserDto,
    creatorId?: string,
    actorRoles: string[] = [],
  ) {
    const email = dto.email.toLowerCase();

    // Check email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Email is already registered.');
    }

    // Verify all roles exist
    const roles = await this.prisma.role.findMany({
      where: { id: { in: dto.roleIds } },
    });

    if (roles.length !== dto.roleIds.length) {
      throw new NotFoundException('One or more specified roles not found.');
    }

    this.assertProtectedRoleMutation(actorRoles, [], roles);

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName || null,
        lastName: dto.lastName || null,
        status: dto.status || 'ACTIVE',
        createdBy: creatorId || null,
      },
    });

    // Create UserRole records
    await this.prisma.userRole.createMany({
      data: dto.roleIds.map((roleId) => ({
        userId: user.id,
        roleId,
      })),
    });

    // Fetch user with roles
    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Log Activity
    await this.activityLogsService.log({
      userId: creatorId,
      action: 'CREATE_USER',
      resource: 'User',
      resourceId: user.id,
      metadata: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: userWithRoles.userRoles.map((ur) => ur.role.slug),
        status: user.status,
      },
    });

    return this.sanitizeUser(userWithRoles);
  }

  async findAll(query: GetUsersQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.roleId) {
      where.userRoles = {
        some: {
          roleId: query.roleId,
        },
      };
    }

    if (query.search) {
      const searchPattern = query.search;
      where.OR = [
        { firstName: { contains: searchPattern } },
        { lastName: { contains: searchPattern } },
        { email: { contains: searchPattern } },
      ];
    }

    const allowedSortFields = [
      'email',
      'firstName',
      'lastName',
      'createdAt',
      'updatedAt',
      'lastLoginAt',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy || '')
      ? query.sortBy
      : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy!]: sortOrder },
        include: {
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const sanitizedItems = items.map((user) => this.sanitizeUser(user));

    return {
      items: sanitizedItems,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }

    return this.sanitizeUser(user);
  }

  async findByEmailWithPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    updaterId?: string,
    actorRoles: string[] = [],
  ) {
    const user = await this.findOne(id);

    const oldValues = {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: Array.isArray(user.roles)
        ? user.roles.map((role: { slug: string }) => role.slug)
        : [],
      status: user.status,
    };

    const data: any = {
      updatedBy: updaterId || null,
    };

    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName;
    }

    if (dto.email) {
      const email = dto.email.toLowerCase();
      if (email !== user.email) {
        const existing = await this.prisma.user.findUnique({
          where: { email },
        });
        if (existing) {
          throw new ConflictException(
            'Email is already registered by another user.',
          );
        }
        data.email = email;
      }
    }

    if (dto.roleIds) {
      // Verify all roles exist
      const roles = await this.prisma.role.findMany({
        where: { id: { in: dto.roleIds } },
      });

      if (roles.length !== dto.roleIds.length) {
        throw new NotFoundException('One or more specified roles not found.');
      }

      const currentAssignments = await this.prisma.userRole.findMany({
        where: { userId: id },
        include: { role: true },
      });
      this.assertProtectedRoleMutation(
        actorRoles,
        currentAssignments.map((row) => row.role),
        roles,
      );

      // Delete existing user roles
      await this.prisma.userRole.deleteMany({
        where: { userId: id },
      });

      // Create new user roles
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({
          userId: id,
          roleId,
        })),
      });

      // Role assignment changed — drop cached effective permissions
      await this.permissionResolver.invalidateUser(id);
    }

    if (dto.status) {
      data.status = dto.status;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Deactivate / suspend must kill active sessions immediately
    if (
      dto.status &&
      (dto.status === 'INACTIVE' || dto.status === 'SUSPENDED') &&
      oldValues.status !== dto.status
    ) {
      await this.revokeAllUserSessions(id);
      await this.permissionResolver.invalidateUser(id);
    }

    const newValues = {
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      roles: updatedUser.userRoles.map((ur) => ur.role.slug),
      status: updatedUser.status,
    };

    // Log Activity
    await this.activityLogsService.log({
      userId: updaterId,
      action: 'UPDATE_USER',
      resource: 'User',
      resourceId: id,
      metadata: {
        oldValues,
        newValues,
      },
    });

    return this.sanitizeUser(updatedUser);
  }

  async remove(id: string, deleterId?: string) {
    await this.findOne(id);

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: deleterId || null,
      },
    });

    // Invalidate all active sessions (DB + Redis, same strategy as logout-all)
    await this.revokeAllUserSessions(id);

    // Drop permission cache for deleted user
    await this.permissionResolver.invalidateUser(id);

    // Log Activity
    await this.activityLogsService.log({
      userId: deleterId,
      action: 'DELETE_USER',
      resource: 'User',
      resourceId: id,
      metadata: {
        oldValues: { deletedAt: null },
        newValues: { deletedAt: new Date() },
      },
    });

    return { message: 'User deleted successfully' };
  }

  async updatePassword(id: string, newPasswordHash: string) {
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
    });

    // Revoke all active sessions (DB + Redis, same strategy as logout-all)
    await this.revokeAllUserSessions(id);
  }

  /**
   * Admin-initiated password reset for another user.
   * Hashes with argon2 (same as AuthService), revokes sessions, logs activity.
   */
  async adminResetPassword(id: string, newPassword: string, actorId: string) {
    await this.findOne(id);

    const passwordHash = await argon2.hash(newPassword);
    await this.updatePassword(id, passwordHash);
    await this.permissionResolver.invalidateUser(id);

    await this.activityLogsService.log({
      userId: actorId,
      action: 'ADMIN_RESET_PASSWORD',
      resource: 'User',
      resourceId: id,
      metadata: { message: 'Password reset by administrator' },
    });

    return { message: 'Password reset successfully' };
  }

  async updateLoginMetadata(id: string, ip: string) {
    await this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });
  }

  /**
   * Revoke all DB sessions and clear Redis session cache.
   * Mirrors AuthService.revokeAllSessions Redis strategy.
   */
  private async revokeAllUserSessions(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.redisService.delByPattern(`session:active:${userId}:*`);
  }

  /**
   * Non–super-admins cannot assign or remove protected roles
   * (isProtected flag and/or super-admin slug).
   */
  private isProtectedRole(role: RoleGuardFields): boolean {
    return (
      role.isProtected ||
      (SUPER_ADMIN_ROLES as readonly string[]).includes(role.slug)
    );
  }

  private assertProtectedRoleMutation(
    actorRoles: string[] | undefined,
    currentRoles: RoleGuardFields[],
    nextRoles: RoleGuardFields[],
  ): void {
    if (this.permissionResolver.isSuperAdmin(actorRoles)) {
      return;
    }

    const currentProtected = new Set(
      currentRoles
        .filter((role) => this.isProtectedRole(role))
        .map((role) => role.slug),
    );
    const nextProtected = new Set(
      nextRoles
        .filter((role) => this.isProtectedRole(role))
        .map((role) => role.slug),
    );

    for (const slug of nextProtected) {
      if (!currentProtected.has(slug)) {
        throw new ForbiddenException(
          `You cannot assign the protected role "${slug}".`,
        );
      }
    }

    for (const slug of currentProtected) {
      if (!nextProtected.has(slug)) {
        throw new ForbiddenException(
          `You cannot remove the protected role "${slug}".`,
        );
      }
    }
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    // Transform userRoles to a simpler format
    if (rest.userRoles) {
      rest.roles = rest.userRoles.map((ur: any) => ({
        id: ur.role.id,
        name: ur.role.name,
        slug: ur.role.slug,
      }));
      delete rest.userRoles;
    }
    return rest;
  }
}
