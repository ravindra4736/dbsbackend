import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SeoService } from './seo.service';
import { SeoController } from './seo.controller';

@Module({
  imports: [PrismaModule],
  providers: [SeoService],
  controllers: [SeoController],
  exports: [SeoService],
})
export class SeoModule {}
