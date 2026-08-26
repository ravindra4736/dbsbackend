import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { User } from '../common/decorators/user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import { PermissionResolverService } from '../authorization/permission-resolver.service';
import type { AuthenticatedUser } from '../common/types/authorization.types';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  @ApiOperation({ summary: 'List users' })
  async findAll(@Query() query: GetUsersQueryDto) {
    const data = await this.usersService.findAll(query);
    return {
      success: true,
      message: 'Users list retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id (own profile or users.view)' })
  async findOne(
    @Param('id') id: string,
    @User() currentUser: AuthenticatedUser,
  ) {
    await this.assertCanAccessUser(currentUser, id, PERMISSIONS.USERS_VIEW);

    const data = await this.usersService.findOne(id);
    return {
      success: true,
      message: 'User profile retrieved successfully',
      data,
    };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_CREATE)
  @ApiOperation({ summary: 'Create user' })
  async create(
    @Body() dto: CreateUserDto,
    @User() currentUser: AuthenticatedUser,
  ) {
    const data = await this.usersService.create(
      dto,
      currentUser.userId,
      currentUser.roles,
    );
    return {
      success: true,
      message: 'User created successfully',
      data,
    };
  }

  @Post(':id/reset-password')
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  @ApiOperation({ summary: 'Admin reset password for a user' })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: AdminResetPasswordDto,
    @User() currentUser: AuthenticatedUser,
  ) {
    if (currentUser.userId === id) {
      throw new ForbiddenException(
        'You cannot reset your own password via this endpoint. Use the forgot-password flow.',
      );
    }

    const data = await this.usersService.adminResetPassword(
      id,
      dto.password,
      currentUser.userId,
    );

    return {
      success: true,
      message: data.message,
      data: null,
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update user (own profile or users.update)',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @User() currentUser: AuthenticatedUser,
  ) {
    const isSelf = currentUser.userId === id;
    const canManage = await this.hasPermission(
      currentUser,
      PERMISSIONS.USERS_UPDATE,
    );

    if (!isSelf && !canManage) {
      throw new ForbiddenException(
        'Access denied. You can only update your own profile.',
      );
    }

    if ((dto.roleIds || dto.status) && !canManage) {
      throw new ForbiddenException(
        'Access denied. You cannot change roles or status.',
      );
    }

    const data = await this.usersService.update(
      id,
      dto,
      currentUser.userId,
      currentUser.roles,
    );
    return {
      success: true,
      message: 'User updated successfully',
      data,
    };
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.USERS_DELETE)
  @ApiOperation({ summary: 'Delete user' })
  async remove(
    @Param('id') id: string,
    @User() currentUser: AuthenticatedUser,
  ) {
    if (currentUser.userId === id) {
      throw new ForbiddenException('You cannot delete your own account.');
    }

    const data = await this.usersService.remove(id, currentUser.userId);
    return {
      success: true,
      message: data.message,
      data: null,
    };
  }

  private async hasPermission(
    currentUser: AuthenticatedUser,
    permission: string,
  ): Promise<boolean> {
    const resolved = await this.permissionResolver.resolveForUser(
      currentUser.userId,
      currentUser.roles || [],
    );
    return this.permissionResolver.hasPermission(resolved, [permission]);
  }

  private async assertCanAccessUser(
    currentUser: AuthenticatedUser,
    targetUserId: string,
    permission: string,
  ): Promise<void> {
    if (currentUser.userId === targetUserId) {
      return;
    }

    const allowed = await this.hasPermission(currentUser, permission);
    if (!allowed) {
      throw new ForbiddenException(
        'Access denied. You can only view your own profile.',
      );
    }
  }
}
