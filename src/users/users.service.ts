import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async create(dto: CreateUserDto, creatorId?: string) {
    const email = dto.email.toLowerCase();

    // Check email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Email is already registered.');
    }

    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });

    if (!role) {
      throw new NotFoundException('Specified role not found.');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName || null,
        lastName: dto.lastName || null,
        roleId: dto.roleId,
        status: dto.status || 'ACTIVE',
        createdBy: creatorId || null,
      },
      include: {
        role: true,
      },
    });

    // Log Activity
    await this.activityLogsService.log({
      userId: creatorId,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      newValues: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.slug,
        status: user.status,
      },
    });

    return this.sanitizeUser(user);
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
      where.roleId = query.roleId;
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
          role: {
            select: {
              id: true,
              name: true,
              slug: true,
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
        role: true,
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
        role: true,
      },
    });
    return user;
  }

  async update(id: string, dto: UpdateUserDto, updaterId?: string) {
    const user = await this.findOne(id);

    const oldValues = {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
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
          throw new ConflictException('Email is already registered by another user.');
        }
        data.email = email;
      }
    }

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new NotFoundException('Specified role not found.');
      }
      data.roleId = dto.roleId;
    }

    if (dto.status) {
      data.status = dto.status;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        role: true,
      },
    });

    const newValues = {
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      roleId: updatedUser.roleId,
      status: updatedUser.status,
    };

    // Log Activity
    await this.activityLogsService.log({
      userId: updaterId,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      oldValues,
      newValues,
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

    // Invalidate all active sessions
    await this.prisma.userSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Log Activity
    await this.activityLogsService.log({
      userId: deleterId,
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: id,
      oldValues: { deletedAt: null },
      newValues: { deletedAt: new Date() },
    });

    return { message: 'User deleted successfully' };
  }

  async updatePassword(id: string, newPasswordHash: string) {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash },
    });

    // Revoke all active sessions
    await this.prisma.userSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
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

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
