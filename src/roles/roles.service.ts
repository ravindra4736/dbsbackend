import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { GetRolesQueryDto } from './dto/get-roles-query.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PermissionResolverService } from '../authorization/permission-resolver.service';
import { SYSTEM_ROLE_SLUGS } from '../common/constants/roles';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

type RoleWithRelations = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  isProtected: boolean;
  isSystem: boolean;
  rolePermissions?: Array<{
    permission: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      resource: string;
      action: string;
    };
  }>;
  _count?: {
    userRoles: number;
    rolePermissions: number;
  };
};

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async findAll(query: GetRolesQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const allowedSortFields = ['name', 'slug', 'createdAt', 'updatedAt'];
    const sortBy = allowedSortFields.includes(query.sortBy || '')
      ? query.sortBy!
      : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, items] = await Promise.all([
      this.prisma.role.count({ where }),
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              userRoles: true,
              rolePermissions: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((role) => this.toRoleSummary(role)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                resource: true,
                action: true,
              },
            },
          },
          orderBy: {
            permission: { resource: 'asc' },
          },
        },
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
      },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }
    return this.toRoleDetail(role);
  }

  async create(
    dto: CreateRoleDto,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const slug = slugify(dto.name);

    const existing = await this.prisma.role.findFirst({
      where: {
        OR: [{ slug }, { name: dto.name }],
      },
    });

    if (existing) {
      throw new ConflictException(
        'A role with this name or slug already exists',
      );
    }

    if (dto.permissionIds?.length) {
      await this.assertPermissionIdsExist(dto.permissionIds);
    }

    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
        },
      });

      if (dto.permissionIds?.length) {
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            roleId: created.id,
            permissionId,
          })),
        });
      }

      return created;
    });

    await this.activityLogsService.log({
      userId: actorId,
      action: 'CREATE_ROLE',
      resource: 'Role',
      resourceId: role.id,
      metadata: {
        role,
        permissionIds: dto.permissionIds ?? [],
        actorRoles,
      },
    });

    return this.findOne(role.id);
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const existing = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: { select: { permissionId: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    if (
      (SYSTEM_ROLE_SLUGS as readonly string[]).includes(existing.slug) &&
      dto.name &&
      slugify(dto.name) !== existing.slug
    ) {
      throw new BadRequestException(
        'System default roles cannot have their name or slug modified.',
      );
    }

    if (dto.permissionIds !== undefined) {
      this.assertCanMutateProtectedRolePermissions(existing, actorRoles);
      await this.assertPermissionIdsExist(dto.permissionIds);
    }

    const data: { name?: string; slug?: string; description?: string | null } =
      {};
    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    if (dto.name) {
      const slug = slugify(dto.name);

      const conflict = await this.prisma.role.findFirst({
        where: {
          id: { not: id },
          OR: [{ slug }, { name: dto.name }],
        },
      });

      if (conflict) {
        throw new ConflictException(
          'A role with this name or slug already exists',
        );
      }

      data.name = dto.name;
      data.slug = slug;
    }

    const previousPermissionIds = existing.rolePermissions.map(
      (rp) => rp.permissionId,
    );

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.role.update({
          where: { id },
          data,
        });
      }

      if (dto.permissionIds !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (dto.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: dto.permissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
          });
        }
      }
    });

    const updated = await this.findOne(id);

    await this.activityLogsService.log({
      userId: actorId,
      action: 'UPDATE_ROLE',
      resource: 'Role',
      resourceId: id,
      metadata: {
        oldValues: {
          name: existing.name,
          slug: existing.slug,
          description: existing.description,
          permissionIds: previousPermissionIds,
        },
        newValues: {
          name: updated.name,
          slug: updated.slug,
          description: updated.description,
          permissionIds:
            dto.permissionIds !== undefined
              ? dto.permissionIds
              : previousPermissionIds,
        },
      },
    });

    await this.permissionResolver.invalidateUsersWithRole(id);

    return updated;
  }

  /**
   * Replace-all permission assignment (dedicated endpoint).
   */
  async assignPermissions(
    id: string,
    permissionIds: string[],
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    return this.update(id, { permissionIds }, actorId, actorRoles);
  }

  async remove(id: string, actorId?: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    if ((SYSTEM_ROLE_SLUGS as readonly string[]).includes(role.slug)) {
      throw new BadRequestException('System default roles cannot be deleted.');
    }

    const assignedUsersCount = await this.prisma.userRole.count({
      where: { roleId: id },
    });

    if (assignedUsersCount > 0) {
      throw new BadRequestException(
        'Cannot delete role because it is assigned to one or more users.',
      );
    }

    await this.prisma.role.delete({
      where: { id },
    });

    await this.activityLogsService.log({
      userId: actorId,
      action: 'DELETE_ROLE',
      resource: 'Role',
      resourceId: id,
      metadata: { oldValues: role },
    });

    return { message: 'Role deleted successfully' };
  }

  private assertCanMutateProtectedRolePermissions(
    role: { isProtected: boolean; slug: string },
    actorRoles: string[],
  ): void {
    if (!role.isProtected && role.slug !== 'super-admin') {
      return;
    }
    if (!this.permissionResolver.isSuperAdmin(actorRoles)) {
      throw new ForbiddenException(
        'Only Super Admin can change permissions on protected roles.',
      );
    }
  }

  private async assertPermissionIdsExist(permissionIds: string[]) {
    if (permissionIds.length === 0) return;
    const count = await this.prisma.permission.count({
      where: { id: { in: permissionIds } },
    });
    if (count !== permissionIds.length) {
      throw new BadRequestException(
        'One or more permission IDs are invalid.',
      );
    }
  }

  private toRoleSummary(role: RoleWithRelations) {
    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      isProtected: role.isProtected,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissionCount: role._count?.rolePermissions ?? 0,
      userCount: role._count?.userRoles ?? 0,
    };
  }

  private toRoleDetail(role: RoleWithRelations) {
    const permissions =
      role.rolePermissions?.map((rp) => rp.permission) ?? [];
    return {
      ...this.toRoleSummary(role),
      permissionCount: role._count?.rolePermissions ?? permissions.length,
      userCount: role._count?.userRoles ?? 0,
      permissions,
    };
  }
}
