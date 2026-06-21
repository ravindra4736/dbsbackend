import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RobotsService } from './robots.service';
import { RobotsController } from './robots.controller';

@Module({
  imports: [PrismaModule],
  providers: [RobotsService],
  controllers: [RobotsController],
})
export class RobotsModule {}
