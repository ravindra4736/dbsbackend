import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const DEFAULT_ROLE_SLUGS = ['super-admin', 'admin', 'editor', 'author', 'seo-manager'];

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async findAll() {
    return this.prisma.role.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }
    return role;
  }

  async create(dto: CreateRoleDto, actorId?: string) {
    const slug = slugify(dto.name);
    
    // Check if role name or slug already exists
    const existing = await this.prisma.role.findFirst({
      where: {
        OR: [{ slug }, { name: dto.name }],
      },
    });

    if (existing) {
      throw new ConflictException('A role with this name or slug already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
      },
    });

    await this.activityLogsService.log({
      userId: actorId,
      action: 'CREATE_ROLE',
      entityType: 'Role',
      entityId: role.id,
      newValues: role,
    });

    return role;
  }

  async update(id: string, dto: UpdateRoleDto, actorId?: string) {
    const role = await this.findOne(id);

    // If updating default role name/slug, throw exception to preserve system roles integrity
    if (DEFAULT_ROLE_SLUGS.includes(role.slug) && dto.name && slugify(dto.name) !== role.slug) {
      throw new BadRequestException('System default roles cannot have their name or slug modified.');
    }

    const data: any = {};
    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    if (dto.name) {
      const slug = slugify(dto.name);
      
      const existing = await this.prisma.role.findFirst({
        where: {
          id: { not: id },
          OR: [{ slug }, { name: dto.name }],
        },
      });

      if (existing) {
        throw new ConflictException('A role with this name or slug already exists');
      }

      data.name = dto.name;
      data.slug = slug;
    }

    const updatedRole = await this.prisma.role.update({
      where: { id },
      data,
    });

    await this.activityLogsService.log({
      userId: actorId,
      action: 'UPDATE_ROLE',
      entityType: 'Role',
      entityId: id,
      oldValues: role,
      newValues: updatedRole,
    });

    return updatedRole;
  }

  async remove(id: string, actorId?: string) {
    const role = await this.findOne(id);

    // Protect default roles from deletion
    if (DEFAULT_ROLE_SLUGS.includes(role.slug)) {
      throw new BadRequestException('System default roles cannot be deleted.');
    }

    // Protect assigned roles from deletion
    const assignedUsersCount = await this.prisma.user.count({
      where: { roleId: id },
    });

    if (assignedUsersCount > 0) {
      throw new BadRequestException('Cannot delete role because it is assigned to one or more users.');
    }

    await this.prisma.role.delete({
      where: { id },
    });

    await this.activityLogsService.log({
      userId: actorId,
      action: 'DELETE_ROLE',
      entityType: 'Role',
      entityId: id,
      oldValues: role,
    });

    return { message: 'Role deleted successfully' };
  }
}
