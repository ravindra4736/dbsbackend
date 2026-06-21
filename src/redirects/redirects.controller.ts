import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { RedirectsService } from './redirects.service';

@Controller('redirects')
export class RedirectsController {
  constructor(private readonly redirectsService: RedirectsService) {}

  @Get()
  findAll() {
    return this.redirectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.redirectsService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.redirectsService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.redirectsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.redirectsService.remove(id);
  }
}
