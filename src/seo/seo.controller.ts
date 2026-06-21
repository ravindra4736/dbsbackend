import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { SeoService } from './seo.service';

@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get()
  findAll() {
    return this.seoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.seoService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.seoService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.seoService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.seoService.remove(id);
  }
}
