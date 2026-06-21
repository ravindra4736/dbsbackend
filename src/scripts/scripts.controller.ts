import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ScriptsService } from './scripts.service';

@Controller('scripts')
export class ScriptsController {
  constructor(private readonly scriptsService: ScriptsService) {}

  @Post()
  create(@Body() body: any) {
    return this.scriptsService.create(body);
  }

  @Get()
  findAll(@Query('location') location?: string) {
    if (location) {
      return this.scriptsService.findByLocation(location);
    }
    return this.scriptsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scriptsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; code: string; enabled: boolean; priority: number }>,
  ) {
    return this.scriptsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scriptsService.remove(id);
  }
}
