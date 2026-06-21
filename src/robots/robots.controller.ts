import { Controller, Get, Post, Body } from '@nestjs/common';
import { RobotsService } from './robots.service';

@Controller('robots')
export class RobotsController {
  constructor(private readonly robotsService: RobotsService) {}

  @Get()
  async get() {
    const content = await this.robotsService.getRobotsTxt();
    return {
      message: 'Robots.txt fetched successfully',
      data: { content },
    };
  }

  @Post()
  async update(@Body('content') content: string) {
    return this.robotsService.upsert(content);
  }
}
