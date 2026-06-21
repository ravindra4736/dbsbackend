import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ScriptsService } from './scripts.service';
import { ScriptsController } from './scripts.controller';

@Module({
  imports: [PrismaModule],
  providers: [ScriptsService],
  controllers: [ScriptsController],
  exports: [ScriptsService],
})
export class ScriptsModule {}