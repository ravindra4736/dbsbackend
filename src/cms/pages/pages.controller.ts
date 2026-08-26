import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { GetPagesQueryDto } from './dto/get-pages-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { User } from '../../common/decorators/user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import type { AuthenticatedUser } from '../../common/types/authorization.types';

@ApiTags('cms-pages')
@ApiBearerAuth()
@Controller('cms/pages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CMS_PAGES_VIEW)
  @ApiOperation({ summary: 'List CMS pages' })
  async findAll(@Query() query: GetPagesQueryDto) {
    const data = await this.pagesService.findAll(query);
    return {
      success: true,
      message: 'Pages list retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CMS_PAGES_VIEW)
  @ApiOperation({ summary: 'Get CMS page by id' })
  async findOne(@Param('id') id: string) {
    const data = await this.pagesService.findOne(id);
    return {
      success: true,
      message: 'Page retrieved successfully',
      data,
    };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CMS_PAGES_CREATE)
  @ApiOperation({ summary: 'Create CMS page (draft)' })
  async create(
    @Body() dto: CreatePageDto,
    @User() currentUser: AuthenticatedUser,
  ) {
    const data = await this.pagesService.create(dto, currentUser.userId);
    return {
      success: true,
      message: 'Page created successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.CMS_PAGES_UPDATE)
  @ApiOperation({ summary: 'Update CMS page' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
    @User() currentUser: AuthenticatedUser,
  ) {
    const data = await this.pagesService.update(id, dto, currentUser.userId);
    return {
      success: true,
      message: 'Page updated successfully',
      data,
    };
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.CMS_PAGES_DELETE)
  @ApiOperation({ summary: 'Soft-delete CMS page' })
  async remove(
    @Param('id') id: string,
    @User() currentUser: AuthenticatedUser,
  ) {
    const data = await this.pagesService.remove(id, currentUser.userId);
    return {
      success: true,
      message: 'Page deleted successfully',
      data,
    };
  }

  @Post(':id/publish')
  @RequirePermissions(PERMISSIONS.CMS_PAGES_UPDATE)
  @ApiOperation({ summary: 'Publish CMS page' })
  async publish(
    @Param('id') id: string,
    @User() currentUser: AuthenticatedUser,
  ) {
    const data = await this.pagesService.publish(id, currentUser.userId);
    return {
      success: true,
      message: 'Page published successfully',
      data,
    };
  }

  @Post(':id/unpublish')
  @RequirePermissions(PERMISSIONS.CMS_PAGES_UPDATE)
  @ApiOperation({ summary: 'Unpublish CMS page' })
  async unpublish(
    @Param('id') id: string,
    @User() currentUser: AuthenticatedUser,
  ) {
    const data = await this.pagesService.unpublish(id, currentUser.userId);
    return {
      success: true,
      message: 'Page unpublished successfully',
      data,
    };
  }
}
