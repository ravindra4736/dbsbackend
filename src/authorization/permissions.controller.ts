import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { User } from '../common/decorators/user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { PermissionResolverService } from './permission-resolver.service';
import type { AuthenticatedUser } from '../common/types/authorization.types';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(
    private readonly permissionResolver: PermissionResolverService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Current user's effective permission slugs (for frontend UX authorization).
   * Does not alter JWT — permissions are resolved server-side.
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user effective permissions' })
  @ApiOkResponse({
    description: 'Resolved permissions for the authenticated user',
  })
  async getMyPermissions(@User() currentUser: AuthenticatedUser) {
    const resolved = await this.permissionResolver.resolveForUser(
      currentUser.userId,
      currentUser.roles || [],
    );

    return {
      success: true,
      message: 'Permissions retrieved successfully',
      data: {
        userId: resolved.userId,
        roles: resolved.roles,
        permissions: resolved.isSuperAdmin ? ['*'] : resolved.permissions,
        isSuperAdmin: resolved.isSuperAdmin,
      },
    };
  }

  /**
   * Full permission catalog (infrastructure endpoint for future admin UI).
   */
  @Get()
  @RequirePermissions(PERMISSIONS.PERMISSIONS_VIEW)
  @ApiOperation({ summary: 'List all permission definitions' })
  async findAll() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    return {
      success: true,
      message: 'Permission catalog retrieved successfully',
      data: permissions,
    };
  }
}
