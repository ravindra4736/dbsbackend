import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivityLogsModule } from '../../activity-logs/activity-logs.module';
import { PagesService } from './pages.service';
import { PagesController } from './pages.controller';

@Module({
  imports: [PrismaModule, ActivityLogsModule],
  providers: [PagesService],
  controllers: [PagesController],
  exports: [PagesService],
})
export class PagesModule {}
