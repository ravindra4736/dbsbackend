import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { User } from '../common/decorators/user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import type { AuthenticatedUser } from '../common/types/authorization.types';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ROLES_VIEW)
  @ApiOperation({ summary: 'List roles' })
  async findAll() {
    const data = await this.rolesService.findAll();
    return {
      success: true,
      message: 'Roles retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ROLES_VIEW)
  @ApiOperation({ summary: 'Get role by id' })
  async findOne(@Param('id') id: string) {
    const data = await this.rolesService.findOne(id);
    return {
      success: true,
      message: 'Role retrieved successfully',
      data,
    };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ROLES_CREATE)
  @ApiOperation({ summary: 'Create role' })
  async create(
    @Body() dto: CreateRoleDto,
    @User() currentUser: AuthenticatedUser,
  ) {
    const data = await this.rolesService.create(dto, currentUser.userId);
    return {
      success: true,
      message: 'Role created successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.ROLES_UPDATE)
  @ApiOperation({ summary: 'Update role' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @User() currentUser: AuthenticatedUser,
  ) {
    const data = await this.rolesService.update(id, dto, currentUser.userId);
    return {
      success: true,
      message: 'Role updated successfully',
      data,
    };
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.ROLES_DELETE)
  @ApiOperation({ summary: 'Delete role' })
  async remove(
    @Param('id') id: string,
    @User() currentUser: AuthenticatedUser,
  ) {
    const data = await this.rolesService.remove(id, currentUser.userId);
    return {
      success: true,
      message: data.message,
      data: null,
    };
  }
}
