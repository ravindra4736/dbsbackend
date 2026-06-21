import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.media.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.media.findUnique({ where: { id } });
  }

  create(data: {
    filename: string;
    path: string;
    url: string;
    type: string;
    mimeType: string;
    size: number;
    folder?: string;
    width?: number;
    height?: number;
    metadata?: unknown;
    uploadedById: string;
  }) {
    return this.prisma.media.create({ data: data as any });
  }

  update(id: string, data: Partial<{
    filename: string;
    path: string;
    url: string;
    folder: string;
    enabled: boolean;
    type: string;
    mimeType: string;
    size: number;
    width: number;
    height: number;
    metadata: unknown;
  }>) {
    return this.prisma.media.update({ where: { id }, data: data as any });
  }

  remove(id: string) {
    return this.prisma.media.delete({ where: { id } });
  }
}
