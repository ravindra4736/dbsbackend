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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super-admin', 'admin')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async findAll() {
    const data = await this.rolesService.findAll();
    return {
      success: true,
      message: 'Roles retrieved successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.rolesService.findOne(id);
    return {
      success: true,
      message: 'Role retrieved successfully',
      data,
    };
  }

  @Post()
  async create(@Body() dto: CreateRoleDto) {
    const data = await this.rolesService.create(dto);
    return {
      success: true,
      message: 'Role created successfully',
      data,
    };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const data = await this.rolesService.update(id, dto);
    return {
      success: true,
      message: 'Role updated successfully',
      data,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.rolesService.remove(id);
    return {
      success: true,
      message: data.message,
      data: null,
    };
  }
}
