import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../../activity-logs/activity-logs.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { GetPagesQueryDto } from './dto/get-pages-query.dto';
import { assertValidSlug, deletedSlug, slugFromTitle } from './slug.util';

const LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  status: true,
  publishedAt: true,
  seoTitle: true,
  seoDescription: true,
  createdBy: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PageSelect;

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async create(dto: CreatePageDto, actorId: string) {
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Title is required.');
    }

    const content = dto.content;
    if (content == null || String(content).length === 0) {
      throw new BadRequestException('Content is required.');
    }

    const rawSlug = dto.slug?.trim() ? dto.slug : slugFromTitle(title);
    const slug = assertValidSlug(rawSlug);

    await this.assertSlugAvailable(slug);

    try {
      const page = await this.prisma.page.create({
        data: {
          title,
          slug,
          content,
          status: PageStatus.DRAFT,
          publishedAt: null,
          seoTitle: dto.seoTitle?.trim() || null,
          seoDescription: dto.seoDescription?.trim() || null,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });

      await this.activityLogsService.log({
        userId: actorId,
        action: 'CREATE_PAGE',
        resource: 'Page',
        resourceId: page.id,
        metadata: {
          id: page.id,
          title: page.title,
          slug: page.slug,
          status: page.status,
        },
      });

      return page;
    } catch (error) {
      this.rethrowSlugConflict(error);
      throw error;
    }
  }

  async findAll(query: GetPagesQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PageWhereInput = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const searchPattern = query.search.trim();
      where.OR = [
        { title: { contains: searchPattern } },
        { slug: { contains: searchPattern } },
      ];
    }

    const allowedSortFields = [
      'title',
      'slug',
      'status',
      'publishedAt',
      'createdAt',
      'updatedAt',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy || '')
      ? query.sortBy!
      : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, items] = await Promise.all([
      this.prisma.page.count({ where }),
      this.prisma.page.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: LIST_SELECT,
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findOne(id: string) {
    const page = await this.prisma.page.findFirst({
      where: { id, deletedAt: null },
    });

    if (!page) {
      throw new NotFoundException('Page not found.');
    }

    return page;
  }

  async update(id: string, dto: UpdatePageDto, actorId: string) {
    const existing = await this.findOne(id);

    const data: Prisma.PageUpdateInput = {
      updatedBy: actorId,
    };

    const changedFields: string[] = [];

    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) {
        throw new BadRequestException('Title cannot be empty.');
      }
      if (title !== existing.title) {
        data.title = title;
        changedFields.push('title');
      }
    }

    if (dto.content !== undefined) {
      if (String(dto.content).length === 0) {
        throw new BadRequestException('Content cannot be empty.');
      }
      if (dto.content !== existing.content) {
        data.content = dto.content;
        changedFields.push('content');
      }
    }

    if (dto.slug !== undefined) {
      const slug = assertValidSlug(dto.slug);
      if (slug !== existing.slug) {
        await this.assertSlugAvailable(slug, id);
        data.slug = slug;
        changedFields.push('slug');
      }
    }

    if (dto.seoTitle !== undefined) {
      const seoTitle =
        dto.seoTitle === null || dto.seoTitle === ''
          ? null
          : String(dto.seoTitle).trim() || null;
      if (seoTitle !== existing.seoTitle) {
        data.seoTitle = seoTitle;
        changedFields.push('seoTitle');
      }
    }

    if (dto.seoDescription !== undefined) {
      const seoDescription =
        dto.seoDescription === null || dto.seoDescription === ''
          ? null
          : String(dto.seoDescription).trim() || null;
      if (seoDescription !== existing.seoDescription) {
        data.seoDescription = seoDescription;
        changedFields.push('seoDescription');
      }
    }

    try {
      const page = await this.prisma.page.update({
        where: { id },
        data,
      });

      await this.activityLogsService.log({
        userId: actorId,
        action: 'UPDATE_PAGE',
        resource: 'Page',
        resourceId: page.id,
        metadata: {
          id: page.id,
          title: page.title,
          slug: page.slug,
          status: page.status,
          before: {
            title: existing.title,
            slug: existing.slug,
            status: existing.status,
          },
          after: {
            title: page.title,
            slug: page.slug,
            status: page.status,
          },
          changedFields,
        },
      });

      return page;
    } catch (error) {
      this.rethrowSlugConflict(error);
      throw error;
    }
  }

  async publish(id: string, actorId: string) {
    const existing = await this.findOne(id);

    if (existing.status === PageStatus.PUBLISHED) {
      return existing;
    }

    const page = await this.prisma.page.update({
      where: { id },
      data: {
        status: PageStatus.PUBLISHED,
        publishedAt: existing.publishedAt ?? new Date(),
        updatedBy: actorId,
      },
    });

    await this.activityLogsService.log({
      userId: actorId,
      action: 'PUBLISH_PAGE',
      resource: 'Page',
      resourceId: page.id,
      metadata: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        publishedAt: page.publishedAt,
      },
    });

    return page;
  }

  async unpublish(id: string, actorId: string) {
    const existing = await this.findOne(id);

    if (existing.status === PageStatus.DRAFT) {
      return existing;
    }

    const page = await this.prisma.page.update({
      where: { id },
      data: {
        status: PageStatus.DRAFT,
        updatedBy: actorId,
      },
    });

    await this.activityLogsService.log({
      userId: actorId,
      action: 'UNPUBLISH_PAGE',
      resource: 'Page',
      resourceId: page.id,
      metadata: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        publishedAt: page.publishedAt,
      },
    });

    return page;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.findOne(id);
    const softSlug = deletedSlug(existing.slug, existing.id);

    const page = await this.prisma.page.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        slug: softSlug,
        updatedBy: actorId,
      },
    });

    await this.activityLogsService.log({
      userId: actorId,
      action: 'DELETE_PAGE',
      resource: 'Page',
      resourceId: page.id,
      metadata: {
        id: page.id,
        title: existing.title,
        slug: existing.slug,
        status: existing.status,
        deletedSlug: softSlug,
      },
    });

    return { id: page.id };
  }

  private async assertSlugAvailable(slug: string, excludeId?: string) {
    const conflict = await this.prisma.page.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (conflict) {
      throw new ConflictException('A page with this slug already exists.');
    }
  }

  private rethrowSlugConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('A page with this slug already exists.');
    }
  }
}
