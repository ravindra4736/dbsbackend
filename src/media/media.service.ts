import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { StorageService } from '../common/storage/storage.service';
import { GetMediaQueryDto, UpdateMediaDto } from './dto/media.dto';
import {
  DOCUMENT_MIME_TYPES,
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
  AUDIO_MIME_TYPES,
  isRasterImageMime,
  validateUploadBuffer,
} from './media.validation';

// sharp CJS export is callable; default ESM interop breaks under Nest/tsc.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as (
  input: Buffer,
  options?: { failOn?: string },
) => { metadata: () => Promise<{ width?: number; height?: number }> };

const MEDIA_SELECT = {
  id: true,
  originalFilename: true,
  filename: true,
  mimeType: true,
  extension: true,
  size: true,
  storageKey: true,
  url: true,
  width: true,
  height: true,
  altText: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MediaSelect;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async upload(
    file: {
      filename: string;
      mimetype: string;
      buffer: Buffer;
    },
    actorId: string,
  ) {
    const validated = validateUploadBuffer({
      originalFilename: file.filename,
      declaredMime: file.mimetype,
      buffer: file.buffer,
    });

    const filename = `${randomUUID()}.${validated.extension}`;
    let width: number | null = null;
    let height: number | null = null;
    let writtenStorageKey: string | null = null;

    try {
      if (isRasterImageMime(validated.mimeType)) {
        const softDimensionMimes = new Set([
          'image/heic',
          'image/heif',
          'image/bmp',
          'image/tiff',
        ]);
        try {
          const meta = await sharp(validated.buffer, {
            failOn: 'error',
          }).metadata();
          if (!meta.width || !meta.height) {
            if (!softDimensionMimes.has(validated.mimeType)) {
              throw new BadRequestException(
                'Unable to read image dimensions.',
              );
            }
          } else {
            width = meta.width;
            height = meta.height;
          }
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          if (softDimensionMimes.has(validated.mimeType)) {
            this.logger.warn(
              `Image dimension extraction skipped for ${validated.mimeType}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          } else {
            throw new BadRequestException('Invalid or corrupt image file.');
          }
        }
      }

      const saved = await this.storageService.saveMediaFile(
        filename,
        validated.buffer,
      );
      writtenStorageKey = saved.storageKey;

      const media = await this.prisma.media.create({
        data: {
          originalFilename: validated.originalFilename,
          filename,
          mimeType: validated.mimeType,
          extension: validated.extension,
          size: validated.size,
          storageKey: saved.storageKey,
          url: saved.url,
          width,
          height,
          altText: null,
          createdBy: actorId,
        },
        select: MEDIA_SELECT,
      });

      await this.activityLogsService.log({
        userId: actorId,
        action: 'UPLOAD_MEDIA',
        resource: 'Media',
        resourceId: media.id,
        metadata: {
          id: media.id,
          originalFilename: media.originalFilename,
          mimeType: media.mimeType,
          size: media.size,
          url: media.url,
        },
      });

      return this.toResponse(media);
    } catch (error) {
      if (writtenStorageKey) {
        try {
          await this.storageService.deleteMediaFile(writtenStorageKey);
        } catch (cleanupError) {
          this.logger.warn(
            `Failed to cleanup orphaned upload ${writtenStorageKey}: ${cleanupError}`,
          );
        }
      }
      throw error;
    }
  }

  async findAll(query: GetMediaQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.MediaWhereInput = {};

    if (query.type === 'image') {
      where.mimeType = { in: [...IMAGE_MIME_TYPES] };
    } else if (query.type === 'video') {
      where.mimeType = { in: [...VIDEO_MIME_TYPES] };
    } else if (query.type === 'audio') {
      where.mimeType = { in: [...AUDIO_MIME_TYPES] };
    } else if (query.type === 'document') {
      where.mimeType = { in: [...DOCUMENT_MIME_TYPES] };
    }

    if (query.search?.trim()) {
      const searchPattern = query.search.trim();
      where.OR = [
        { originalFilename: { contains: searchPattern } },
        { filename: { contains: searchPattern } },
      ];
    }

    const allowedSortFields = [
      'originalFilename',
      'filename',
      'mimeType',
      'size',
      'createdAt',
      'updatedAt',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy || '')
      ? query.sortBy!
      : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, items] = await Promise.all([
      this.prisma.media.count({ where }),
      this.prisma.media.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: MEDIA_SELECT,
      }),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      select: MEDIA_SELECT,
    });
    if (!media) {
      throw new NotFoundException('Media not found.');
    }
    return this.toResponse(media);
  }

  async update(id: string, dto: UpdateMediaDto, actorId: string) {
    const existing = await this.prisma.media.findUnique({
      where: { id },
      select: MEDIA_SELECT,
    });
    if (!existing) {
      throw new NotFoundException('Media not found.');
    }

    if (dto.altText === undefined) {
      return this.toResponse(existing);
    }

    const altText =
      dto.altText === null ? null : String(dto.altText).trim() || null;

    const media = await this.prisma.media.update({
      where: { id },
      data: { altText },
      select: MEDIA_SELECT,
    });

    await this.activityLogsService.log({
      userId: actorId,
      action: 'UPDATE_MEDIA',
      resource: 'Media',
      resourceId: media.id,
      metadata: {
        id: media.id,
        changedFields: ['altText'],
        altText: media.altText,
      },
    });

    return this.toResponse(media);
  }

  async remove(id: string, actorId: string) {
    const existing = await this.prisma.media.findUnique({
      where: { id },
      select: MEDIA_SELECT,
    });
    if (!existing) {
      throw new NotFoundException('Media not found.');
    }

    await this.storageService.deleteMediaFile(existing.storageKey);

    await this.prisma.media.delete({ where: { id } });

    await this.activityLogsService.log({
      userId: actorId,
      action: 'DELETE_MEDIA',
      resource: 'Media',
      resourceId: id,
      metadata: {
        id,
        originalFilename: existing.originalFilename,
        mimeType: existing.mimeType,
        storageKey: existing.storageKey,
      },
    });

    return { id };
  }

  private toResponse(media: {
    id: string;
    originalFilename: string;
    filename: string;
    mimeType: string;
    extension: string;
    size: number;
    storageKey: string;
    url: string;
    width: number | null;
    height: number | null;
    altText: string | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: media.id,
      originalFilename: media.originalFilename,
      filename: media.filename,
      mimeType: media.mimeType,
      extension: media.extension,
      size: media.size,
      url: media.url,
      width: media.width,
      height: media.height,
      altText: media.altText,
      createdBy: media.createdBy,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    };
  }
}
