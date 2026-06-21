import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SitemapService } from './sitemap.service';
import { SitemapController } from './sitemap.controller';

@Module({
  imports: [PrismaModule],
  providers: [SitemapService],
  controllers: [SitemapController],
})
export class SitemapModule {}
