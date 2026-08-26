import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { MediaService } from './media.service';
import { GetMediaQueryDto, UpdateMediaDto } from './dto/media.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { User } from '../common/decorators/user.decorator';
import { PERMISSIONS } from '../common/constants/permissions';
import type { AuthenticatedUser } from '../common/types/authorization.types';

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.MEDIA_VIEW)
  @ApiOperation({ summary: 'List media library items' })
  async findAll(@Query() query: GetMediaQueryDto) {
    const data = await this.mediaService.findAll(query);
    return {
      success: true,
      message: 'Media list retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.MEDIA_VIEW)
  @ApiOperation({ summary: 'Get media item by id' })
  async findOne(@Param('id') id: string) {
    const data = await this.mediaService.findOne(id);
    return {
      success: true,
      message: 'Media retrieved successfully',
      data,
    };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MEDIA_UPLOAD)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a media file' })
  async upload(
    @Req() req: FastifyRequest,
    @User() currentUser: AuthenticatedUser,
  ) {
    let file: Awaited<ReturnType<FastifyRequest['file']>>;
    try {
      file = await req.file();
    } catch (error: any) {
      const code = error?.code || error?.name;
      if (
        code === 'FST_REQ_FILE_TOO_LARGE' ||
        error?.statusCode === 413 ||
        /file.*too.*large/i.test(String(error?.message || ''))
      ) {
        throw new PayloadTooLargeException(
          'File exceeds the maximum upload size of 10 MB.',
        );
      }
      throw error;
    }

    if (!file) {
      throw new BadRequestException('No file uploaded. Use field name "file".');
    }

    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch (error: any) {
      const code = error?.code || error?.name;
      if (
        code === 'FST_REQ_FILE_TOO_LARGE' ||
        error?.statusCode === 413 ||
        /file.*too.*large/i.test(String(error?.message || ''))
      ) {
        throw new PayloadTooLargeException(
          'File exceeds the maximum upload size of 10 MB.',
        );
      }
      throw error;
    }

    const data = await this.mediaService.upload(
      {
        filename: file.filename,
        mimetype: file.mimetype,
        buffer,
      },
      currentUser.userId,
    );

    return {
      success: true,
      message: 'Media uploaded successfully',
      data,
    };
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.MEDIA_UPLOAD)
  @ApiOperation({ summary: 'Update media metadata (altText)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMediaDto,
    @User() currentUser: AuthenticatedUser,
  ) {
    const data = await this.mediaService.update(id, dto, currentUser.userId);
    return {
      success: true,
      message: 'Media updated successfully',
      data,
    };
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.MEDIA_DELETE)
  @ApiOperation({ summary: 'Delete media item' })
  async remove(
    @Param('id') id: string,
    @User() currentUser: AuthenticatedUser,
  ) {
    const data = await this.mediaService.remove(id, currentUser.userId);
    return {
      success: true,
      message: 'Media deleted successfully',
      data,
    };
  }
}
