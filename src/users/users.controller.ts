import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('super-admin', 'admin')
  async findAll(@Query() query: GetUsersQueryDto) {
    const data = await this.usersService.findAll(query);
    return {
      success: true,
      message: 'Users list retrieved successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @User() currentUser: any) {
    // A user can only fetch their own details unless they are an admin
    const isAdmin = currentUser.role === 'super-admin' || currentUser.role === 'admin';
    if (!isAdmin && currentUser.userId !== id) {
      throw new ForbiddenException('Access denied. You can only view your own profile.');
    }

    const data = await this.usersService.findOne(id);
    return {
      success: true,
      message: 'User profile retrieved successfully',
      data,
    };
  }

  @Post()
  @Roles('super-admin', 'admin')
  async create(@Body() dto: CreateUserDto, @User() currentUser: any) {
    const data = await this.usersService.create(dto, currentUser.userId);
    return {
      success: true,
      message: 'User created successfully',
      data,
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @User() currentUser: any,
  ) {
    const isAdmin = currentUser.role === 'super-admin' || currentUser.role === 'admin';
    
    // A user can only update their own profile unless they are an admin
    if (!isAdmin && currentUser.userId !== id) {
      throw new ForbiddenException('Access denied. You can only update your own profile.');
    }

    // A non-admin cannot update role or status
    if (!isAdmin) {
      if (dto.roleId || dto.status) {
        throw new ForbiddenException('Access denied. Non-admin users cannot change roles or status.');
      }
    }

    const data = await this.usersService.update(id, dto, currentUser.userId);
    return {
      success: true,
      message: 'User updated successfully',
      data,
    };
  }

  @Delete(':id')
  @Roles('super-admin', 'admin')
  async remove(@Param('id') id: string, @User() currentUser: any) {
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
}
